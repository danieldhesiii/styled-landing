"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "login";

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email already has an account — try logging in instead.";
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("at least")) return "Your password needs to be at least 6 characters.";
  if (m.includes("valid email")) return "Please enter a valid email address.";
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/design";

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in with a real account — skip straight through.
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user && !data.user.is_anonymous) router.replace(next);
      });
  }, [router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data: { user: current } } = await supabase.auth.getUser();
        // If they already have an anonymous session, upgrade it in place so
        // any renders / saved looks they made carry over.
        const res = current?.is_anonymous
          ? await supabase.auth.updateUser({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });

        if (res.error) {
          setError(friendly(res.error.message));
        } else {
          // Try signing in immediately in case email confirmation is disabled.
          const { data: s } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (s.session) {
            router.replace(next);
          } else {
            setNotice("Account created — check your email to confirm, then sign in.");
            setMode("login");
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(friendly(signInError.message));
        } else if (data.session) {
          router.replace(next);
        }
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-16">
      <Link href="/" className="mb-8 font-serif text-2xl tracking-wide text-ink">
        Styled
      </Link>

      <div className="w-full max-w-sm rounded-3xl border border-sand bg-white px-8 py-10 shadow-sm">
        <h1 className="font-serif text-2xl text-ink">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink/50">
          {mode === "signup"
            ? "Sign up to start designing your wedding."
            : "Sign in to continue designing."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-widest text-ink/40">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-clay/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-widest text-ink/40">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-clay/60"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {notice && <p className="text-sm text-sage">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-full bg-ink py-3 text-sm text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center text-sm text-ink/40 hover:text-ink"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>

      <p className="mt-6 text-xs text-ink/30">
        By continuing you agree to our terms of service.
      </p>
    </div>
  );
}
