"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Folder, Trash2, Plus, Inbox } from "lucide-react";

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

  if (loading) {
    return <CategoriesSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Folder className="h-6 w-6 text-primary" />
            Categories
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Organize your tasks into projects, areas or folders
          </p>
        </div>
        <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/10">
          Total: {categories.length}
        </span>
      </div>

      {/* FORM THÊM CATEGORY */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">New Category</h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Category Name</label>
            <input
              type="text"
              placeholder="e.g. Work, Personal, Education..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/30"
              required
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 shrink-0">
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-xs font-semibold text-slate-500">Color</label>
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
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </form>
      </div>

      {/* DANH SÁCH CATEGORIES */}
      <div>
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
            <Inbox className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">No categories yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Create categories to group related tasks together.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className="group bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between hover:border-slate-200 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/5 shrink-0 shadow-inner"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-sm font-semibold text-slate-700 truncate">
                    {c.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0"
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0" />
            <div className="h-4 w-2/3 bg-slate-200 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
