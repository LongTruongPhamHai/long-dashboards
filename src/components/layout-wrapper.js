// src\components\layout-wrapper.js
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  FileText,
  Calendar,
  Folder,
  Tag,
  Trash2,
  LogOut,
  Menu,
  X,
  User,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

export default function LayoutWrapper({ children }) {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Không hiển thị sidebar/nav nếu là trang login hoặc chưa load xong/chưa đăng nhập
  const isLoginPage = pathname === "/login";

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Preparing...
          </p>
        </div>
      </div>
    );
  }

  if (isLoginPage || !user) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  const menuItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/notes", label: "Notes", icon: FileText },
    { href: "/schedules", label: "Schedule", icon: Calendar },
    { href: "/categories", label: "Categories", icon: Folder },
    { href: "/tags", label: "Tags", icon: Tag },
    { href: "/trash", label: "Trash", icon: Trash2 },
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
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased transition-colors duration-300">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0 shrink-0 transition-colors duration-300">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            LD
          </div>
          <span className="font-semibold text-foreground tracking-tight">
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
                    ? "bg-primary/10 text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/80"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Theme Selector Widget */}
        <div className="px-4 py-4 border-t border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Theme
          </p>
          
          <div className="grid grid-cols-3 gap-0.5 bg-muted/60 p-0.5 rounded-lg text-xs">
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "system", label: "System", icon: Monitor },
              { id: "dark-selector", label: "Dark", icon: Moon },
            ].map((mode) => {
              const isSelected = mode.id === "dark-selector"
                ? (theme !== "light" && theme !== "system")
                : theme === mode.id;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    if (mode.id === "dark-selector") {
                      setTheme("dark");
                    } else {
                      setTheme(mode.id);
                    }
                  }}
                  className={`flex items-center justify-center gap-1 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-card text-foreground shadow-xs border border-border/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Sub-theme circles for Dark Mode */}
          {(theme !== "light" && theme !== "system") && (
            <div className="flex items-center justify-between gap-1.5 mt-3 bg-muted/30 p-1.5 rounded-lg border border-border/40 animate-fadeIn">
              {[
                { id: "dark", color: "bg-neutral-800 border-neutral-600", label: "Default" },
                { id: "dark-blue", color: "bg-blue-900 border-blue-600", label: "Blue" },
                { id: "dark-emerald", color: "bg-emerald-900 border-emerald-600", label: "Emerald" },
                { id: "dark-purple", color: "bg-purple-900 border-purple-600", label: "Purple" },
              ].map((subTheme) => {
                const isActive = theme === subTheme.id;
                return (
                  <button
                    key={subTheme.id}
                    onClick={() => setTheme(subTheme.id)}
                    title={subTheme.label}
                    className={`h-5 w-5 rounded-full border-2 cursor-pointer transition-all ${subTheme.color} ${
                      isActive 
                        ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card" 
                        : "opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* User Info & Logout Button */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium truncate">
                Account
              </p>
              <p className="text-xs text-foreground font-semibold truncate leading-tight">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted active:bg-muted transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-foreground text-base">
              {getPageTitle()}
            </h1>
          </div>
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
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
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col w-72 max-w-xs bg-card h-full border-r border-border shadow-xl transition-transform duration-300">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <span className="font-semibold text-foreground">Menu</span>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
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
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground/80"}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Theme Selector */}
            <div className="px-4 py-4 border-t border-border/50 bg-muted/10">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Theme
              </p>
              
              <div className="grid grid-cols-3 gap-0.5 bg-muted/60 p-0.5 rounded-lg text-xs">
                {[
                  { id: "light", label: "Light", icon: Sun },
                  { id: "system", label: "System", icon: Monitor },
                  { id: "dark-selector", label: "Dark", icon: Moon },
                ].map((mode) => {
                  const isSelected = mode.id === "dark-selector"
                    ? (theme !== "light" && theme !== "system")
                    : theme === mode.id;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        if (mode.id === "dark-selector") {
                          setTheme("dark");
                        } else {
                          setTheme(mode.id);
                        }
                      }}
                      className={`flex items-center justify-center gap-1 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-card text-foreground shadow-xs border border-border/20"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              {(theme !== "light" && theme !== "system") && (
                <div className="flex items-center justify-between gap-1.5 mt-3 bg-muted/30 p-1.5 rounded-lg border border-border/40">
                  {[
                    { id: "dark", color: "bg-neutral-800 border-neutral-600", label: "Default" },
                    { id: "dark-blue", color: "bg-blue-900 border-blue-600", label: "Blue" },
                    { id: "dark-emerald", color: "bg-emerald-900 border-emerald-600", label: "Emerald" },
                    { id: "dark-purple", color: "bg-purple-900 border-purple-600", label: "Purple" },
                  ].map((subTheme) => {
                    const isActive = theme === subTheme.id;
                    return (
                      <button
                        key={subTheme.id}
                        onClick={() => setTheme(subTheme.id)}
                        title={subTheme.label}
                        className={`h-5 w-5 rounded-full border-2 cursor-pointer transition-all ${subTheme.color} ${
                          isActive 
                            ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card" 
                            : "opacity-70 hover:opacity-100"
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mobile User Info */}
            <div className="p-4 border-t border-border/50 bg-muted/20">
              <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground font-semibold truncate leading-tight">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border px-2 py-1.5 flex justify-around shadow-lg backdrop-blur-md transition-colors duration-300">
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
