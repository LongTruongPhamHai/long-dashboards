// src\app\trash\page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Trash2,
  RotateCcw,
  XCircle,
  Inbox,
  CheckSquare,
  Target,
  FileText,
  Folder,
  Tag,
  Calendar,
  AlertTriangle,
} from "lucide-react";

// Khai báo cấu hình cho từng loại dữ liệu có thể nằm trong Trash.
// column: tên cột đánh dấu đã xóa ("deleted_at" hoặc "archived_at" tuỳ bảng đã có sẵn)
// label: tên hiển thị chính của item trong danh sách
const TRASH_CONFIG = [
  {
    type: "tasks",
    table: "tasks",
    column: "archived_at",
    label: "Tasks",
    icon: CheckSquare,
    color: "text-blue-500 bg-blue-50",
    getTitle: (item) => item.title,
  },
  {
    type: "goals",
    table: "goals",
    column: "archived_at",
    label: "Goals",
    icon: Target,
    color: "text-amber-500 bg-amber-50",
    getTitle: (item) => item.title,
  },
  {
    type: "notes",
    table: "notes",
    column: "deleted_at",
    label: "Notes",
    icon: FileText,
    color: "text-purple-500 bg-purple-50",
    getTitle: (item) =>
      item.content?.length > 60
        ? item.content.slice(0, 60) + "..."
        : item.content,
  },
  {
    type: "categories",
    table: "categories",
    column: "deleted_at",
    label: "Categories",
    icon: Folder,
    color: "text-emerald-500 bg-emerald-50",
    getTitle: (item) => item.name,
  },
  {
    type: "tags",
    table: "tags",
    column: "deleted_at",
    label: "Tags",
    icon: Tag,
    color: "text-rose-500 bg-rose-50",
    getTitle: (item) => item.name,
  },
  {
    type: "schedules",
    table: "schedules",
    column: "deleted_at",
    label: "Schedule",
    icon: Calendar,
    color: "text-cyan-500 bg-cyan-50",
    getTitle: (item) => item.title,
  },
];

const TRASH_RETENTION_DAYS = 30;

export default function TrashPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState([]); // mảng phẳng, mỗi item có thêm field _config
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchTrash = async () => {
    setLoading(true);
    const results = await Promise.all(
      TRASH_CONFIG.map(async (cfg) => {
        const { data, error } = await supabase
          .from(cfg.table)
          .select("*")
          .not(cfg.column, "is", null)
          .order(cfg.column, { ascending: false });

        if (error) {
          console.error(`Error fetching trashed ${cfg.table}:`, error);
          return [];
        }

        return (data || []).map((item) => ({ ...item, _config: cfg }));
      }),
    );

    // Gộp tất cả loại lại thành 1 mảng, sort theo thời gian xóa mới nhất lên trên
    const flat = results
      .flat()
      .sort(
        (a, b) => new Date(b[b._config.column]) - new Date(a[a._config.column]),
      );

    setItems(flat);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchTrash();
  }, [user]);

  const handleRestore = async (item) => {
    const cfg = item._config;
    const { error } = await supabase
      .from(cfg.table)
      .update({ [cfg.column]: null })
      .eq("id", item.id);

    if (error) {
      console.error(error);
    } else {
      fetchTrash();
    }
  };

  const handlePermanentDelete = async (item) => {
    const cfg = item._config;
    const { error } = await supabase.from(cfg.table).delete().eq("id", item.id);

    if (error) {
      console.error(error);
    } else {
      setConfirmDeleteId(null);
      fetchTrash();
    }
  };

  const handleEmptyTrash = async () => {
    // Xóa vĩnh viễn toàn bộ item đang hiển thị (theo tab đang chọn)
    const targets = filteredItems;
    for (const item of targets) {
      await supabase.from(item._config.table).delete().eq("id", item.id);
    }
    setConfirmDeleteId(null);
    fetchTrash();
  };

  const getDaysLeft = (deletedAtStr) => {
    const deletedAt = new Date(deletedAtStr);
    const purgeDate = new Date(deletedAt);
    purgeDate.setDate(purgeDate.getDate() + TRASH_RETENTION_DAYS);
    const diffMs = purgeDate - new Date();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item._config.type === activeTab);

  const countByType = (type) =>
    items.filter((item) => item._config.type === type).length;

  if (loading) {
    return <TrashSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-primary" />
            Trash
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Items are kept for {TRASH_RETENTION_DAYS} days before being
            permanently deleted
          </p>
        </div>

        {filteredItems.length > 0 && (
          <button
            onClick={() => setConfirmDeleteId("EMPTY_TRASH")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all shrink-0 self-start md:self-auto"
          >
            <XCircle className="h-4 w-4" />
            Empty Trash
          </button>
        )}
      </div>

      {/* TABS LỌC THEO LOẠI */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            activeTab === "all"
              ? "bg-primary text-white border-primary"
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          All ({items.length})
        </button>
        {TRASH_CONFIG.map((cfg) => {
          const count = countByType(cfg.type);
          if (count === 0) return null;
          const Icon = cfg.icon;
          return (
            <button
              key={cfg.type}
              onClick={() => setActiveTab(cfg.type)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                activeTab === cfg.type
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3 w-3" />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* DANH SÁCH ITEM TRONG TRASH */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
          <Inbox className="h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600">Trash is empty</p>
          <p className="text-xs text-slate-400 mt-1">
            Deleted items will show up here before being permanently removed.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden shadow-xs">
          {filteredItems.map((item) => {
            const cfg = item._config;
            const Icon = cfg.icon;
            const deletedAtValue = item[cfg.column];
            const daysLeft = getDaysLeft(deletedAtValue);
            const deletedDateFormatted = new Date(
              deletedAtValue,
            ).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            return (
              <div
                key={`${cfg.type}-${item.id}`}
                className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group"
              >
                <span className={`p-2 rounded-lg shrink-0 ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {cfg.getTitle(item) || "(untitled)"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      {cfg.label.replace(/s$/, "")}
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      Deleted: {deletedDateFormatted}
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span
                      className={`text-[10px] font-bold ${
                        daysLeft <= 3 ? "text-rose-500" : "text-slate-400"
                      }`}
                    >
                      {daysLeft > 0
                        ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`
                        : "Purging soon"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRestore(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(`${cfg.type}-${item.id}`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    title="Delete forever"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>

                {/* CONFIRM XÓA VĨNH VIỄN 1 ITEM */}
                {confirmDeleteId === `${cfg.type}-${item.id}` && (
                  <ConfirmDialog
                    title="Delete permanently?"
                    message={`"${cfg.getTitle(item)}" will be permanently deleted. This action cannot be undone.`}
                    onCancel={() => setConfirmDeleteId(null)}
                    onConfirm={() => handlePermanentDelete(item)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRM EMPTY TRASH */}
      {confirmDeleteId === "EMPTY_TRASH" && (
        <ConfirmDialog
          title="Empty Trash?"
          message={`${filteredItems.length} item(s) will be permanently deleted. This action cannot be undone.`}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={handleEmptyTrash}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all"
          >
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl">
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded-md mt-2" />
        </div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 bg-slate-100 rounded-full" />
        ))}
      </div>
      <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-8 w-8 bg-slate-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-slate-200 rounded-md" />
              <div className="h-3 w-1/3 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
