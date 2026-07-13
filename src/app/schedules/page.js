"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function SchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [taskId, setTaskId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from("schedules")
      .select("*, tasks(title)")
      .order("start_time", { ascending: true });

    if (error) console.error(error);
    else setSchedules(data || []);
    setLoading(false);
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .is("archived_at", null);
    setTasks(data || []);
  };

  useEffect(() => {
    if (user) {
      fetchSchedules();
      fetchTasks();
    }
  }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    // new Date("YYYY-MM-DDTHH:mm:ss") không có "Z" sẽ được browser hiểu
    // là giờ LOCAL của máy (VN) -> .toISOString() convert đúng sang UTC để lưu.
    const startUtc = new Date(`${selectedDate}T${startTime}:00`).toISOString();
    const endUtc = new Date(`${selectedDate}T${endTime}:00`).toISOString();

    const { error } = await supabase.from("schedules").insert({
      user_id: user.id,
      title: title.trim(),
      start_time: startUtc,
      end_time: endUtc,
      task_id: taskId || null,
    });

    if (error) console.error(error);
    else {
      setTitle("");
      setStartTime("");
      setEndTime("");
      setTaskId("");
      fetchSchedules();
    }
  };

  // Helper: lấy ngày local dạng YYYY-MM-DD, không bị lệch sang UTC
  const toLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Lọc các schedule thuộc đúng ngày đang chọn
  const schedulesForSelectedDate = schedules.filter((s) => {
    return toLocalDateString(s.start_time) === selectedDate;
  });

  const handleDelete = async (id) => {
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) console.error(error);
    else fetchSchedules();
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1>Lịch</h1>

      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      <form
        onSubmit={handleAdd}
        style={{ marginBottom: 24, display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <input
          type="text"
          placeholder="Tên sự kiện..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">-- Không gắn task --</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <button type="submit">Thêm</button>
      </form>

      <h2>Sự kiện ngày {selectedDate}</h2>
      {schedulesForSelectedDate.length === 0 && <p>Không có sự kiện nào.</p>}
      {schedulesForSelectedDate.map((s) => {
        const start = new Date(s.start_time).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const end = new Date(s.end_time).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>
              <strong>
                {start} - {end}
              </strong>{" "}
              · {s.title}
              {s.tasks?.title && (
                <small style={{ color: "#888" }}>
                  {" "}
                  (task: {s.tasks.title})
                </small>
              )}
            </span>
            <button onClick={() => handleDelete(s.id)}>Xoá</button>
          </div>
        );
      })}
    </div>
  );
}
