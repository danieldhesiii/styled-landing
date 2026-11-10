"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function OnboardingChecklist() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/vendor/profile", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load setup.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (!data)
    return (
      <div className="my-6 text-sm">
        <p role={error ? "alert" : "status"}>
          {error || "Loading supplier setup…"}
        </p>
        {error && (
          <button onClick={() => void load()} className="min-h-11 underline">
            Try again
          </button>
        )}
      </div>
    );
  const services = data.profile.service_details || {};
  const steps = [
    {
      title: "Business and delivery",
      done:
        !!data.profile.bio &&
        !!services.coverage &&
        (services.delivery || services.collection),
      href: "/portal/business",
      text: "Your story, delivery areas and hire rules.",
    },
    {
      title: "Product catalogue",
      done: data.productCount > 0,
      href: "/portal/products",
      text: "Add pieces, prices and the stock you can supply.",
    },
    {
      title: "Availability",
      done: !!data.profile.onboarding_availability_confirmed_at,
      href: "/portal/availability",
      text: "Check stock, blocked dates and calendar details.",
    },
  ];
  const complete = steps.filter((s) => s.done).length;
  return (
    <section className="mt-8 border-t border-sand pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Your supplier setup</h2>
        <span className="text-sm text-ink/60">{complete} of 3 complete</span>
      </div>
      <progress
        aria-label="Supplier setup progress"
        value={complete}
        max={3}
        className="mt-4 h-1.5 w-full accent-clay"
      />
      <ol className="mt-5 divide-y divide-sand">
        {steps.map((s, i) => (
          <li key={s.href} className="flex items-center gap-4 py-4">
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-sage/20" : "bg-sand/60"}`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={s.href}
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                {s.title}
              </Link>
              <p className="mt-1 text-sm text-ink/60">{s.text}</p>
            </div>
            <Link
              aria-label={`Open ${s.title}`}
              href={s.href}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sand"
            >
              →
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-ink/60">
        {data.profile.active
          ? "Your business is active. Products marked visible can appear in the catalogue."
          : "Your business is awaiting Styled’s publication review. Completing setup does not publish it."}
      </p>
    </section>
  );
}
