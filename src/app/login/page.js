"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { KeyRound, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4 font-sans antialiased">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-xl shadow-slate-100/50 space-y-6 animate-in fade-in duration-300">
        {/* LOGO & TITLE */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shadow-inner">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-slate-500 text-xs font-medium mt-1">
              {isSignUp
                ? "Start managing your life more productively"
                : "Sign in to continue managing tasks and goals"}
            </p>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold px-4 py-3 rounded-lg leading-relaxed">
            {error}
          </div>
        )}

        {/* LOGIN/SIGNUP FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="your-name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/20"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/20"
                required
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold text-white bg-primary hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-all shadow-xs"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* TOGGLE LINK */}
        <div className="border-t border-slate-100 pt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-xs font-bold text-primary hover:underline transition-all"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
