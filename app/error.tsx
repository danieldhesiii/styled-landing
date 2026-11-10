"use client";
import { useEffect } from "react";
import { SupportButton } from "@/components/support/SupportProvider";
export default function ErrorPage({
  reset, error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const first = window.location.pathname.split("/")[1];
    const section = ["design","portal","admin","venues","login","auth"].includes(first) ? first : "public";
    const digest = /^[a-zA-Z0-9_-]{1,80}$/.test(error.digest || "") ? error.digest : "";
    void fetch("/api/client-errors", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({section,digest}) }).catch(()=>{});
  }, [error.digest]);
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-serif text-4xl">We couldn’t open this page</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        Try again, or ask Styled for help if the problem continues. Trying again
        does not submit a booking or take payment.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          onClick={reset}
          type="button"
          className="min-h-11 rounded-full bg-ink px-5 py-3 text-sm text-cream"
        >
          Try again
        </button>
        <SupportButton />
      </div>
      <p className="mt-6 text-sm text-ink/70">
        If you were editing, check your last saved plan before leaving or
        refreshing.
      </p>
    </main>
  );
}
