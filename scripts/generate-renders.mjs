// Regenerate the four style renders so they all show the SAME venue
// (public/img/venues/manor_orangery.png) restyled four different ways.
//
// Uses OpenAI's image EDIT endpoint (gpt-image-1), which restyles the
// supplied photo instead of inventing a new room, so the glass orangery
// architecture, roofline, floor and garden view stay consistent.
//
// Usage:
//   export OPENAI_API_KEY=sk-...        (your key — never committed)
//   node scripts/generate-renders.mjs
//
// Requires Node 18+ (uses built-in fetch / FormData / Blob). Tested on Node 24.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VENUE = join(ROOT, "public/img/venues/manor_orangery.png");
const OUT_DIR = join(ROOT, "public/img/renders");

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Missing OPENAI_API_KEY. Run: export OPENAI_API_KEY=sk-...");
  process.exit(1);
}

// Shared instruction: lock the architecture, only change the styling inside.
const KEEP =
  "Keep the exact same glass conservatory / orangery architecture: the vaulted glass roof and gable end, the white-painted window frames and arched windows, the pale stone tile floor, and the green garden visible through the glass. Keep the same camera angle, perspective and natural daylight. Photorealistic wedding venue photography, no text, no people.";

const THEMES = [
  {
    name: "garden_romance",
    prompt:
      "Style this glass orangery for a Garden Romance wedding reception. Round tables dressed in soft ivory linen, lush blush and white garden roses with trailing greenery centrepieces, gold chiavari chairs, delicate hanging floral installations and warm fairy lights. Romantic, soft, abundant florals. " +
      KEEP,
  },
  {
    name: "classic_elegance",
    prompt:
      "Style this glass orangery for a Classic Elegance black-tie wedding reception. Round tables with crisp floor-length white linen, tall gold candelabra centrepieces with white roses and hydrangeas, crystal glassware, elegant chair draping and a refined formal look. " +
      KEEP,
  },
  {
    name: "modern_minimal",
    prompt:
      "Style this glass orangery for a Modern Minimal wedding reception. Sleek long rectangular tables, a neutral palette of white and soft greige, low architectural greenery runners, clear acrylic ghost chairs, simple candles, uncluttered and contemporary. " +
      KEEP,
  },
  {
    name: "rustic_barn",
    prompt:
      "Style this glass orangery for a Rustic wedding reception. Long bare wooden farmhouse tables, loose wildflower and mixed-foliage runners, mismatched wooden chairs, warm Edison-bulb string lights overhead, kraft and linen details, relaxed natural charm. " +
      KEEP,
  },
];

const SIZE = "1536x1024"; // landscape, matches the preview aspect ratio
const QUALITY = process.env.RENDER_QUALITY || "high"; // low | medium | high

async function generate(theme) {
  const img = readFileSync(VENUE);
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("image", new Blob([img], { type: "image/png" }), "venue.png");
  form.append("prompt", theme.prompt);
  form.append("size", SIZE);
  form.append("quality", QUALITY);
  form.append("output_format", "jpeg");
  form.append("n", "1");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${theme.name}: ${res.status} ${text}`);
  }

  const data = await res.json();
  const b64 = data.data[0].b64_json;
  const outPath = join(OUT_DIR, `${theme.name}.jpg`);
  writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`✓ ${theme.name}.jpg`);
}

for (const theme of THEMES) {
  process.stdout.write(`Generating ${theme.name} (quality=${QUALITY})... `);
  try {
    await generate(theme);
  } catch (err) {
    console.error(`\n✗ ${err.message}`);
    process.exit(1);
  }
}

console.log("\nDone. All four renders now show the same orangery restyled.");
