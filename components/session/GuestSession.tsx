"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Makes sure the browser has a Supabase session, creating an anonymous guest
// session the first time. Wrap any page that talks to the backend. Renders its
// children immediately; `onReady` fires once a session is confirmed.
export default function GuestSession({
  children,
  onReady,
}: {
  children: React.ReactNode;
  onReady?: (userId: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function ensure() {
      const { data } = await supabase.auth.getUser();
      let user = data.user;

      if (!user) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) {
          if (!cancelled) setError(res.error.message);
          return;
        }
        user = res.data.user;
      }
      if (!cancelled && user) onReady?.(user.id);
    }

    ensure();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {error && (
        <p className="bg-blush/30 px-4 py-2 text-center text-xs text-ink/70">
          Couldn't start your session ({error}). Refresh to try again.
        </p>
      )}
      {children}
    </>
  );
}
