// src\app\notes\page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  Trash2,
  Plus,
  Inbox,
  CheckSquare,
  Target,
  Calendar,
  Pencil,
  X,
  ArrowUpDown,
  Search,
} from "lucide-react";

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [linkType, setLinkType] = useState("");
  const [linkId, setLinkId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // 👈 mới
  const [sortBy, setSortBy] = useState("created_desc"); // 👈 mới
  const [searchQuery, setSearchQuery] = useState(""); // 👈 mới

  const fetchNotes = async () => {
    // Lấy note kèm note_links để biết note nào gắn với task/goal nào
    const { data, error } = await supabase
      .from("notes")
      .select("*, note_links(related_type, related_id)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const fetchLinkables = async () => {
    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, title")
      .is("archived_at", null);
    const { data: goalData } = await supabase
      .from("goals")
      .select("id, title")
      .is("archived_at", null);
    setTasks(taskData || []);
    setGoals(goalData || []);
  };

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchLinkables();
    }
  }, [user]);

  const resetForm = () => {
    setEditingId(null);
    setContent("");
    setLinkType("");
    setLinkId("");
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setContent(note.content);
    const link = note.note_links?.[0];
    if (link) {
      setLinkType(link.related_type);
      setLinkId(link.related_id);
    } else {
      setLinkType("");
      setLinkId("");
    }
  };

  const applyLink = async (noteId) => {
    // Xóa link cũ rồi gắn lại link mới (nếu có) — đơn giản & an toàn
    const { error: delErr } = await supabase
      .from("note_links")
      .delete()
      .eq("note_id", noteId);
    if (delErr) console.error(delErr);

    if (linkType && linkId) {
      const { error: linkError } = await supabase.from("note_links").insert({
        note_id: noteId,
        related_type: linkType,
        related_id: linkId,
      });
      if (linkError) console.error(linkError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from("notes")
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        console.error(error);
        return;
      }

      await applyLink(editingId);
      resetForm();
      fetchNotes();
    } else {
      const { data: newNote, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          note_type: "note",
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        return;
      }

      if (linkType && linkId) {
        const { error: linkError } = await supabase.from("note_links").insert({
          note_id: newNote.id,
          related_type: linkType,
          related_id: linkId,
        });
        if (linkError) console.error(linkError);
      }

      setContent("");
      setLinkType("");
      setLinkId("");
      fetchNotes();
    }
  };

  const handleDelete = async (noteId) => {
    const { error } = await supabase
      .from("notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", noteId);
    if (error) console.error(error);
    else {
      if (editingId === noteId) resetForm();
      fetchNotes();
    }
  };

  // Tìm tên hiển thị của item được liên kết (task hoặc goal)
  const getLinkedLabel = (link) => {
    if (link.related_type === "task") {
      return tasks.find((t) => t.id === link.related_id)?.title;
    }
    if (link.related_type === "goal") {
      return goals.find((g) => g.id === link.related_id)?.title;
    }
    return null;
  };

  // Lọc theo nội dung note hoặc tên task/goal đã liên kết, không phân biệt hoa/thường
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredNotes = notes.filter((note) => {
    if (!normalizedQuery) return true;
    if (note.content.toLowerCase().includes(normalizedQuery)) return true;
    return (note.note_links || []).some((link) => {
      const label = getLinkedLabel(link);
      return label && label.toLowerCase().includes(normalizedQuery);
    });
  });

  // Sắp xếp danh sách hiển thị theo lựa chọn sort, không đổi state gốc
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case "created_asc":
        return new Date(a.created_at) - new Date(b.created_at);
      case "updated_desc":
        return (
          new Date(b.updated_at || b.created_at) -
          new Date(a.updated_at || a.created_at)
        );
      default: // created_desc
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  if (loading) {
    return <NotesSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Notes
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Capture thoughts, store simple wikis, and link them to tasks or
            goals
          </p>
        </div>
        <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/10">
          Total: {notes.length}
        </span>
      </div>

      {/* FORM THÊM/SỬA NOTE */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {editingId ? "Edit Note" : "New Note"}
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
          <textarea
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/30 resize-y"
            required
          />

          <div className="flex flex-col md:flex-row gap-3 items-end md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* LINK TYPE */}
              <div className="flex flex-col gap-1 w-full sm:w-44">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Link to
                </label>
                <select
                  value={linkType}
                  onChange={(e) => {
                    setLinkType(e.target.value);
                    setLinkId("");
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-hidden"
                >
                  <option value="">-- No Link --</option>
                  <option value="task">Link to Task</option>
                  <option value="goal">Link to Goal</option>
                </select>
              </div>

              {/* LINK ID FOR TASK */}
              {linkType === "task" && (
                <div className="flex flex-col gap-1 w-full sm:w-60">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Select Task
                  </label>
                  <select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-hidden truncate"
                  >
                    <option value="">-- Select Task --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* LINK ID FOR GOAL */}
              {linkType === "goal" && (
                <div className="flex flex-col gap-1 w-full sm:w-60">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Select Goal
                  </label>
                  <select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-hidden truncate"
                  >
                    <option value="">-- Select Goal --</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-lg transition-all shadow-xs shrink-0"
            >
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Update Note
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* DANH SÁCH NOTES */}
      <div className="space-y-3">
        {notes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search notes..."
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
                <option value="created_desc">Newest first</option>
                <option value="created_asc">Oldest first</option>
                <option value="updated_desc">Recently updated</option>
              </select>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Inbox className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">No notes yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Start capturing notes, ideas or snippets!
            </p>
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Search className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">
              No notes match &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedNotes.map((note) => {
              const formattedDate = new Date(note.created_at).toLocaleString(
                "en-US",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                },
              );

              return (
                <div
                  key={note.id}
                  className={`group bg-white border rounded-xl p-5 hover:border-slate-200 hover:shadow-xs transition-all flex flex-col justify-between gap-4 ${
                    editingId === note.id
                      ? "border-primary/40 ring-2 ring-primary/10"
                      : "border-slate-100"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </p>

                  <div className="border-t border-slate-50 pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formattedDate}
                      </span>

                      {/* Note Links */}
                      {note.note_links?.map((link, i) => {
                        const isTask = link.related_type === "task";
                        const label = getLinkedLabel(link);
                        if (!label) return null;

                        return (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                              isTask
                                ? "bg-blue-50 text-blue-600"
                                : "bg-amber-50 text-amber-600"
                            } max-w-[150px] truncate`}
                            title={`${isTask ? "Task" : "Goal"}: ${label}`}
                          >
                            {isTask ? (
                              <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <Target className="h-2.5 w-2.5 shrink-0" />
                            )}
                            {label}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                        title="Edit note"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete note"
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

function NotesSkeleton() {
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
        <div className="h-24 bg-slate-100 rounded-lg" />
        <div className="flex justify-between items-center">
          <div className="h-8 w-40 bg-slate-100 rounded-lg" />
          <div className="h-8 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-100 rounded-xl p-5 space-y-4"
          >
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-200 rounded-md" />
              <div className="h-4 w-5/6 bg-slate-200 rounded-md" />
            </div>
            <div className="border-t border-slate-50 pt-3 flex justify-between items-center">
              <div className="h-3.5 w-24 bg-slate-100 rounded-md" />
              <div className="h-5 w-5 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
