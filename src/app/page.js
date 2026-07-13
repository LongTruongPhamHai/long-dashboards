"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  if (loading) return <p>Đang tải...</p>;
  if (!user) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={{ padding: 40 }}>
      <p>Xin chào, {user.email}</p>
      <Link href="/tasks">Xem danh sách task</Link>
      <br />
      <button onClick={handleLogout}>Đăng xuất</button>
    </div>
  );
}
