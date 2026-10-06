import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { env } from "@/lib/server/env";
import { getStyle } from "@/lib/styles";
import { STYLES } from "@/lib/styles";
import { cleanBrief } from "@/lib/server/render-prompt";

// POST /api/improve-prompt
//
// Takes the couple's rough description of the look they want and rewrites it
// into a clearer, more vivid styling brief for the image model — more colours,
// florals, materials, lighting and layout, without inventing a completely
// different wedding. Used by the "Improve" button in the studio before they
// generate. Falls back to returning their text unchanged if no key is set.

export const maxDuration = 30;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { prompt?: unknown; styleId?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const brief = cleanBrief(body.prompt);
  if (!brief) return fail(422, "Write a few words about the look you want first.");

  const styleId = typeof body.styleId === "string" ? body.styleId : "";
  const styleName =
    styleId && styleId !== "none" && STYLES.some((s) => s.id === styleId)
      ? getStyle(styleId).name
      : null;

  // No key configured (local dev) — hand the text back unchanged so the button
  // still "works" without erroring.
  if (!env.openaiApiKeyIfSet) {
    return NextResponse.json({ ok: true, prompt: brief, changed: false });
  }

  const system =
    "You help couples describe how they want their wedding reception room to look. " +
    "Rewrite the user's note into one vivid, concrete styling brief for an image generator. " +
    "Keep their actual intent, colours and ideas — expand and clarify, never replace them with a different wedding. " +
    "Mention colour palette, flowers/greenery, table layout, linen, lighting and any focal points, but only build on what they implied. " +
    "British English. 2–4 sentences, no lists, no preamble, no quotes — just the description.";
  const user = styleName
    ? `They are starting from our "${styleName}" style. Their note: ${brief}`
    : `Their note: ${brief}`;

  try {
    const res = await fetch(`${env.openaiBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.textModel,
        temperature: 0.7,
        max_tokens: 220,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      console.error("[improve-prompt] model error", res.status, await res.text().catch(() => ""));
      // Non-fatal: give them back their own text so the flow isn't blocked.
      return NextResponse.json({ ok: true, prompt: brief, changed: false });
    }

    const json = await res.json().catch(() => null);
    const improved = cleanBrief(json?.choices?.[0]?.message?.content);
    if (!improved) return NextResponse.json({ ok: true, prompt: brief, changed: false });

    return NextResponse.json({ ok: true, prompt: improved, changed: improved !== brief });
  } catch (err) {
    console.error("[improve-prompt] request failed", err);
    return NextResponse.json({ ok: true, prompt: brief, changed: false });
  }
}
