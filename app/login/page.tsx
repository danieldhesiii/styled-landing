"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AccountForm from "@/components/auth/AccountForm";
import { createClient } from "@/lib/supabase/client";
import { accountMode, safeLocalRedirect } from "@/lib/auth/navigation";

function LoginForm() {
  const params = useSearchParams();
  const next = safeLocalRedirect(params.get("next"));
  const initialMode = accountMode(params.get("mode"));
  useEffect(() => {
    let live = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (live && data.user && !data.user.is_anonymous)
          window.location.replace(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [next]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-16">
      <Link href="/" className="mb-8 font-serif text-2xl text-ink">
        Styled.
      </Link>
      <div className="w-full max-w-sm rounded-3xl border border-sand bg-white p-8 shadow-sm">
        <h1 className="font-serif text-2xl text-ink">Your Styled account</h1>
        {next.startsWith("/venue-portal") && (
          <p className="mt-2 text-sm text-ink/70">
            Sign in or create an account for the venue workspace. Existing
            listing access is managed separately.
          </p>
        )}
        <AccountForm
          key={`${next}:${initialMode}`}
          initialMode={initialMode}
          next={next}
        />
      </div>
    </main>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading account access…</p>}>
      <LoginForm />
    </Suspense>
  );
}
