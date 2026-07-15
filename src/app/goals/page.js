// src\app\goals\page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Target,
  Trash2,
  Plus,
  Inbox,
  Milestone,
  Pencil,
  X,
  ArrowUpDown,
  Search,
} from "lucide-react";

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [parentGoalId, setParentGoalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [taskCounts, setTaskCounts] = useState({});
  const [editingId, setEditingId] = useState(null); // 👈 mới
  const [sortBy, setSortBy] = useState("created_asc"); // 👈 mới
  const [searchQuery, setSearchQuery] = useState(""); // 👈 mới

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

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setParentGoalId("");
  };

  const startEdit = (goal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setParentGoalId(goal.parent_goal_id || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingId) {
      // Không cho chọn chính nó làm parent của chính nó
      const newParent =
        parentGoalId && parentGoalId !== editingId ? parentGoalId : null;

      const { error } = await supabase
        .from("goals")
        .update({
          title: title.trim(),
          parent_goal_id: newParent,
        })
        .eq("id", editingId);

      if (error) {
        console.error(error);
      } else {
        resetForm();
        fetchGoals();
      }
    } else {
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
      if (editingId === goalId) resetForm();
      fetchGoals();
    }
  };

  // Tính % tiến độ của 1 goal dựa trên taskCounts, dùng để sort theo progress
  const getProgressPercent = (goalId) => {
    const c = taskCounts[goalId];
    return c && c.total > 0 ? c.done / c.total : 0;
  };

  // Sắp xếp 1 danh sách goal theo lựa chọn sort hiện tại (dùng chung cho cả root và children)
  const sortGoalsList = (list) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "created_desc":
          return new Date(b.created_at) - new Date(a.created_at);
        case "progress_desc":
          return getProgressPercent(b.id) - getProgressPercent(a.id);
        default: // created_asc
          return new Date(a.created_at) - new Date(b.created_at);
      }
    });
    return sorted;
  };

  // Tìm kiếm theo tiêu đề, không phân biệt hoa/thường
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const goalMatchesSearch = (goal) =>
    goal.title.toLowerCase().includes(normalizedQuery);

  // Một goal được hiển thị nếu chính nó khớp hoặc có ít nhất 1 goal con (ở bất kỳ cấp nào) khớp,
  // để giữ nguyên ngữ cảnh phân cấp cha-con khi lọc
  const hasMatchingDescendant = (goalId) => {
    const children = goals.filter((g) => g.parent_goal_id === goalId);
    return children.some(
      (child) => goalMatchesSearch(child) || hasMatchingDescendant(child.id),
    );
  };

  const isGoalVisible = (goal) =>
    !normalizedQuery ||
    goalMatchesSearch(goal) ||
    hasMatchingDescendant(goal.id);

  // Dựng cây phân cấp: goal gốc (không có parent) chứa danh sách con
  const rootGoals = sortGoalsList(
    goals.filter((g) => !g.parent_goal_id && isGoalVisible(g)),
  );
  const getChildren = (parentId) =>
    sortGoalsList(
      goals.filter((g) => g.parent_goal_id === parentId && isGoalVisible(g)),
    );

  const renderGoal = (goal, depth = 0) => {
    const c = taskCounts[goal.id];
    const percent = c && c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
    const hasChildren = getChildren(goal.id).length > 0;

    return (
      <div
        key={goal.id}
        className="space-y-3"
        style={{
          paddingLeft: depth > 0 ? `${Math.min(depth * 1.5, 6)}rem` : "0",
        }}
      >
        <div
          className={`group relative bg-white border rounded-xl p-4 hover:border-slate-200 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            editingId === goal.id
              ? "border-primary/40 ring-2 ring-primary/10"
              : "border-slate-100"
          }`}
        >
          {/* Nhánh nối (nếu là con) */}
          {depth > 0 && (
            <div className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-slate-200" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/5 text-primary">
                <Milestone className="h-4 w-4 shrink-0" />
              </span>
              <h3 className="font-semibold text-slate-800 text-sm md:text-base leading-snug truncate">
                {goal.title}
              </h3>
            </div>

            {/* PROGRESS BAR */}
            <div className="mt-3 max-w-md">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
                <span>Progress</span>
                <span
                  className={
                    percent === 100
                      ? "text-emerald-600 font-bold"
                      : "text-primary"
                  }
                >
                  {percent}% ({c?.done || 0}/{c?.total || 0} tasks)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percent === 100 ? "bg-emerald-500" : "bg-primary"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
            <button
              onClick={() => startEdit(goal)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
              title="Edit goal"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => softDelete(goal.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
              title="Delete goal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Render con */}
        {hasChildren && (
          <div className="space-y-3 relative border-l border-slate-100 md:pl-2 ml-4 md:ml-0 mt-3">
            {getChildren(goal.id).map((child) => renderGoal(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <GoalsSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Goals
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Set long-term milestones and track your tasks completion progress
          </p>
        </div>
        <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/10">
          Total: {goals.length}
        </span>
      </div>

      {/* FORM THÊM/SỬA GOAL */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {editingId ? "Edit Goal" : "New Goal"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Goal Title
              </label>
              <input
                type="text"
                placeholder="Enter goal name..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/30"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Parent Goal (Optional)
              </label>
              <select
                value={parentGoalId}
                onChange={(e) => setParentGoalId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- No Parent Goal --</option>
                {goals
                  .filter((g) => g.id !== editingId)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-lg transition-all shadow-xs"
            >
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Update Goal
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Goal
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* DANH SÁCH GOALS CÂY PHÂN CẤP */}
      <div className="space-y-6">
        {goals.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 placeholder:text-slate-400 placeholder:font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="created_asc">Created (Oldest first)</option>
                <option value="created_desc">Created (Newest first)</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="progress_desc">Progress (Highest first)</option>
              </select>
            </div>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Inbox className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">No goals yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Set your first milestone to start planning effectively!
            </p>
          </div>
        ) : rootGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Search className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">
              No goals match &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rootGoals.map((goal) => renderGoal(goal))}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl">
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-64 bg-slate-100 rounded-md mt-2" />
        </div>
        <div className="h-6 w-20 bg-slate-100 rounded-full" />
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-4">
        <div className="h-5 w-24 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 h-10 bg-slate-100 rounded-lg" />
          <div className="h-10 bg-slate-100 rounded-lg" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-white border border-slate-100 rounded-xl space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-slate-200 rounded-md shrink-0" />
              <div className="h-5 w-1/3 bg-slate-200 rounded-md" />
            </div>
            <div className="max-w-md space-y-1.5">
              <div className="h-3 w-16 bg-slate-100 rounded-sm" />
              <div className="h-2 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
