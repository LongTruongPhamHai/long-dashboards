// src\app\layout.js

import { AuthProvider } from "@/lib/auth-context";
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
