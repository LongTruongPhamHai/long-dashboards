"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setTasks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      status: "todo",
    });

    if (error) {
      console.error(error);
    } else {
      setTitle("");
      fetchTasks();
    }
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
