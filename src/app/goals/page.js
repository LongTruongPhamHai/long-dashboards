"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [parentGoalId, setParentGoalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [taskCounts, setTaskCounts] = useState({});

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setGoals(data);
    }
    setLoading(false);
  };

  const fetchTaskCounts = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("goal_id, status")
      .is("archived_at", null);

    if (error) {
      console.error(error);
      return;
    }

    const counts = {};

    (data || []).forEach((task) => {
      if (!task.goal_id) return;

      if (!counts[task.goal_id]) {
        counts[task.goal_id] = {
          total: 0,
          done: 0,
        };
      }

      counts[task.goal_id].total++;

      if (task.status === "done") {
        counts[task.goal_id].done++;
      }
    });

    setTaskCounts(counts);
  };

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchTaskCounts();
    }
  }, [user]);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      title: title.trim(),
      parent_goal_id: parentGoalId || null,
      status: "active",
    });

    if (error) {
      console.error(error);
    } else {
      setTitle("");
      setParentGoalId("");
      fetchGoals();
    }
  };

  const softDelete = async (goalId) => {
    const { error } = await supabase
      .from("goals")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", goalId);

    if (error) {
      console.error(error);
    } else {
      fetchGoals();
    }
  };

  // Dựng cây phân cấp: goal gốc (không có parent) chứa danh sách con
  const rootGoals = goals.filter((g) => !g.parent_goal_id);
  const getChildren = (parentId) =>
    goals.filter((g) => g.parent_goal_id === parentId);

  const renderGoal = (goal, depth = 0) => {
    const c = taskCounts[goal.id];

    const percent = c && c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;

    return (
      <div key={goal.id} style={{ marginLeft: depth * 24, marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div>{goal.title}</div>
            <small>
              {percent}% ({c?.done || 0}/{c?.total || 0})
            </small>
          </div>

          <button onClick={() => softDelete(goal.id)}>Xoá</button>
        </div>

        {getChildren(goal.id).map((child) => renderGoal(child, depth + 1))}
      </div>
    );
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 500 }}>
      <h1>Mục tiêu (Goals)</h1>

      <form onSubmit={handleAddGoal} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Tên mục tiêu..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          value={parentGoalId}
          onChange={(e) => setParentGoalId(e.target.value)}
        >
          <option value="">-- Không có goal cha --</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <button type="submit">Thêm</button>
      </form>

      {rootGoals.map((goal) => renderGoal(goal))}
      {goals.length === 0 && <p>Chưa có mục tiêu nào.</p>}
    </div>
  );
}
