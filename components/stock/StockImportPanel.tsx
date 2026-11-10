"use client";

import { useEffect, useRef, useState } from "react";
import { IMPORT_COLUMNS, MAX_IMPORT_ROWS, TEMPLATE_CSV } from "@/lib/stock-import";
import { formatGBP } from "@/lib/quote";

// Upload a supplier's stock list (a spreadsheet saved as CSV), preview exactly
// what would change, then apply it. Used by staff (for any supplier) and by
// suppliers themselves (for their own). The server does all the checking; this
// only shows its answer.

interface PlanRow {
  line: number;
  name: string;
  action: "create" | "update" | "unchanged" | "error";
  changes: { field: string; from: unknown; to: unknown }[];
  errors: string[];
  warnings: string[];
}
interface Plan {
  rows: PlanRow[];
  counts: { create: number; update: number; unchanged: number; error: number };
  ignoredColumns: string[];
  fileErrors: string[];
  missing: { id: string; name: string }[];
  newProductsStartHidden: boolean;
}

const BADGE: Record<PlanRow["action"], { label: string; cls: string }> = {
  create: { label: "New", cls: "bg-sage/20 text-sage" },
  update: { label: "Update", cls: "bg-clay/15 text-clay" },
  unchanged: { label: "No change", cls: "bg-ink/5 text-ink/50" },
  error: { label: "Skipped", cls: "bg-red-100 text-red-700" },
};

function show(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return field === "capacity" ? "no stock limit recorded" : "none";
  if (field === "price" && typeof v === "number") return formatGBP(v / 100);
  if (Array.isArray(v)) return v.length ? v.join(", ") : "none";
  if (typeof v === "boolean") return v ? "shown" : "hidden";
  return String(v).replace(/_/g, " ");
}

