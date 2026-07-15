// src\app\layout.js

import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import LayoutWrapper from "@/components/layout-wrapper";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Long Dashboards",
  description: "Quản lý task, mục tiêu, và lịch sinh hoạt cá nhân",
};

const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('app-theme') || 'system';
      var root = document.documentElement;
      root.classList.remove('dark', 'theme-dark-blue', 'theme-dark-emerald', 'theme-dark-purple');
      var resolved = stored;
      if (stored === 'system') {
        var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = isDark ? 'dark' : 'light';
      }
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else if (resolved !== 'light') {
        root.classList.add('dark', 'theme-' + resolved);
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

