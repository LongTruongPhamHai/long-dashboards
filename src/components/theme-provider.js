"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "system",
  setTheme: () => {},
});

export const themeClasses = ["theme-dark-blue", "theme-dark-emerald", "theme-dark-purple"];

export function applyTheme(theme) {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;

  // Remove existing dark and theme-specific classes
  root.classList.remove("dark");
  themeClasses.forEach((cls) => root.classList.remove(cls));

  let resolvedTheme = theme;
  if (theme === "system") {
    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    resolvedTheme = systemIsDark ? "dark" : "light";
  }

  if (resolvedTheme === "light") {
    // Light mode has no special class since it's :root (default)
  } else if (resolvedTheme === "dark") {
    root.classList.add("dark");
  } else {
    // Other sub-themes (e.g., "dark-blue")
    root.classList.add("dark");
    root.classList.add(`theme-${resolvedTheme}`);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("system");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("app-theme") || "system";
    setThemeState(stored);
    applyTheme(stored);
    setMounted(true);
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
    applyTheme(newTheme);
  };

  // Listen to system preference changes if theme is set to 'system'
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Avoid hydration mismatch by waiting for mount
  return (
    <ThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
