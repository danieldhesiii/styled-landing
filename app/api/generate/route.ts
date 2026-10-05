import { NextResponse } from "next/server";

// Placeholder for the AI render engine.
//
// When wired up, this route will take the couple's venue photo(s) + chosen style
// + their natural-language brief ("a stage here, round tables down the middle")
// and return a photoreal render of their room styled with the selected catalogue
// items. For now it echoes back the style's illustrative render so the UI flow is
// complete and the integration point is clearly defined.
//
// Multi-angle merge: the plan is to accept several photos of the same room and
// composite them into one wide base plate before styling. That stitching step
// will live here too, behind the same request.

interface GenerateRequest {
  prompt?: string;
  styleId?: string;
  venueId?: string;
  images?: string[]; // data URLs of uploaded venue photos (one or many angles)
}

const STYLE_RENDER: Record<string, string> = {
  garden_romance: "/img/renders/garden_romance.jpg",
  classic_elegance: "/img/renders/classic_elegance.jpg",
  modern_minimal: "/img/renders/modern_minimal.jpg",
  rustic_barn: "/img/renders/rustic_barn.jpg",
};

export async function POST(req: Request) {
  let body: GenerateRequest = {};
  try {
    body = await req.json();
  } catch {
    // ignore — treat as empty brief
  }

  const styleId = body.styleId ?? "garden_romance";
  const imageUrl = STYLE_RENDER[styleId] ?? STYLE_RENDER.garden_romance;

  return NextResponse.json({
    ok: true,
    pending: true,
    imageUrl,
    message:
      "Render engine not connected yet. Showing an illustrative look for now — your brief has been captured and will drive a real render once generation is live.",
    echo: {
      prompt: body.prompt ?? "",
      styleId,
      venueId: body.venueId ?? null,
      imageCount: body.images?.length ?? 0,
    },
  });
}
