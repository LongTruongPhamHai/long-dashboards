// src\components\layout-wrapper.js
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  FileText,
  Calendar,
  Folder,
  Tag,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

export default function LayoutWrapper({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Không hiển thị sidebar/nav nếu là trang login hoặc chưa load xong/chưa đăng nhập
  const isLoginPage = pathname === "/login";

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">
            Preparing...
          </p>
        </div>
      </div>
    );
  }

  if (isLoginPage || !user) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const menuItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/notes", label: "Notes", icon: FileText },
    { href: "/schedules", label: "Schedule", icon: Calendar },
    { href: "/categories", label: "Categories", icon: Folder },
    { href: "/tags", label: "Tags", icon: Tag },
  ];

  const mobileTabs = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/notes", label: "Notes", icon: FileText },
    { href: "/schedules", label: "Schedule", icon: Calendar },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Lấy tiêu đề trang hiện tại
  const getPageTitle = () => {
    const matched = menuItems.find((item) => item.href === pathname);
    return matched ? matched.label : "App";
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 flex font-sans antialiased">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0 shrink-0">
        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            LD
          </div>
          <span className="font-semibold text-slate-800 tracking-tight">
            Long Dashboards
          </span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/5 text-primary"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-slate-400"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout Button */}
        <div className="p-4 border-t border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 font-medium truncate">
                Account
              </p>
              <p className="text-xs text-slate-700 font-semibold truncate leading-tight">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-slate-800 text-base">
              {getPageTitle()}
            </h1>
          </div>
          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <User className="h-3.5 w-3.5" />
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 pb-20 md:pb-6 p-4 md:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* MOBILE DRAWER SIDEBAR (SLIDE OVER) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col w-72 max-w-xs bg-white h-full shadow-xl transition-transform duration-300">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
              <span className="font-semibold text-slate-800">Menu</span>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary/5 text-primary"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-400"}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
              <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 font-semibold truncate leading-tight">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-2 py-1.5 flex justify-around shadow-lg shadow-slate-200/50 backdrop-blur-md bg-white/95">
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
