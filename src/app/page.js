// src\app\page.js
"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Square,
  ArrowRight,
  FileText,
  CheckSquare,
  Target,
  Plus,
} from "lucide-react";

// Số ngày tới được tính là "sắp đến hạn"
const UPCOMING_DAYS = 2;
// Note được coi là "vừa cập nhật gần đây" nếu trong khoảng này (ngày)
const RECENT_NOTE_DAYS = 3;

function toDateStr(d) {
  return new Date(d).toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [overdueTasks, setOverdueTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [relevantNotes, setRelevantNotes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    const todayStr = toDateStr(new Date());
    const upcomingEndStr = toDateStr(addDays(todayStr, UPCOMING_DAYS));
    const scheduleEndStr = toDateStr(addDays(todayStr, UPCOMING_DAYS + 1)); // mốc loại trừ

    // OVERDUE TASKS
    const { data: overdue } = await supabase
      .from("tasks")
      .select("*, goals(title)")
      .is("archived_at", null)
      .neq("status", "done")
      .lt("due_date", todayStr)
      .order("due_date", { ascending: true });

    // UPCOMING TASKS (hôm nay -> hôm nay + N ngày)
    const { data: upcoming } = await supabase
      .from("tasks")
      .select("*, goals(title)")
      .is("archived_at", null)
      .neq("status", "done")
      .gte("due_date", todayStr)
      .lte("due_date", upcomingEndStr)
      .order("due_date", { ascending: true });

    // UPCOMING SCHEDULES (hôm nay -> hôm nay + N ngày)
    const { data: schedules } = await supabase
      .from("schedules")
      .select("*, tasks(title)")
      .is("deleted_at", null)
      .gte("start_time", `${todayStr}T00:00:00`)
      .lt("start_time", `${scheduleEndStr}T00:00:00`)
      .order("start_time", { ascending: true });

    // NOTES + LINK LABELS
    const { data: notes } = await supabase
      .from("notes")
      .select("*, note_links(related_type, related_id)")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false, nullsFirst: false });

    const { data: taskTitles } = await supabase
      .from("tasks")
      .select("id, title")
      .is("archived_at", null);
    const { data: goalTitles } = await supabase
      .from("goals")
      .select("id, title")
      .is("archived_at", null);

    const taskMap = Object.fromEntries(
      (taskTitles || []).map((t) => [t.id, t.title]),
    );
    const goalMap = Object.fromEntries(
      (goalTitles || []).map((g) => [g.id, g.title]),
    );

    const recentCutoff = addDays(todayStr, -RECENT_NOTE_DAYS);

    const filteredNotes = (notes || [])
      .filter((n) => {
        const hasLink = n.note_links && n.note_links.length > 0;
        const isRecent = new Date(n.updated_at || n.created_at) >= recentCutoff;
        return hasLink || isRecent;
      })
      .map((n) => ({
        ...n,
        labels: (n.note_links || [])
          .map((link) => {
            const label =
              link.related_type === "task"
                ? taskMap[link.related_id]
                : goalMap[link.related_id];
            if (!label) return null;
            return { type: link.related_type, label };
          })
          .filter(Boolean),
      }))
      .slice(0, 6); // chỉ hiện tối đa 6 note để không rối dashboard

    setOverdueTasks(overdue || []);
    setUpcomingTasks(upcoming || []);
    setUpcomingSchedules(schedules || []);
    setRelevantNotes(filteredNotes);
    setDataLoading(false);
  };

  const toggleStatus = async (task) => {
    await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    fetchDashboardData();
  };

  if (loading || dataLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) return null;

  const todayString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userDisplayName = user.email ? user.email.split("@")[0] : "Guest";
  const todayStr = toDateStr(new Date());
  const tomorrowStr = toDateStr(addDays(todayStr, 1));

  const dueDateLabel = (dateStr) => {
    if (dateStr === todayStr) return "Today";
    if (dateStr === tomorrowStr) return "Tomorrow";
    return dateStr;
  };

  // Nhóm schedule theo ngày để hiển thị header ngày trong cột lịch
  const schedulesByDay = upcomingSchedules.reduce((acc, s) => {
    const day = toDateStr(s.start_time);
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  const statCards = [
    {
      label: "Overdue",
      value: overdueTasks.length,
      icon: AlertTriangle,
      tone: "rose",
    },
    {
      label: "Due Soon",
      value: upcomingTasks.length,
      icon: Clock,
      tone: "amber",
    },
    {
      label: "Upcoming Events",
      value: upcomingSchedules.length,
      icon: CalendarDays,
      tone: "primary",
    },
    {
      label: "Relevant Notes",
      value: relevantNotes.length,
      icon: FileText,
      tone: "slate",
    },
  ];

  const toneClasses = {
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    primary: "bg-primary/5 text-primary",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Welcome back, {userDisplayName}!
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {todayString}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </Link>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs"
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${toneClasses[stat.tone]}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 leading-none">
                  {stat.value}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1 truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TASK COLUMNS */}
        <div className="lg:col-span-2 space-y-8">
          {/* OVERDUE SECTION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Overdue
                </h2>
                {overdueTasks.length > 0 && (
                  <span className="bg-rose-50 text-rose-600 px-2 py-0.5 text-xs rounded-full font-bold">
                    {overdueTasks.length}
                  </span>
                )}
              </div>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-primary transition-colors shrink-0"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {overdueTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/20 border border-dashed border-emerald-100 rounded-xl text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-emerald-800">
                  No overdue tasks
                </p>
                <p className="text-xs text-emerald-600/80 mt-0.5">
                  Great job! You are all caught up.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden shadow-xs">
                {overdueTasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="flex items-start gap-3 p-4 hover:bg-slate-50/50 transition-colors group"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleStatus(task);
                      }}
                      className="text-slate-300 hover:text-primary transition-colors mt-0.5 shrink-0"
                    >
                      <Square className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 leading-normal break-words">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                          <Clock className="h-3 w-3" />
                          Due: {task.due_date}
                        </span>
                        {task.goals?.title && (
                          <span className="inline-block text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                            {task.goals.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* DUE SOON SECTION (hôm nay -> hôm nay + N ngày) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  Due Soon
                </h2>
                {upcomingTasks.length > 0 && (
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 text-xs rounded-full font-bold">
                    {upcomingTasks.length}
                  </span>
                )}
              </div>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-primary transition-colors shrink-0"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center">
                <Sparkles className="h-6 w-6 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  Nothing due soon
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No tasks due in the next {UPCOMING_DAYS} days.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden shadow-xs">
                {upcomingTasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="flex items-start gap-3 p-4 hover:bg-slate-50/50 transition-colors group"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleStatus(task);
                      }}
                      className="text-slate-300 hover:text-primary transition-colors mt-0.5 shrink-0"
                    >
                      <Square className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 leading-normal break-words">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            task.due_date === todayStr
                              ? "bg-amber-50 text-amber-600"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {dueDateLabel(task.due_date)}
                        </span>
                        {task.goals?.title && (
                          <span className="inline-block text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                            {task.goals.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SCHEDULE + NOTES COLUMN */}
        <div className="space-y-8">
          {/* UPCOMING SCHEDULE */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                Upcoming Schedule
              </h2>
              <Link
                href="/schedules"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-primary transition-colors shrink-0"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center">
                <CalendarDays className="h-6 w-6 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">No events</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nothing scheduled in the next {UPCOMING_DAYS} days.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(schedulesByDay).map(([day, items]) => (
                  <div key={day} className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      {dueDateLabel(day)}
                    </p>
                    <div className="space-y-2">
                      {items.map((s) => {
                        const start = new Date(s.start_time).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        );
                        return (
                          <Link
                            key={s.id}
                            href="/schedules"
                            className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs flex flex-col gap-1 hover:border-slate-200 hover:shadow-sm transition-all"
                          >
                            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded self-start">
                              {start}
                            </span>
                            <p className="text-sm font-semibold text-slate-700 leading-tight">
                              {s.title}
                            </p>
                            {s.tasks?.title && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded self-start max-w-[180px] truncate">
                                <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                                {s.tasks.title}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RELEVANT NOTES */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                Relevant Notes
              </h2>
              <Link
                href="/notes"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-primary transition-colors shrink-0"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {relevantNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center">
                <FileText className="h-6 w-6 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">
                  No relevant notes
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Notes linked to tasks/goals or recently updated will show
                  here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {relevantNotes.map((note) => (
                  <Link
                    key={note.id}
                    href="/notes"
                    className="block p-3 bg-white border border-slate-100 rounded-xl shadow-xs hover:border-slate-200 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium text-slate-700 leading-snug line-clamp-3 whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                    {note.labels.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {note.labels.map((l, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded max-w-[150px] truncate ${
                              l.type === "task"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {l.type === "task" ? (
                              <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <Target className="h-2.5 w-2.5 shrink-0" />
                            )}
                            {l.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="h-8 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-40 bg-slate-100 rounded-md mt-2" />
        </div>
        <div className="h-8 w-28 bg-slate-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 bg-slate-100 rounded-xl border border-slate-100"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded-md" />
            <div className="h-20 bg-slate-100 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded-md" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded-md" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded-md" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
