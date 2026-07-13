"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [todaySchedules, setTodaySchedules] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    const today = new Date().toISOString().split("T")[0];

    const { data: overdue } = await supabase
      .from("tasks")
      .select("*, goals(title)")
      .is("archived_at", null)
      .neq("status", "done")
      .lt("due_date", today)
      .order("due_date", { ascending: true });

    const { data: dueToday } = await supabase
      .from("tasks")
      .select("*, goals(title)")
      .is("archived_at", null)
      .neq("status", "done")
      .eq("due_date", today);

    // trong fetchDashboardData, thêm:
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: schedules } = await supabase
      .from("schedules")
      .select("*")
      .gte("start_time", `${today}T00:00:00`)
      .lt("start_time", `${tomorrowStr}T00:00:00`)
      .order("start_time", { ascending: true });

    setOverdueTasks(overdue || []);
    setTodayTasks(dueToday || []);
    setDataLoading(false);
    setTodaySchedules(schedules || []);
  };

  const toggleStatus = async (task) => {
    await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading || dataLoading) return <p>Đang tải...</p>;
  if (!user) return null;

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>Xin chào, {user.email}</p>
        <button onClick={handleLogout}>Đăng xuất</button>
      </div>

      <nav style={{ marginBottom: 24 }}>
        <Link href="/tasks">Tất cả task</Link>
        {" | "}
        <Link href="/goals">Mục tiêu</Link>
        {" | "}
        <Link href="/notes">Ghi chú</Link>
        {" | "}
        <Link href="/categories">Categories</Link>
        {" | "}
        <Link href="/tags">Tags</Link>
        {" | "}
        <Link href="/schedules">Lịch</Link>
      </nav>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: "crimson" }}>Quá hạn ({overdueTasks.length})</h2>
        {overdueTasks.length === 0 && <p>Không có task quá hạn.</p>}
        {overdueTasks.map((task) => (
          <div
            key={task.id}
            style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
          >
            <span
              onClick={() => toggleStatus(task)}
              style={{ cursor: "pointer" }}
            >
              {task.title}
            </span>
            <small style={{ marginLeft: 8, color: "#888" }}>
              Hạn: {task.due_date}{" "}
              {task.goals?.title ? `· ${task.goals.title}` : ""}
            </small>
          </div>
        ))}
      </section>

      <section>
        <h2>Hôm nay ({todayTasks.length})</h2>
        {todayTasks.length === 0 && <p>Không có task nào hôm nay.</p>}
        {todayTasks.map((task) => (
          <div
            key={task.id}
            style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
          >
            <span
              onClick={() => toggleStatus(task)}
              style={{ cursor: "pointer" }}
            >
              {task.title}
            </span>
            <small style={{ marginLeft: 8, color: "#888" }}>
              {task.goals?.title ? `· ${task.goals.title}` : ""}
            </small>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Lịch hôm nay</h2>
        {todaySchedules.length === 0 && <p>Không có sự kiện nào.</p>}
        {todaySchedules.map((s) => (
          <div key={s.id} style={{ padding: "6px 0" }}>
            {new Date(s.start_time).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {s.title}
          </div>
        ))}
      </section>
    </div>
  );
}
