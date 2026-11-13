"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, ago } from "@/lib/admin-client";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
type Application = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  category: string | null;
  area: string | null;
  website: string | null;
  message: string | null;
  status: string;
  created_at: string;
  supplier_id: string | null;
  invitation_sent_at: string | null;
  application_notifications: { status: string }[] | { status: string } | null;
};
const button =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-sand px-5 text-sm hover:bg-cream disabled:opacity-40";
export default function VendorsPage() {
  const [apps, setApps] = useState<Application[] | null>(null),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null),
    [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  async function load(status = filter) {
    const r = await adminApi(
      "/api/admin/vendor-applications" + (status ? "?status=" + status : ""),
    );
    if (!r.ok) {
      setError(r.data?.error || "Could not load applications.");
      return;
    }
    setApps(r.data.applications);
  }
  useEffect(() => {
    setApps(null);
    void load(filter);
  }, [filter]);
  async function status(a: Application, value: string) {
    setBusy(a.id);
    setError(null);
    try {
      const r = await adminApi(
        "/api/admin/vendor-applications/" + a.id,
        "PATCH",
        { status: value },
      );
      if (!r.ok) throw Error(r.data?.error || "Could not update application.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update application.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function approve(a: Application) {
    setBusy(a.id);
    setError(null);
    setNotice(null);
    try {
      let supplier = a.supplier_id;
      if (!supplier) {
        const r = await adminApi(
          "/api/admin/vendor-applications/" + a.id + "/approve",
          "POST",
          { confirmReviewed: reviewed[a.id] === true },
        );
        if (!r.ok) throw Error(r.data?.error || "Could not approve supplier.");
        supplier = r.data.supplierId;
        await load();
      }
      const invite = await adminApi(
        "/api/admin/suppliers/" + supplier + "/users",
        "POST",
        { email: a.email, confirmAccess: reviewed[a.id] === true },
      );
      if (!invite.ok)
        throw Error(
          "Workspace created. " +
            (invite.data?.error ||
              "The invitation could not be sent. Open supplier access to retry."),
        );
      setNotice(invite.data.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send invitation.");
    } finally {
      setBusy(null);
    }
  }
  async function alerts() {
    setBusy("alerts");
    setNotice(null);
    try {
      const r = await adminApi(
        "/api/admin/application-notifications",
        "POST",
        {},
      );
      if (!r.ok) throw Error(r.data?.error || "Could not check alerts.");
      setNotice(
        r.data.sendingEnabled
          ? `Checked queued application alerts. ${r.data.processed} processed.`
          : "Applications are saved, but email sending is not configured for this environment.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check alerts.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            Supplier onboarding
          </p>
          <h1 className="mt-2 font-serif text-4xl">Applications</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
            Review the business, then approve and invite. Suppliers choose their
            own password. Their products stay private until the usual
            publication review.
          </p>
        </div>
        <button className={button} disabled={!!busy} onClick={alerts}>
          Check queued email alerts
        </button>
      </div>
      <nav
        aria-label="Application status"
        className="mt-7 flex flex-wrap gap-2"
      >
        {[
          ["", "All"],
          ["new", "New"],
          ["reviewing", "Reviewing"],
          ["accepted", "Approved"],
          ["declined", "Declined"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={
              button +
              (filter === value ? " bg-ink text-cream hover:bg-ink" : "")
            }
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-5 rounded-xl bg-sage/15 p-4 text-sm">
          {notice}
        </p>
      )}
      {apps === null ? (
        <p className="py-10 text-sm">Loading applications…</p>
      ) : apps.length === 0 ? (
        <p className="mt-8 border-y border-sand py-10 text-ink/60">
          No applications in this view. Suppliers can apply at{" "}
          <Link href="/suppliers/join" className="underline">
            Become a supplier
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-7 space-y-5">
          {apps.map((a) => {
            const job = Array.isArray(a.application_notifications)
              ? a.application_notifications[0]
              : a.application_notifications;
            const notification =
              job?.status === "provider_accepted"
                ? "Email alert accepted by provider"
                : job?.status === "unknown" || job?.status === "sending"
                  ? "Email alert needs delivery review"
                  : job
                    ? "Email alert " + job.status
                    : "No new alert queued";
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-sand bg-white p-5 sm:p-7"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl">{a.business_name}</h2>
                    <p className="mt-2 text-sm text-ink/65">
                      {vendorCategoryLabel(a.category)}
                      {a.area ? " · " + a.area : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-ink/60">
                    <p>{a.status === "accepted" ? "Approved" : a.status}</p>
                    <p className="mt-2">{ago(a.created_at)}</p>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-ink/50">Contact</dt>
                    <dd>{a.contact_name || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink/50">Account email</dt>
                    <dd className="break-all">
                      <a className="underline" href={"mailto:" + a.email}>
                        {a.email}
                      </a>
                    </dd>
                  </div>
                  {a.phone && (
                    <div>
                      <dt className="text-ink/50">Phone</dt>
                      <dd>{a.phone}</dd>
                    </div>
                  )}
                  {a.website && (
                    <div>
                      <dt className="text-ink/50">Website or social profile</dt>
                      <dd className="break-all">
                        <a
                          href={safeWebsite(a.website)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline"
                        >
                          {a.website}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                {a.message && (
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink/75">
                    {a.message}
                  </p>
                )}
                <p className="mt-4 text-xs text-ink/55">
                  {notification}
                  {a.invitation_sent_at
                    ? " · Invitation sent " + ago(a.invitation_sent_at)
                    : ""}
                </p>
                <div className="mt-5 border-t border-sand pt-4">
                  {a.category === "venue" ? (
                    <Link href="/admin/venues" className={button}>
                      Open venue review
                    </Link>
                  ) : (
                    <>
                      {a.status !== "declined" && (
                        <label className="flex items-start gap-3 text-sm leading-relaxed">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={!!reviewed[a.id]}
                            onChange={(e) =>
                              setReviewed({
                                ...reviewed,
                                [a.id]: e.target.checked,
                              })
                            }
                          />
                          I have vetted this business and confirmed that{" "}
                          {a.email} should have access to its supplier
                          workspace.
                        </label>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {!a.supplier_id && a.status !== "reviewing" && (
                          <button
                            className={button}
                            disabled={!!busy}
                            onClick={() => status(a, "reviewing")}
                          >
                            {a.status === "declined"
                              ? "Reopen for review"
                              : "Mark reviewing"}
                          </button>
                        )}
                        {!a.supplier_id && a.status !== "declined" && (
                          <button
                            className={button}
                            disabled={!!busy}
                            onClick={() => status(a, "declined")}
                          >
                            Decline
                          </button>
                        )}
                        {a.status !== "declined" && (
                          <button
                            className={
                              button + " bg-ink text-cream hover:bg-ink/90"
                            }
                            disabled={!!busy || !reviewed[a.id]}
                            onClick={() => approve(a)}
                          >
                            {busy === a.id
                              ? "Working…"
                              : a.invitation_sent_at
                                ? "Resend invitation"
                                : a.supplier_id
                                  ? "Send account invitation"
                                  : "Approve and invite"}
                          </button>
                        )}
                        {a.supplier_id && (
                          <Link
                            href={"/admin/suppliers/" + a.supplier_id}
                            className={button}
                          >
                            Manage supplier access →
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
function safeWebsite(value: string) {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : "https://" + value,
    );
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
