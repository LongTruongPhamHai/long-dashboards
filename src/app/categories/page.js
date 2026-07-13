"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (error) console.error(error);
    else setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchCategories();
  }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: name.trim(),
      color,
    });

    if (error) console.error(error);
    else {
      setName("");
      fetchCategories();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) console.error(error);
    else fetchCategories();
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 500 }}>
      <h1>Categories</h1>

      <form
        onSubmit={handleAdd}
        style={{ marginBottom: 20, display: "flex", gap: 8 }}
      >
        <input
          type="text"
          placeholder="Tên category..."
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

      {categories.map((c) => (
        <div
          key={c.id}
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
                backgroundColor: c.color,
                marginRight: 8,
              }}
            />
            {c.name}
          </span>
          <button onClick={() => handleDelete(c.id)}>Xoá</button>
        </div>
      ))}

      {categories.length === 0 && <p>Chưa có category nào.</p>}
    </div>
  );
}
