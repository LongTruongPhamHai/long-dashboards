// src\app\tasks\page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  CheckSquare,
  Square,
  Trash2,
  Calendar,
  Target,
  Folder,
  Plus,
  Inbox,
  Pencil,
  X,
  ArrowUpDown,
  Search,
} from "lucide-react";

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

  const [editingId, setEditingId] = useState(null); // 👈 mới
  const [sortBy, setSortBy] = useState("created_desc"); // 👈 mới
  const [searchQuery, setSearchQuery] = useState(""); // 👈 mới

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
    const { data } = await supabase
      .from("categories")
      .select("id, name, color");
    setCategories(data || []);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from("tags").select("id, name, color");
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

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setGoalId("");
    setCategoryId("");
    setDueDate("");
    setSelectedTagIds([]);
  };

  const startEdit = async (task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setGoalId(task.goal_id || "");
    setCategoryId(task.category_id || "");
    setDueDate(task.due_date || "");

    // Lấy các tag hiện tại của task để tick sẵn
    const { data: taggableRows, error } = await supabase
      .from("taggables")
      .select("tag_id")
      .eq("taggable_type", "task")
      .eq("taggable_id", task.id);

    if (error) console.error(error);
    setSelectedTagIds((taggableRows || []).map((r) => r.tag_id));
  };

  const syncTaskTags = async (taskId) => {
    const { error: delErr } = await supabase
      .from("taggables")
      .delete()
      .eq("taggable_type", "task")
      .eq("taggable_id", taskId);
    if (delErr) console.error(delErr);

    if (selectedTagIds.length > 0) {
      const rows = selectedTagIds.map((tagId) => ({
        tag_id: tagId,
        taggable_type: "task",
        taggable_id: taskId,
      }));
      const { error: tagError } = await supabase.from("taggables").insert(rows);
      if (tagError) console.error(tagError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: title.trim(),
          goal_id: goalId || null,
          category_id: categoryId || null,
          due_date: dueDate || null,
        })
        .eq("id", editingId);

      if (error) {
        console.error(error);
        return;
      }

      await syncTaskTags(editingId);
      resetForm();
      fetchTasks();
    } else {
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
        const { error: tagError } = await supabase
          .from("taggables")
          .insert(rows);
        if (tagError) console.error(tagError);
      }

      resetForm();
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
      if (editingId === taskId) resetForm();
      fetchTasks();
    }
  };

  const toggleTagSelection = (tagId) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  // Lọc theo tiêu đề task, tên goal hoặc category liên kết, không phân biệt hoa/thường
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    if (!normalizedQuery) return true;
    if (task.title.toLowerCase().includes(normalizedQuery)) return true;
    if (task.goals?.title?.toLowerCase().includes(normalizedQuery)) return true;
    const matchedCategory = categories.find((c) => c.id === task.category_id);
    return matchedCategory?.name?.toLowerCase().includes(normalizedQuery);
  });

  // Sắp xếp danh sách hiển thị theo lựa chọn sort, không đổi state gốc.
  // Task không có due_date luôn được xếp xuống cuối khi sort theo hạn chót.
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "due_asc": {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      case "due_desc": {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return b.due_date.localeCompare(a.due_date);
      }
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "status":
        return (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0);
      default: // created_desc
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  if (loading) {
    return <TasksSkeleton />;
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            Tasks List
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Manage, organize and track your daily tasks
          </p>
        </div>
        <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/10">
          Total: {tasks.length}
        </span>
      </div>

      {/* FORM THÊM/SỬA TASK */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {editingId ? "Edit Task" : "New Task"}
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
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/30"
              required
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/30 md:w-48"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GOAL SELECT */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Linked Goal
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- No Goal --</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            {/* CATEGORY SELECT */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- Uncategorized --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TAGS MULTI-SELECT (RENDER DẠNG BADGES ĐỂ CHỌN NHANH) */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
              <label className="text-xs font-semibold text-slate-500">
                Select Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const isSelected = selectedTagIds.includes(t.id);
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => toggleTagSelection(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50/80"
                      }`}
                      style={{
                        borderColor: isSelected ? undefined : t.color,
                        color: isSelected ? undefined : t.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: isSelected ? "#fff" : t.color,
                        }}
                      />
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-lg transition-all shadow-xs"
            >
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Update Task
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* DANH SÁCH TASKS */}
      <div className="space-y-4">
        {tasks.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tasks..."
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
                <option value="created_desc">Newest created</option>
                <option value="due_asc">Due date (soonest)</option>
                <option value="due_desc">Due date (latest)</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="status">Status (incomplete first)</option>
              </select>
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Inbox className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">Inbox is empty</p>
            <p className="text-xs text-slate-400 mt-1">
              No tasks yet. Create your first task using the form above!
            </p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Search className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">
              No tasks match &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden shadow-xs">
            {sortedTasks.map((task) => {
              const isCompleted = task.status === "done";
              const isOverdue =
                task.due_date && task.due_date < todayStr && !isCompleted;
              const isDueToday =
                task.due_date && task.due_date === todayStr && !isCompleted;
              const matchedCategory = categories.find(
                (c) => c.id === task.category_id,
              );

              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors group ${
                    editingId === task.id ? "bg-primary/5" : ""
                  }`}
                >
                  {/* CHECKBOX */}
                  <button
                    onClick={() => toggleStatus(task)}
                    className={`mt-0.5 shrink-0 transition-colors ${
                      isCompleted
                        ? "text-primary"
                        : "text-slate-300 hover:text-primary"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>

                  {/* INFO */}
                  <div className="flex-1 min-w-0">
                    <span
                      onClick={() => toggleStatus(task)}
                      className={`text-sm font-semibold leading-normal break-words cursor-pointer transition-all ${
                        isCompleted
                          ? "line-through text-slate-400 font-medium"
                          : "text-slate-800"
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* METADATA BADGES */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Due Date */}
                      {task.due_date && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${
                            isCompleted
                              ? "bg-slate-100 text-slate-400"
                              : isOverdue
                                ? "bg-rose-50 text-rose-600"
                                : isDueToday
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          Due: {task.due_date}
                        </span>
                      )}

                      {/* Goal Link */}
                      {task.goals?.title && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded leading-none max-w-[150px] truncate">
                          <Target className="h-3 w-3 text-slate-400 shrink-0" />
                          {task.goals.title}
                        </span>
                      )}

                      {/* Category Link */}
                      {matchedCategory && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded leading-none">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: matchedCategory.color }}
                          />
                          {matchedCategory.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 active:opacity-100 transition-all shrink-0">
                    <button
                      onClick={() => startEdit(task)}
                      className="p-1 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                      title="Edit task"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => softDelete(task.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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

function TasksSkeleton() {
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
        <div className="h-10 bg-slate-100 rounded-lg" />
        <div className="h-16 bg-slate-50 rounded-lg" />
      </div>

      <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-5 w-5 bg-slate-200 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
              <div className="h-3 w-1/4 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
