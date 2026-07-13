"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [linkType, setLinkType] = useState(""); // '' | 'task' | 'goal'
  const [linkId, setLinkId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    // Lấy note kèm note_links để biết note nào gắn với task/goal nào
    const { data, error } = await supabase
      .from("notes")
      .select("*, note_links(related_type, related_id)")
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

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Bước 1: tạo note
    const { data: newNote, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, note_type: "note", content: content.trim() })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    // Bước 2: nếu có chọn liên kết, tạo dòng trong note_links
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
  };

  const handleDelete = async (noteId) => {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) console.error(error);
    else fetchNotes();
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

  if (loading) return <p>Đang tải...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1>Ghi chú</h1>

      <form onSubmit={handleAddNote} style={{ marginBottom: 24 }}>
        <textarea
          placeholder="Viết ghi chú..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          style={{ width: "100%", marginBottom: 8 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={linkType}
            onChange={(e) => {
              setLinkType(e.target.value);
              setLinkId("");
            }}
          >
            <option value="">-- Không liên kết --</option>
            <option value="task">Liên kết Task</option>
            <option value="goal">Liên kết Goal</option>
          </select>

          {linkType === "task" && (
            <select value={linkId} onChange={(e) => setLinkId(e.target.value)}>
              <option value="">-- Chọn task --</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          {linkType === "goal" && (
            <select value={linkId} onChange={(e) => setLinkId(e.target.value)}>
              <option value="">-- Chọn goal --</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          )}

          <button type="submit">Lưu note</button>
        </div>
      </form>

      {notes.map((note) => (
        <div
          key={note.id}
          style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}
        >
          <p style={{ margin: 0 }}>{note.content}</p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <small style={{ color: "#888" }}>
              {new Date(note.created_at).toLocaleString("vi-VN")}
              {note.note_links?.map((link, i) => (
                <span key={i}>
                  {" "}
                  · {link.related_type === "task" ? "Task" : "Goal"}:{" "}
                  {getLinkedLabel(link)}
                </span>
              ))}
            </small>
            <button onClick={() => handleDelete(note.id)}>Xoá</button>
          </div>
        </div>
      ))}

      {notes.length === 0 && <p>Chưa có ghi chú nào.</p>}
    </div>
  );
}