export default function StockImportPanel({
  endpoint,
  supplierId,
  vendor = false,
  onApplied,
}: {
  endpoint: string;
  supplierId?: string; // staff only: whose stock list this is
  vendor?: boolean;
  onApplied?: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [applied, setApplied] = useState<{ created: number; updated: number; unchanged: number } | null>(null);
  const [busy, setBusy] = useState<"check" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);

  // A preview belongs to one supplier and endpoint. Ignore late responses from
  // the previous scope and require a fresh file/check after switching suppliers.
  useEffect(() => {
    requestVersion.current++;
    setCsv("");
    setFilename(null);
    setPlan(null);
    setApplied(null);
    setError(null);
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [endpoint, supplierId]);

  function reset() {
    requestVersion.current++;
    setCsv("");
    setFilename(null);
    setPlan(null);
    setApplied(null);
    setError(null);
    setShowAll(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function call(apply: boolean) {
    const version = ++requestVersion.current;
    setBusy(apply ? "apply" : "check");
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(supplierId ? { supplierId } : {}), csv, filename, apply }),
      });
      const data = await res.json().catch(() => null);
      if (version !== requestVersion.current) return;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "That didn't work. Nothing was changed.");
        return;
      }
      setPlan(data.plan as Plan);
      if (apply && data.result) {
        setApplied({ created: data.result.created, updated: data.result.updated, unchanged: data.result.unchanged });
        onApplied?.();
      }
    } catch {
      if (version === requestVersion.current) setError("Couldn't reach the server. Check the current products before retrying an import.");
    } finally {
      if (version === requestVersion.current) setBusy(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const version = ++requestVersion.current;
    setCsv("");
    setPlan(null);
    setApplied(null);
    setFilename(null);
    setError(null);
    if (file.size > 600_000) {
      setError("That file is too large. Please split it into smaller lists.");
      return;
    }
    setBusy("check");
    try {
      const text = await file.text();
      if (version !== requestVersion.current) return;
      setCsv(text);
      setFilename(file.name);
    } catch {
      if (version === requestVersion.current) setError("Couldn't read that file. Choose it again.");
    } finally {
      if (version === requestVersion.current) setBusy(null);
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-list-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const writable = plan ? plan.counts.create + plan.counts.update : 0;
  const visible = plan ? plan.rows.filter((r) => showAll || r.action !== "unchanged" || r.warnings.length > 0) : [];

  return (
    <section aria-label="Import a stock list" className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
      <h2 className="font-serif text-xl text-ink">Import a stock list</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink/55">
        {vendor
          ? "Upload your CSV to preview changes before saving."
          : "Upload the supplier’s CSV to preview changes before saving."}
      </p>

      <p className="mt-2 max-w-2xl text-sm text-ink/65">New and changed listings need review before publication.</p>
      <details className="mt-2 text-sm text-ink/65"><summary className="min-h-11 cursor-pointer py-3">Import and stock checks</summary><p className="max-w-2xl pb-3">Stock checks cover recorded hire periods and buffers. Confirm external bookings, date overrides and availability separately.</p></details>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={downloadTemplate} className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink hover:border-ink/50">
          Download a template
        </button>
        <label className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm text-cream hover:bg-ink/90">
          Choose a file
          <input ref={fileRef} disabled={busy !== null} type="file" accept=".csv,.txt,text/csv" onChange={onFile} className="sr-only" />
        </label>
        <button type="button" onClick={() => setPasteOpen((o) => !o)} className="text-sm text-ink/55 underline-offset-2 hover:text-ink hover:underline">
          {pasteOpen ? "Hide paste box" : "or paste it in"}
        </button>
        <button type="button" onClick={() => setHelpOpen((o) => !o)} className="ml-auto text-sm text-ink/55 underline-offset-2 hover:text-ink hover:underline">
          {helpOpen ? "Hide column guide" : "Column guide"}
        </button>
      </div>

      {helpOpen && (
        <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-2xl bg-cream/60 p-4 text-xs sm:grid-cols-2">
          {IMPORT_COLUMNS.map((c) => (
            <div key={c.key}>
              <dt className="font-mono text-[11px] font-medium text-ink">{c.key}</dt>
              <dd className="text-ink/55">{c.help}</dd>
            </div>
          ))}
          <p className="sm:col-span-2 text-ink/50">
            Up to {MAX_IMPORT_ROWS} products at a time. A column you leave out leaves that detail unchanged. Nothing is ever
            deleted by an import.
          </p>
        </dl>
      )}

      {pasteOpen && (
        <textarea
          aria-label="Paste your stock list"
          disabled={busy !== null}
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setFilename(null);
            setPlan(null);
            setApplied(null);
          }}
          rows={6}
          placeholder={"name,category,price,capacity\nGold Chair,Furniture & seating,5.50,120"}
          className="mt-4 w-full rounded-xl border border-sand bg-cream/50 px-3 py-2 font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
        />
      )}

      {csv && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-cream/60 px-4 py-3 text-sm">
          <span className="text-ink/70">
            {filename ?? "Pasted list"}
            <span className="text-ink/40"> · {Math.max(0, csv.split(/\r?\n/).filter((l) => l.trim()).length - 1)} rows</span>
          </span>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => call(false)}
            className="rounded-full bg-clay px-5 py-1.5 text-sm text-cream hover:bg-clay/90 disabled:opacity-50"
          >
            {busy === "check" ? "Checking…" : plan ? "Check again" : "Check this file"}
          </button>
          <button type="button" disabled={busy !== null} onClick={reset} className="text-ink/50 hover:text-ink">
            Clear
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {plan && plan.fileErrors.length > 0 && (
        <ul role="alert" className="mt-4 space-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {plan.fileErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {applied && (
        <div role="status" className="mt-4 rounded-xl bg-sage/15 px-4 py-3 text-sm text-ink/80">
          <p className="font-medium text-ink">Stock list applied.</p>
          <p className="mt-0.5">
            {applied.created} added · {applied.updated} updated · {applied.unchanged} unchanged
            {plan && plan.counts.error > 0 ? ` · ${plan.counts.error} skipped (fix those lines and upload again)` : ""}
          </p>
          {plan && plan.rows.some((r) => r.warnings.length > 0) && (
            <ul className="mt-2 space-y-1 text-xs text-clay">
              {plan.rows.flatMap((r) => r.warnings.map((warning) => (
                <li key={`${r.line}:${warning}`}>{r.name}: {warning}</li>
              )))}
            </ul>
          )}
          {(applied.created > 0 || applied.updated > 0) && (
            <p className="mt-1 text-xs text-ink/55">New products and changed catalogue details need range review before publication. Stock-only updates keep the current visibility.</p>
          )}
        </div>
      )}

      {plan && plan.fileErrors.length === 0 && !applied && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-sage/20 px-2.5 py-1 text-sage">{plan.counts.create} new</span>
            <span className="rounded-full bg-clay/15 px-2.5 py-1 text-clay">{plan.counts.update} to update</span>
            <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink/55">{plan.counts.unchanged} no change</span>
            <span className={`rounded-full px-2.5 py-1 ${plan.counts.error ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink/55"}`}>
              {plan.counts.error} with problems
            </span>
            {plan.counts.unchanged > 0 && (
              <button type="button" onClick={() => setShowAll((s) => !s)} className="ml-auto text-ink/50 underline-offset-2 hover:text-ink hover:underline">
                {showAll ? "Hide unchanged" : "Show unchanged"}
              </button>
            )}
          </div>

          {plan.newProductsStartHidden && plan.counts.create > 0 && (
            <p className="mt-3 rounded-xl bg-clay/10 px-4 py-2.5 text-xs text-ink/70">
              New products start hidden until Styled has reviewed them, so they won&apos;t show to couples straight away.
            </p>
          )}
          {plan.ignoredColumns.length > 0 && (
            <p className="mt-3 text-xs text-ink/50">
              Ignored columns we don&apos;t use: {plan.ignoredColumns.join(", ")}.
            </p>
          )}

          {visible.length > 0 ? (
            <ul className="mt-3 divide-y divide-sand overflow-hidden rounded-2xl border border-sand">
              {visible.map((r) => (
                <li key={`${r.line}-${r.name}`} className="flex gap-3 px-4 py-2.5 text-sm">
                  <span className="w-8 shrink-0 text-right font-mono text-[11px] text-ink/35">{r.line}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{r.name || "(no name)"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE[r.action].cls}`}>{BADGE[r.action].label}</span>
                    </div>
                    {r.action === "update" && (
                      <ul className="mt-1 space-y-0.5 text-xs text-ink/60">
                        {r.changes.map((c) => (
                          <li key={c.field}>
                            {c.field.replace(/_/g, " ")}: <span className="text-ink/40 line-through">{show(c.field, c.from)}</span> →{" "}
                            <span className="text-ink">{show(c.field, c.to)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.action === "create" && (
                      <p className="mt-1 text-xs text-ink/55">
                        {show("category", r.changes.find((c) => c.field === "category")?.to)} ·{" "}
                        {show("price", r.changes.find((c) => c.field === "price")?.to)} · stock{" "}
                        {show("capacity", r.changes.find((c) => c.field === "capacity")?.to)}
                      </p>
                    )}
                    {r.errors.map((e) => (
                      <p key={e} className="mt-1 text-xs text-red-700">⚠ {e}</p>
                    ))}
                    {r.warnings.map((w) => (
                      <p key={w} className="mt-1 text-xs text-clay">Note: {w}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink/55">Nothing in this file would change anything.</p>
          )}

          {plan.missing.length > 0 && (
            <p className="mt-3 text-xs text-ink/50">
              {plan.missing.length} existing product{plan.missing.length === 1 ? " isn't" : "s aren't"} in this file and will be
              left exactly as {plan.missing.length === 1 ? "it is" : "they are"}.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy !== null || writable === 0}
              onClick={() => call(true)}
              className="rounded-full bg-ink px-6 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/25"
            >
              {busy === "apply" ? "Applying…" : writable === 0 ? "Nothing to apply" : `Apply ${writable} change${writable === 1 ? "" : "s"}`}
            </button>
            {plan.counts.error > 0 && writable > 0 && (
              <span className="text-xs text-ink/50">
                {plan.counts.error} row{plan.counts.error === 1 ? "" : "s"} with problems will be skipped.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
