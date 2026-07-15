// src\app\categories\page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Folder,
  Trash2,
  Plus,
  Inbox,
  Pencil,
  X,
  ArrowUpDown,
  Search,
} from "lucide-react";

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // 👈 mới
  const [sortBy, setSortBy] = useState("name_asc"); // 👈 mới
  const [searchQuery, setSearchQuery] = useState(""); // 👈 mới

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .is("deleted_at", null)
      .order("name");
    if (error) console.error(error);
    else setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchCategories();
  }, [user]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setColor("#3b82f6");
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setName(c.name);
    setColor(c.color || "#3b82f6");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from("categories")
        .update({ name: name.trim(), color })
        .eq("id", editingId);
      if (error) console.error(error);
      else {
        resetForm();
        fetchCategories();
      }
    } else {
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
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error(error);
    else {
      if (editingId === id) resetForm();
      fetchCategories();
    }
  };

  // Lọc theo từ khóa tìm kiếm (không phân biệt hoa/thường), rồi mới sort
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  // Sắp xếp danh sách hiển thị theo lựa chọn sort, không đổi state gốc
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return sortBy === "name_desc" ? -cmp : cmp;
  });

  if (loading) {
    return <CategoriesSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Folder className="h-6 w-6 text-primary" />
            Categories
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Organize your tasks into projects, areas or folders
          </p>
        </div>
        <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/10">
          Total: {categories.length}
        </span>
      </div>

      {/* FORM THÊM/SỬA CATEGORY */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            {editingId ? "Edit Category" : "New Category"}
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
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 items-end sm:items-center"
        >
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Category Name
            </label>
            <input
              type="text"
              placeholder="e.g. Work, Personal, Education..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-muted/20"
              required
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 shrink-0">
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-xs font-semibold text-muted-foreground">
                Color
              </label>
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0">
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

      {/* DANH SÁCH CATEGORIES */}
      <div className="space-y-3">
        {categories.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground/70 placeholder:text-muted-foreground/60 placeholder:font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-semibold text-foreground/70 bg-card border border-border rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/30 border border-dashed border-border rounded-2xl text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-bold text-foreground/70">
              No categories yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create categories to group related tasks together.
            </p>
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/30 border border-dashed border-border rounded-2xl text-center">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-bold text-foreground/70">
              No categories match &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sortedCategories.map((c) => (
              <div
                key={c.id}
                className={`group bg-card border rounded-xl p-4 flex items-center justify-between hover:border-border hover:shadow-xs transition-all ${
                  editingId === c.id
                    ? "border-primary/40 ring-2 ring-primary/10"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/5 shrink-0 shadow-inner"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-sm font-semibold text-foreground/80 truncate">
                    {c.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEdit(c)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
                    title="Edit category"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete category"
                  >
                    <Trash2 className="h-4 w-4" />
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

function CategoriesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl">
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted/50 rounded-md mt-2" />
        </div>
        <div className="h-6 w-20 bg-muted/50 rounded-full" />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="h-5 w-24 bg-muted rounded-md" />
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 h-10 bg-muted/50 rounded-lg" />
          <div className="h-10 w-24 bg-muted/50 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-card border border-border rounded-xl flex items-center gap-3"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-muted shrink-0" />
            <div className="h-4 w-2/3 bg-muted rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
