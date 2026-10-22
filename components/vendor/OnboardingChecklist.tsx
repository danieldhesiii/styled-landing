"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AssetUpload from "./AssetUpload";
export default function OnboardingChecklist() {
  const [data, setData] = useState<{
      profile: {
        logo_url: string | null;
        bio: string | null;
        onboarding_availability_confirmed_at: string | null;
      };
      productCount: number;
    } | null>(null),
    [error, setError] = useState(""),
    [bio, setBio] = useState(""),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/vendor/profile");
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setBio(d.profile.bio || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile.");
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
      await load();
      setMessage("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }
  if (!data)
    return (
      <p role="status" className="mb-8 text-sm">
        {error || "Loading your supplier setup…"}
      </p>
    );
  const steps = [
      !!data.profile.logo_url,
      data.productCount > 0,
      !!data.profile.onboarding_availability_confirmed_at,
    ],
    count = steps.filter(Boolean).length;
  return (
    <section className="mb-10 rounded-2xl border border-sand bg-cream p-6">
      <h2 className="font-serif text-3xl">Your supplier setup</h2>
      <p className="mt-2 text-sm text-ink/60">{count} of 3 steps complete</p>
      <progress
        aria-label="Supplier setup progress"
        value={count}
        max={3}
        className="mt-3 w-full accent-clay"
      />
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
          onChange={(e) => setBio(e.target.value)}
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
