"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // Thêm vào đầu component TasksPage, cạnh state cũ
  const [goals, setGoals] = useState([]);
  const [goalId, setGoalId] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tags, setTags] = useState([]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, goals(title)")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setTasks(data);
    }
    setLoading(false);
  };

  const fetchGoals = async () => {
    const { data } = await supabase
      .from("goals")
      .select("id, title")
      .is("archived_at", null);
    setGoals(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name");
    setCategories(data || []);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from("tags").select("id, name");
    setTags(data || []);
  };

  // Trong useEffect ban đầu, gọi thêm
  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchGoals();
      fetchCategories();
      fetchTags();
    }
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        status: "todo",
        goal_id: goalId || null,
        category_id: categoryId || null,
        due_date: dueDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (selectedTagIds.length > 0) {
      const rows = selectedTagIds.map((tagId) => ({
        tag_id: tagId,
        taggable_type: "task",
        taggable_id: newTask.id,
      }));
      const { error: tagError } = await supabase.from("taggables").insert(rows);
      if (tagError) console.error(tagError);
    }

    setTitle("");
    setGoalId("");
    setCategoryId("");
    setDueDate("");
    setSelectedTagIds([]);
    fetchTasks();
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      console.error(error);
    } else {
      fetchTasks();
    }
  };

  const softDelete = async (taskId) => {
    const { error } = await supabase
      .from("tasks")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) {
      console.error(error);
    } else {
      fetchTasks();
    }
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 500 }}>
      <h1>Danh sách task</h1>

      <form onSubmit={handleAddTask} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Nhập task mới..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">-- Không thuộc goal --</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <select
          multiple
          value={selectedTagIds}
          onChange={(e) =>
            setSelectedTagIds(
              Array.from(e.target.selectedOptions, (o) => o.value),
            )
          }
        >
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button type="submit">Thêm</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <span
              onClick={() => toggleStatus(task)}
              style={{
                textDecoration:
                  task.status === "done" ? "line-through" : "none",
                cursor: "pointer",
                flex: 1,
              }}
            >
              {task.title}
            </span>
            <button onClick={() => softDelete(task.id)}>Xoá</button>
          </li>
        ))}
      </ul>

      {tasks.length === 0 && <p>Chưa có task nào.</p>}
    </div>
  );
}
