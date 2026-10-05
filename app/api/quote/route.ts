import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { priceBasket, publicQuote } from "@/lib/server/quote";

// POST /api/quote  { basket: [{ itemId, quantity, seenUnitPricePence? }] }
//
// The authoritative price of a basket, computed on the server from the live
// catalogue. The studio shows its own instant preview while the couple edits;
// checkout asks here so what's shown is exactly what an order would be charged.
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { basket?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  let priced;
  try {
    priced = await priceBasket(body.basket);
  } catch (err) {
    console.error("[quote]", err);
    return NextResponse.json({ ok: false, error: "Couldn't price your basket. Please try again." }, { status: 500 });
  }
  if (!priced.ok) {
    return NextResponse.json({ ok: false, error: priced.error, ...priced.extra }, { status: priced.status });
  }
  return NextResponse.json({ ok: true, quote: publicQuote(priced.quote) });
}
