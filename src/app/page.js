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
} from "lucide-react";

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
            Manage tasks
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TASK COLUMNS */}
        <div className="lg:col-span-2 space-y-8">
          {/* OVERDUE SECTION */}
          <section className="space-y-4">
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
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50/50 transition-colors group"
                  >
                    <button
                      onClick={() => toggleStatus(task)}
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
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* TODAY SECTION */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                Today
              </h2>
              {todayTasks.length > 0 && (
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 text-xs rounded-full font-bold">
                  {todayTasks.length}
                </span>
              )}
            </div>

            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center">
                <Sparkles className="h-6 w-6 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  All clear for today
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No tasks due today. Have a productive day!
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden shadow-xs">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50/50 transition-colors group"
                  >
                    <button
                      onClick={() => toggleStatus(task)}
                      className="text-slate-300 hover:text-primary transition-colors mt-0.5 shrink-0"
                    >
                      <Square className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 leading-normal break-words">
                        {task.title}
                      </p>
                      {task.goals?.title && (
                        <div className="mt-1">
                          <span className="inline-block text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[180px]">
                            {task.goals.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SCHEDULE COLUMN */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
            Today's Schedule
          </h2>

          {todaySchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center h-[200px]">
              <CalendarDays className="h-6 w-6 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No events</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Your schedule is empty for today.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((s) => {
                const start = new Date(s.start_time).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                return (
                  <div
                    key={s.id}
                    className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs flex flex-col gap-1.5"
                  >
                    <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded self-start">
                      {start}
                    </span>
                    <p className="text-sm font-semibold text-slate-700 leading-tight">
                      {s.title}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
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
        <div className="space-y-4">
          <div className="h-6 w-32 bg-slate-200 rounded-md" />
          <div className="h-48 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
