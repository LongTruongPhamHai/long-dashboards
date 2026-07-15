// src\app\tags\page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Tag, Trash2, Plus, Inbox, Pencil, X } from "lucide-react";

export default function TagsPage() {
  const { user } = useAuth();
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // 👈 mới

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .is("deleted_at", null)
      .order("name");
    if (error) console.error(error);
    else setTags(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchTags();
  }, [user]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setColor("#22c55e");
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setName(t.name);
    setColor(t.color || "#22c55e");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from("tags")
        .update({ name: name.trim(), color })
        .eq("id", editingId);
      if (error) console.error(error);
      else {
        resetForm();
        fetchTags();
      }
    } else {
      const { error } = await supabase.from("tags").insert({
        user_id: user.id,
        name: name.trim(),
        color,
      });
      if (error) console.error(error);
      else {
        setName("");
        fetchTags();
      }
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("tags")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error(error);
    else {
      if (editingId === id) resetForm();
      fetchTags();
    }
  };

  if (loading) {
    return <TagsSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Tags
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Label tasks to organize and filter them dynamically
          </p>
        </div>
        <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/10">
          Total: {tags.length}
        </span>
      </div>

      {/* FORM THÊM/SỬA TAG */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {editingId ? "Edit Tag" : "New Tag"}
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
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 items-end sm:items-center"
        >
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Tag Name
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent, In Progress, Review..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/30"
              required
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 shrink-0">
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-xs font-semibold text-slate-500">
                Color
              </label>
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer bg-transparent scale-150"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-lg transition-all shadow-xs h-10 self-end"
            >
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* DANH SÁCH TAGS */}
      <div>
        {tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Inbox className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">No tags yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Create tags to easily prioritize or flag special task statuses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {tags.map((t) => (
              <div
                key={t.id}
                className={`group bg-white border rounded-lg px-3 py-2 flex items-center justify-between hover:border-slate-200 hover:shadow-xs transition-all ${
                  editingId === t.id
                    ? "border-primary/40 ring-2 ring-primary/10"
                    : "border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/5 shrink-0 shadow-inner"
                    style={{ backgroundColor: t.color }}
                  />
                  <span
                    className="text-xs font-bold truncate"
                    style={{ color: t.color }}
                  >
                    {t.name}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEdit(t)}
                    className="p-1 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                    title="Edit tag"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                    title="Delete tag"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TagsSkeleton() {
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 h-10 bg-slate-100 rounded-lg" />
          <div className="h-10 w-24 bg-slate-100 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
            <div className="h-3.5 w-2/3 bg-slate-200 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
