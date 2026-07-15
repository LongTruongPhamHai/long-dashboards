// src\app\schedules\page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Calendar,
  Trash2,
  Plus,
  Clock,
  CheckSquare,
  CalendarOff,
  Pencil,
  X,
  ArrowUpDown,
  Search,
} from "lucide-react";

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
  const [editingId, setEditingId] = useState(null); // 👈 mới
  const [sortDir, setSortDir] = useState("asc"); // 👈 mới
  const [searchQuery, setSearchQuery] = useState(""); // 👈 mới

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from("schedules")
      .select("*, tasks(title)")
      .is("deleted_at", null)
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

  // Helper: lấy ngày local dạng YYYY-MM-DD, không bị lệch sang UTC
  const toLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toLocalTimeString = (date) => {
    const d = new Date(date);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setStartTime("");
    setEndTime("");
    setTaskId("");
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setTitle(s.title);
    setTaskId(s.task_id || "");
    setStartTime(toLocalTimeString(s.start_time));
    setEndTime(toLocalTimeString(s.end_time));
    setSelectedDate(toLocalDateString(s.start_time)); // nhảy sang đúng ngày của event
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    // new Date("YYYY-MM-DDTHH:mm:ss") không có "Z" sẽ được browser hiểu
    // là giờ LOCAL của máy (VN) -> .toISOString() convert đúng sang UTC để lưu.
    const startUtc = new Date(`${selectedDate}T${startTime}:00`).toISOString();
    const endUtc = new Date(`${selectedDate}T${endTime}:00`).toISOString();

    if (editingId) {
      const { error } = await supabase
        .from("schedules")
        .update({
          title: title.trim(),
          start_time: startUtc,
          end_time: endUtc,
          task_id: taskId || null,
        })
        .eq("id", editingId);

      if (error) console.error(error);
      else {
        resetForm();
        fetchSchedules();
      }
    } else {
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
    }
  };

  // Lọc các schedule thuộc đúng ngày đang chọn
  const schedulesForSelectedDate = schedules.filter((s) => {
    return toLocalDateString(s.start_time) === selectedDate;
  });

  // Lọc theo tên sự kiện hoặc tên task liên kết, không phân biệt hoa/thường
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSchedules = schedulesForSelectedDate.filter((s) => {
    if (!normalizedQuery) return true;
    if (s.title.toLowerCase().includes(normalizedQuery)) return true;
    return s.tasks?.title?.toLowerCase().includes(normalizedQuery);
  });

  // Sắp xếp theo giờ bắt đầu, chiều tăng/giảm theo lựa chọn sort
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    const diff = new Date(a.start_time) - new Date(b.start_time);
    return sortDir === "asc" ? diff : -diff;
  });

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("schedules")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error(error);
    else {
      if (editingId === id) resetForm();
      fetchSchedules();
    }
  };

  if (loading) {
    return <SchedulesSkeleton />;
  }

  // Format ngày để hiển thị tiêu đề đẹp
  const selectedDateFormatted = new Date(selectedDate).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Schedule
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Manage your daily appointments and personal work schedules
          </p>
        </div>

        {/* BỘ CHỌN NGÀY */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-xs">
          <span className="text-xs font-bold text-muted-foreground/70 uppercase shrink-0">
            Select Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-bold text-foreground/70 focus:outline-hidden bg-transparent cursor-pointer"
          />
        </div>
      </div>

      {/* FORM THÊM/SỬA SỰ KIỆN */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            {editingId ? "Edit Event" : "New Event"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Event Name
              </label>
              <input
                type="text"
                placeholder="Enter meeting, event, appointment name..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-muted/20"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Link to Task (Optional)
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- No Task Link --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground/70 focus:outline-hidden bg-muted/20"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground/70 focus:outline-hidden bg-muted/20"
                  required
                />
              </div>
            </div>

            <div className="col-span-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-lg transition-all shadow-xs"
              >
                {editingId ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    Update Event
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Event
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* TIMELINE VIEW CHO NGÀY ĐANG CHỌN */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span>Schedule for:</span>
            <span className="text-primary font-bold">
              {selectedDateFormatted}
            </span>
          </h2>

          {schedulesForSelectedDate.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground/70 placeholder:text-muted-foreground/60 placeholder:font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card w-40 sm:w-48"
                />
              </div>
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
                className="text-xs font-semibold text-foreground/70 bg-card border border-border rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="asc">Earliest first</option>
                <option value="desc">Latest first</option>
              </select>
            </div>
          )}
        </div>

        {schedulesForSelectedDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/30 border border-dashed border-border rounded-2xl text-center">
            <CalendarOff className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-foreground/70">No events</p>
            <p className="text-xs text-muted-foreground mt-1">
              No events scheduled for this day. Enjoy your free time or add a
              new event!
            </p>
          </div>
        ) : sortedSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/30 border border-dashed border-border rounded-2xl text-center">
            <Search className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-foreground/70">
              No events match &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-border pl-6 ml-3 py-2 space-y-6">
            {sortedSchedules.map((s) => {
              const start = new Date(s.start_time).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const end = new Date(s.end_time).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={s.id} className="relative group">
                  {/* Dot trên dòng timeline */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-card bg-primary shadow-xs" />

                  <div
                    className={`bg-card border rounded-xl p-4 flex items-start sm:items-center justify-between gap-4 hover:border-border hover:shadow-xs transition-all ${
                      editingId === s.id
                        ? "border-primary/40 ring-2 ring-primary/10"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10">
                          {start} - {end}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground leading-snug break-words">
                        {s.title}
                      </h4>

                      {/* Task Link */}
                      {s.tasks?.title && (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded leading-none max-w-[200px] truncate">
                            <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                            {s.tasks.title}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEdit(s)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                        title="Edit event"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SchedulesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl">
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted/50 rounded-md mt-2" />
        </div>
        <div className="h-10 w-44 bg-muted/50 rounded-lg" />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="h-5 w-24 bg-muted rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 h-10 bg-muted/50 rounded-lg" />
          <div className="h-10 bg-muted/50 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-10 bg-muted/50 rounded-lg" />
          <div className="h-10 bg-muted/50 rounded-lg" />
          <div className="col-span-2 h-10 bg-muted rounded-lg" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="h-5 w-56 bg-muted rounded-md" />
        <div className="border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="relative space-y-2">
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-muted" />
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="h-5 w-20 bg-muted/50 rounded-full" />
                <div className="h-4 w-1/3 bg-muted rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
