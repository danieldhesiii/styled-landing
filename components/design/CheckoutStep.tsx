"use client";

import { useMemo, useState } from "react";
import type { BasketLine } from "@/lib/types";
import { buildQuote, formatGBP } from "@/lib/quote";

interface Props {
  basket: BasketLine[];
  weddingDate: string;
  onBack: () => void;
}

export default function CheckoutStep({ basket, weddingDate, onBack }: Props) {
  const quote = useMemo(() => buildQuote(basket), [basket]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15 text-2xl">
          ✓
        </div>
        <h1 className="mt-6 font-serif text-3xl text-ink">Your date is being secured.</h1>
        <p className="mt-3 text-ink/60">
          A stylist will confirm availability with each of your {quote.bySupplier.length}{" "}
          suppliers and email {email || "you"} within one working day. Nothing is
          charged until every piece is confirmed for your date.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-8 rounded-full border border-ink/20 px-6 py-3 text-sm text-ink hover:border-ink/40"
        >
          Back to your design
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-10">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-ink/50 hover:text-ink"
      >
        ← Back to your design
      </button>
      <h1 className="mt-4 font-serif text-4xl text-ink">Reserve your design.</h1>
      <p className="mt-2 text-ink/60">
        Pay a deposit to hold every supplier for your date. The balance is due six
        weeks before the wedding.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Details form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink">Your names</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex & Sam"
              className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </div>
          {weddingDate && (
            <p className="text-sm text-ink/50">Wedding date: {weddingDate}</p>
          )}
          <div className="rounded-xl border border-dashed border-sand bg-cream/50 p-4 text-sm text-ink/50">
            Card payment is a placeholder in this preview — the deposit step will
            connect to our payment provider before launch. No card is charged.
          </div>
          <button
            type="button"
            onClick={() => setDone(true)}
            className="w-full rounded-full bg-ink px-6 py-3.5 text-cream hover:bg-ink/90"
          >
            Pay {formatGBP(quote.deposit)} deposit
          </button>
        </div>

        {/* Order summary */}
        <aside className="h-fit rounded-2xl border border-sand bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg text-ink">Order summary</h2>
          <div className="mt-4 space-y-3">
            {quote.bySupplier.map((g) => (
              <div key={g.supplier} className="flex justify-between text-sm">
                <span className="text-ink/60">{g.supplier}</span>
                <span className="text-ink">{formatGBP(g.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-sand pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink/60">Estimated total</span>
              <span className="font-serif text-lg text-ink">{formatGBP(quote.subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-ink/60">Deposit due now</span>
              <span className="text-clay">{formatGBP(quote.deposit)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
