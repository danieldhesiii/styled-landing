"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, ago } from "@/lib/admin-client";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

interface Application {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  category: string | null;
  area: string | null;
  website: string | null;
  message: string | null;
  status: "new" | "reviewing" | "accepted" | "declined";
  created_at: string;
}

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

const STATUS_STYLE: Record<Application["status"], string> = {
  new: "bg-clay/15 text-clay",
  reviewing: "bg-amber-100 text-amber-800",
  accepted: "bg-sage/20 text-green-800",
  declined: "bg-ink/10 text-ink/50",
};

// Each status offers the moves that make sense next.
const NEXT: Record<Application["status"], Application["status"][]> = {
  new: ["reviewing", "accepted", "declined"],
  reviewing: ["accepted", "declined"],
  accepted: ["reviewing", "declined"],
  declined: ["reviewing"],
};

const ACTION_LABEL: Record<Application["status"], string> = {
  new: "Mark new",
  reviewing: "Mark reviewing",
  accepted: "Accept",
  declined: "Decline",
};

export default function VendorsPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  function load(status: string) {
    setApps(null);
    setError(null);
    adminApi(`/api/admin/vendor-applications${status ? `?status=${status}` : ""}`).then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Couldn't load applications.");
      setApps(r.data.applications as Application[]);
    });
  }

  useEffect(() => { load(filter); }, [filter]);

  async function setStatus(app: Application, status: Application["status"]) {
    setSavingId(app.id);
    const r = await adminApi(`/api/admin/vendor-applications/${app.id}`, "PATCH", { status });
    setSavingId(null);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't update the application.");
    // Reflect the change in place; drop it if it no longer matches the filter.
    setApps((prev) =>
      (prev ?? [])
        .map((a) => (a.id === app.id ? { ...a, status } : a))
        .filter((a) => (filter ? a.status === filter : true))
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-ink">Vendors</h1>
          <p className="mt-1 text-sm text-ink/50">
            {apps === null
              ? "Loading…"
              : apps.length === 0
                ? "No applications here yet."
                : `${apps.length} ${apps.length === 1 ? "application" : "applications"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                filter === f.value ? "bg-ink text-cream" : "border border-sand text-ink/60 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {apps && apps.length === 0 && !error && (
        <div className="mt-10 rounded-3xl border border-dashed border-sand px-6 py-14 text-center text-sm text-ink/50">
          Applications from the “List your business” form on the site land here for you to review.
        </div>
      )}

      {apps && apps.length > 0 && (
        <ul className="mt-6 space-y-4">
          {apps.map((a) => (
            <li key={a.id} className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl text-ink">{a.business_name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_STYLE[a.status]}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">
                    {vendorCategoryLabel(a.category)}
                    {a.area ? ` · ${a.area}` : ""}
                  </p>
                </div>
                <span className="text-xs text-ink/40">{ago(a.created_at)}</span>
              </div>

              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {a.contact_name && (
                  <div className="flex gap-2"><dt className="text-ink/40">Contact</dt><dd className="text-ink/80">{a.contact_name}</dd></div>
                )}
                <div className="flex gap-2">
                  <dt className="text-ink/40">Email</dt>
                  <dd><a href={`mailto:${a.email}`} className="text-clay hover:underline">{a.email}</a></dd>
                </div>
                {a.phone && (
                  <div className="flex gap-2"><dt className="text-ink/40">Phone</dt><dd className="text-ink/80">{a.phone}</dd></div>
                )}
                {a.website && (
                  <div className="flex gap-2">
                    <dt className="text-ink/40">Web</dt>
                    <dd className="truncate"><a href={normalizeUrl(a.website)} target="_blank" rel="noreferrer noopener" className="text-clay hover:underline">{a.website}</a></dd>
                  </div>
                )}
              </dl>

              {a.message && (
                <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-cream/70 px-4 py-3 text-sm text-ink/70">{a.message}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {NEXT[a.status].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={savingId === a.id}
                    onClick={() => setStatus(a, s)}
                    className={`rounded-full px-4 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                      s === "accepted"
                        ? "bg-ink text-cream hover:bg-ink/90"
                        : "border border-sand text-ink/70 hover:border-clay/50 hover:text-ink"
                    }`}
                  >
                    {ACTION_LABEL[s]}
                  </button>
                ))}
                {a.status === "accepted" && (
                  <Link href={supplierSetupHref(a)} className="rounded-full bg-ink px-4 py-1.5 text-sm text-cream hover:bg-ink/90">
                    Set up as supplier →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Applicants type "instagram.com/…" as often as a full URL; make the link work.
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Deep-link to the Suppliers screen with the create form prefilled from the
// application. Creating the supplier there marks this application accepted.
function supplierSetupHref(a: Application): string {
  const q = new URLSearchParams({ new: "1", name: a.business_name, application: a.id });
  if (a.area) q.set("area", a.area);
  if (a.email) q.set("email", a.email);
  return `/admin/suppliers?${q.toString()}`;
}
