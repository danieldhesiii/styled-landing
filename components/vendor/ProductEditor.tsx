"use client";
import { useState } from "react";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import { QTY_RULES } from "@/lib/product-options";
import { STYLES } from "@/lib/styles";
import { productInput, type ProductDraft } from "@/lib/supplier-workspace";
export default function ProductEditor({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: ProductDraft;
  isNew: boolean;
  onSave: (draft: ProductDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial),
    [limited, setLimited] = useState(isNew || initial.capacity !== ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const field =
    "mt-2 min-h-11 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-base";
  function set(k: keyof ProductDraft, v: unknown) {
    setDraft((d) => ({ ...d, [k]: v }));
  }
  return (
    <form
      className="my-7 rounded-2xl border border-clay/30 bg-cream p-5 sm:p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const b = { ...draft, capacity: limited ? draft.capacity : "" };
        if (limited && b.capacity === "") {
          setError(
            "Enter how many units you can supply, or choose Made to order.",
          );
          return;
        }
        if (!productInput(b)) {
          setError(
            "Check the name, price, stock quantity and optional details.",
          );
          return;
        }
        setBusy(true);
        try {
          await onSave(b);
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
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl">
          {isNew ? "Add a product" : "Edit product"}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="min-h-11 text-sm underline"
        >
          Cancel
        </button>
      </div>
      <fieldset disabled={busy} className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm">
            Product name
            <input
              autoFocus
              required
              maxLength={160}
              className={field}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Category
            <select
              className={field}
              value={draft.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Price (£)
            <input
              inputMode="decimal"
              required
              className={field}
              value={draft.unitPrice}
              onChange={(e) =>
                set("unitPrice", e.target.value.replace(/^0+(?=\d)/, ""))
              }
              placeholder="For example, 12.50"
            />
          </label>
          <label className="text-sm">
            Price is for
            <input
              required
              maxLength={40}
              className={field}
              value={draft.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="For example, each or per table"
            />
          </label>
          <label className="text-sm">
            Suggested quantity
            <select
              className={field}
              value={draft.qtyRule}
              onChange={(e) => set("qtyRule", e.target.value)}
            >
              {QTY_RULES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Notice needed (days)
            <input
              inputMode="numeric"
              className={field}
              value={draft.leadTimeDays}
              onChange={(e) =>
                set("leadTimeDays", e.target.value.replace(/^0+(?=\d)/, ""))
              }
              placeholder="No minimum set"
            />
          </label>
          <label className="text-sm">
            Stock type
            <select
              className={field}
              value={limited ? "limited" : "made"}
              onChange={(e) => setLimited(e.target.value === "limited")}
            >
              <option value="limited">Limited daily stock</option>
              <option value="made">Made to order / not stock limited</option>
            </select>
          </label>
          {limited && (
            <label className="text-sm">
              Units available per day
              <input
                required
                inputMode="numeric"
                className={field}
                value={draft.capacity}
                onChange={(e) =>
                  set("capacity", e.target.value.replace(/^0+(?=\d)/, ""))
                }
                placeholder="For example, 120"
              />
            </label>
          )}
        </div>
        <label className="block text-sm">
          Description (up to 500 characters)
          <textarea
            className={field}
            maxLength={500}
            rows={3}
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </label>
        <details className="border-t border-sand pt-4">
          <summary className="cursor-pointer text-sm font-medium">
            Dimensions, hire conditions and styles (optional)
          </summary>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {[
              ["dimensions", "Dimensions"],
              ["material", "Material / finish"],
              ["hireUnits", "What the hire includes"],
              ["deliveryTerms", "Delivery or setup notes for this product"],
              ["damageTerms", "Damage or return notes for this product"],
            ].map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <textarea
                  maxLength={
                    ["deliveryTerms", "damageTerms"].includes(key) ? 1500 : 200
                  }
                  rows={2}
                  className={field}
                  value={draft.details[key as keyof typeof draft.details]}
                  onChange={(e) =>
                    set("details", { ...draft.details, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm">Suited to these styles</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {STYLES.map((s) => (
                <label
                  key={s.id}
                  className="flex min-h-11 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={draft.styles.includes(s.id)}
                    onChange={(e) =>
                      set(
                        "styles",
                        e.target.checked
                          ? [...draft.styles, s.id]
                          : draft.styles.filter((x) => x !== s.id),
                      )
                    }
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
        </details>
      </fieldset>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-blush/30 p-4 text-sm">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <button
          disabled={busy}
          className="min-h-11 rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-50"
        >
          {busy ? "Saving…" : isNew ? "Save draft product" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 text-sm underline"
        >
          Cancel
        </button>
      </div>
      <p className="mt-3 text-sm text-ink/60">
        {isNew
          ? "Saved as a private draft. Add photos, then submit your range for review."
          : "Product changes need review. Submitted requests keep their recorded prices."}
      </p>
    </form>
  );
}
