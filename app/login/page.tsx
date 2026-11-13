"use client";

import FormExit from "@/components/ui/FormExit";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AccountForm from "@/components/auth/AccountForm";
import { createClient } from "@/lib/supabase/client";
import { accountDestination, accountMode, safeLocalRedirect } from "@/lib/auth/navigation";

function LoginForm() {
  const params = useSearchParams();
  const next = safeLocalRedirect(params.get("next"));
  const initialMode = accountMode(params.get("mode"));
  useEffect(() => {
    let live = true;
    createClient()
      .auth.getUser()
      .then(async ({ data }) => {
        if (live && data.user && !data.user.is_anonymous) {
          const target = await accountDestination(next);
          if (live) window.location.replace(target);
        }
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
        <FormExit href={next.startsWith("/venue-portal") ? "/venues/partner" : "/"}>{next.startsWith("/venue-portal") ? "Back to venue information" : "Back to home"}</FormExit>
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
