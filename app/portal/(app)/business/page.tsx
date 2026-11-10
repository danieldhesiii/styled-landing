"use client";
import SupplierRangeReview from "@/components/booking/SupplierRangeReview";
import SupplierLocationFields from "@/components/vendor/SupplierLocationFields";
import { useEffect, useState } from "react";
import Link from "next/link";
import AssetUpload from "@/components/vendor/AssetUpload";
import {
  EMPTY_SERVICES,
  SERVICE_LABELS,
  type SupplierServices,
} from "@/lib/supplier-workspace";
export default function SupplierBusiness() {
  const [profile, setProfile] = useState<any>(null),
    [services, setServices] = useState<SupplierServices>({ ...EMPTY_SERVICES }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loaded, setLoaded] = useState(false);
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/vendor/profile", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setProfile(d.profile);
      setServices({ ...EMPTY_SERVICES, ...d.profile.service_details });
      setLoaded(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your business.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const field =
    "mt-2 min-h-11 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-base";
  function service(k: keyof SupplierServices, v: string | boolean) {
    setServices((s) => ({ ...s, [k]: v }));
    setNotice("");
  }
  if (!loaded)
    return (
      <>
        <h1 className="font-serif text-4xl">Business setup</h1>
      <SupplierRangeReview/>
        <p role={error ? "alert" : "status"} className="mt-4">
          {error || "Loading your business…"}
        </p>
        {error && (
          <button
            onClick={() => void load()}
            className="mt-3 min-h-11 underline"
          >
            Retry
          </button>
        )}
      </>
    );
  return (
    <>
      <h1 className="font-serif text-4xl">Business setup</h1>
      <SupplierRangeReview/>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
        Tell customers how you work. Leave optional policies blank until they
        are agreed; nothing here charges a customer automatically.
      </p>
      <form
        className="mt-8 max-w-3xl space-y-8"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const r = await fetch("/api/vendor/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: profile.name,
                area: profile.area,
                contact_email: profile.contact_email,
                bio: profile.bio || "",
                services,
              }),
            });
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            setNotice(
              "Business details saved. If a material detail changed, submit your range for review before it appears publicly again.",
            );
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Could not save. Your changes are still here.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="space-y-5">
          <legend className="mb-4 font-serif text-2xl">Your business</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              ["name", "Business name"],
              ["area", "Public town / service area"],
              ["contact_email", "Contact email (private)"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm">
                {label}
                <input
                  required
                  type={key === "contact_email" ? "email" : "text"}
                  maxLength={200}
                  placeholder={key === "area" ? "For example, Chelmsford, Essex — no street address" : undefined}
                  className={field}
                  value={profile[key] || ""}
                  onChange={(e) => {
                    setProfile({ ...profile, [key]: e.target.value });
                    setNotice("");
                  }}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            Your business story
            <textarea
              maxLength={2000}
              rows={4}
              className={field}
              value={profile.bio || ""}
              onChange={(e) => {
                setProfile({ ...profile, bio: e.target.value });
                setNotice("");
              }}
            />
          </label>
          <p className="text-xs text-ink/60">
            Your contact email is used for operational messages, not shown on
            the public profile.
          </p>
        </fieldset>
        <section className="border-t border-sand pt-6">
          <h2 className="mb-4 font-serif text-2xl">Business logo</h2>
          {profile.logo_url && (
            <img
              src={profile.logo_url}
              alt="Your business logo"
              className="mb-3 h-20 w-20 rounded-xl object-contain"
            />
          )}
          <AssetUpload
            kind="logo"
            onUploaded={async () => {
              setNotice("Logo saved. Your other edits are still here; save them below.");
              try {const r=await fetch("/api/vendor/profile",{cache:"no-store"});const d=await r.json();if(r.ok)setProfile((p:any)=>({...p,logo_url:d.profile.logo_url}));}catch{}
            }}
          />
        </section>
        <fieldset
          disabled={busy}
          className="space-y-5 border-t border-sand pt-6"
        >
          <legend className="mb-4 pr-4 font-serif text-2xl">
            Delivery and collection
          </legend>
          <label className="block text-sm">
            Areas you serve
            <input
              className={field}
              maxLength={300}
              value={services.coverage}
              onChange={(e) => service("coverage", e.target.value)}
              placeholder="For example, Essex and East London"
            />
          </label>
          <div className="flex flex-wrap gap-5">
            {[
              ["delivery", "We deliver"],
              ["collection", "Customers can collect"],
              ["setup", "We offer setup"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={!!services[key as keyof SupplierServices]}
                  onChange={(e) =>
                    service(key as keyof SupplierServices, e.target.checked)
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {["deliveryNotes", "returnNotes"].map((k) => (
            <label key={k} className="block text-sm">
              {SERVICE_LABELS[k]}
              <textarea
                rows={3}
                maxLength={1500}
                className={field}
                value={services[k as "deliveryNotes" | "returnNotes"]}
                onChange={(e) =>
                  service(k as keyof SupplierServices, e.target.value)
                }
              />
            </label>
          ))}
        </fieldset>
        <details className="rounded-xl border border-sand p-5">
          <summary className="cursor-pointer text-sm font-medium">
            Payment, cancellation and damage rules (optional)
          </summary>
          <fieldset disabled={busy} className="mt-5 space-y-5">
            <p className="text-sm text-ink/65">
              Record your own policies. These are guidance for a quote, not a
              payment instruction or an agreed booking contract. Commission is
              agreed with Styled separately.
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                ["minimumOrder", "Minimum hire-item subtotal (£, excluding delivery/security)"],
                ["depositPercent", "Reservation deposit (%)"],
                ["balanceDays", "Balance due, days before event"],
              ].map(([key, label]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <input
                    inputMode="decimal"
                    className={field}
                    value={services[key as keyof SupplierServices] as string}
                    onChange={(e) =>
                      service(
                        key as keyof SupplierServices,
                        e.target.value.replace(/^0+(?=\d)/, ""),
                      )
                    }
                    placeholder="Not set"
                  />
                </label>
              ))}
            </div>
            {["cancellation", "damage"].map((k) => (
              <label key={k} className="block text-sm">
                {SERVICE_LABELS[k]}
                <textarea
                  rows={3}
                  maxLength={1500}
                  className={field}
                  value={services[k as "cancellation" | "damage"]}
                  onChange={(e) =>
                    service(k as keyof SupplierServices, e.target.value)
                  }
                />
              </label>
            ))}
          </fieldset>
        </details>
        {error && (
          <p role="alert" className="rounded-xl bg-blush/30 p-4 text-sm">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-sage/15 p-4 text-sm">
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-5">
          <button
            disabled={busy}
            className="min-h-11 rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save business details"}
          </button>
          <Link href="/portal" className="min-h-11 py-3 text-sm underline">
            Back to overview
          </Link>
        </div>
      </form>
      <SupplierLocationFields />
    </>
  );
}
