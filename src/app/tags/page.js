"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function TagsPage() {
  const { user } = useAuth();
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [loading, setLoading] = useState(true);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name");
    if (error) console.error(error);
    else setTags(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchTags();
  }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

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
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) console.error(error);
    else fetchTags();
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 500 }}>
      <h1>Tags</h1>

      <form
        onSubmit={handleAdd}
        style={{ marginBottom: 20, display: "flex", gap: 8 }}
      >
        <input
          type="text"
          placeholder="Tên tag..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button type="submit">Thêm</button>
      </form>

      {tags.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: t.color,
                marginRight: 8,
              }}
            />
            {t.name}
          </span>
          <button onClick={() => handleDelete(t.id)}>Xoá</button>
        </div>
      ))}

      {tags.length === 0 && <p>Chưa có tag nào.</p>}
    </div>
  );
}
