"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { supplierReadiness } from "@/lib/vendor-readiness";
import AssetUpload from "./AssetUpload";
export default function OnboardingChecklist() {
  const [data, setData] = useState<{
      profile: {
        active: boolean;
        logo_url: string | null;
        bio: string | null;
        onboarding_availability_confirmed_at: string | null;
      };
      productCount: number;
      readiness: ReturnType<typeof supplierReadiness>;
    } | null>(null),
    [error, setError] = useState(""),
    [bio, setBio] = useState(""),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const bioDirty = useRef(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/vendor/profile", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      if (!bioDirty.current) setBio(d.profile.bio || "");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile.");
      return false;
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/vendor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (body.bio !== undefined) bioDirty.current = false;
      const refreshed = await load();
      setMessage(refreshed ? "Saved." : "Changes saved; setup status could not refresh. Please retry loading.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }
  if (!data)
    return (
      <div className="mb-8 text-sm">
        <p role={error ? "alert" : "status"}>{error || "Loading your supplier setup…"}</p>
        {error && <button type="button" className="mt-2 underline" onClick={() => void load()}>Retry supplier setup</button>}
      </div>
    );
  const { steps, completed: count } = data.readiness;
  return (
    <section className="mb-10 rounded-2xl border border-sand bg-cream p-6">
      <h2 className="font-serif text-3xl">Your supplier setup</h2>
      <p className="mt-2 text-sm text-ink/60">{count} of 3 setup steps complete</p>
      <progress
        aria-label="Supplier setup progress"
        value={count}
        max={3}
        className="mt-3 w-full accent-clay"
      />
      <div className="mt-4 text-sm text-ink/70">
        <p>{data.readiness.total} products in setup · {data.readiness.draft} draft / hidden · {data.readiness.live} live in the public catalogue</p>
        {!data.profile.active && <p className="mt-2">Your supplier listing is inactive. Ask Styled to review publication; enabling a product alone will not make it public.</p>}
        <p className="mt-2">Setup completion does not publish your catalogue. New imports start hidden for review; hidden products may also have been switched off.</p>
        {data.readiness.publicProfileHref ? (
          <Link className="mt-2 inline-block underline" href={data.readiness.publicProfileHref}>View your public supplier profile</Link>
        ) : <p className="mt-2">Your public profile is not available yet. Review your products and contact Styled if you are waiting for publication.</p>}
        <Link className="mt-2 inline-block underline" href="/portal/products">Review products</Link>
      </div>
      <ol className="mt-5 grid gap-5 md:grid-cols-3">
        <li>
          <p className="mb-3 text-sm">{steps[0] ? "✓" : "1."} Add your logo</p>
          {data.profile.logo_url && (
            <img
              src={data.profile.logo_url}
              alt="Your business logo"
              className="mb-3 h-16 w-16 rounded-full object-cover"
            />
          )}
          <AssetUpload kind="logo" onUploaded={() => void load()} />
        </li>
        <li>
          <p className="mb-3 text-sm">
            {steps[1] ? "✓" : "2."} Add your products
          </p>
          <Link href="/portal/import" className="text-sm underline">
            Import your stock list
          </Link>
          <p className="mt-2 text-xs text-ink/60">
            Start with a small selection. The import preview lets you check
            changes before saving.
          </p>
        </li>
        <li>
          <p className="mb-3 text-sm">
            {steps[2] ? "✓" : "3."} Review availability
          </p>
          <Link href="/portal/availability" className="text-sm underline">
            Set dates and calendar sync
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ confirmAvailability: true })}
            className="mt-3 block rounded-full border border-sand px-3 py-2 text-xs"
          >
            I’ve reviewed my availability
          </button>
        </li>
      </ol>
      <label className="mt-6 block text-sm">
        Your business story
        <textarea
          value={bio}
          onChange={(e) => { bioDirty.current = true; setBio(e.target.value); }}
          disabled={saving}
          maxLength={2000}
          rows={3}
          className="mt-2 w-full rounded-xl border border-sand bg-white p-3"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save({ bio })}
        className="mt-3 rounded-full bg-ink px-5 py-2 text-sm text-cream"
      >
        Save story
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
          <button type="button" className="ml-3 underline" onClick={() => void load()}>Refresh setup status</button>
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
