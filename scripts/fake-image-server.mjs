// A stand-in for the image model, so the studio can be tried end to end without
// spending money on real renders.
//
//   node scripts/fake-image-server.mjs            # listens on :4010
//
// then in .env.local (restart `npm run dev` afterwards):
//
//   OPENAI_API_KEY=test-key
//   OPENAI_BASE_URL=http://localhost:4010
//
// It returns your venue photo, tinted and stamped "TEST RENDER", and prints the
// prompt the app sent. That prompt is the thing to read: it lists exactly which
// catalogue pieces the model was allowed to use. Remove both lines from
// .env.local to go back to the real model (or to placeholder mode).

import http from "node:http";
import sharp from "sharp";

const PORT = Number(process.env.PORT || 4010);

function parseMultipart(buf, contentType) {
  const boundary = "--" + /boundary=(.+)$/.exec(contentType)[1];
  const fields = {};
  const files = [];
  let i = buf.indexOf(boundary);
  while (i !== -1) {
    const j = buf.indexOf(boundary, i + boundary.length);
    if (j === -1) break;
    const part = buf.subarray(i + boundary.length + 2, j - 2);
    const split = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, split).toString();
    const body = part.subarray(split + 4);
    const name = /name="([^"]+)"/.exec(head)?.[1];
    if (name) {
      if (/filename=/.test(head)) files.push(body);
      else fields[name] = body.toString();
    }
    i = j;
  }
  return { fields, files };
}

http
  .createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      if (req.method !== "POST" || req.url !== "/v1/images/edits") {
        res.writeHead(404);
        return res.end("{}");
      }
      try {
        const { fields, files } = parseMultipart(Buffer.concat(chunks), req.headers["content-type"]);
        console.log("\n=== render request ===");
        console.log(`images received: ${files.length}  size: ${fields.size}`);
        console.log(fields.prompt);

        const [w, h] = (fields.size || "1536x1024").split("x").map(Number);
        const label = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect y="${h - 80}" width="${w}" height="80" fill="rgba(0,0,0,0.55)"/><text x="30" y="${h - 28}" font-size="36" fill="#fff" font-family="Arial">TEST RENDER - stand-in server, not the real model</text></svg>`
        );
        const out = await sharp(files[0])
          .resize(w, h, { fit: "cover" })
          .modulate({ saturation: 1.3, brightness: 1.05 })
          .tint({ r: 255, g: 228, b: 228 })
          .composite([{ input: label }])
          .jpeg()
          .toBuffer();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: [{ b64_json: out.toString("base64") }], usage: { total_tokens: 0 } }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: String(err) } }));
      }
    });
  })
  .listen(PORT, () => console.log(`Stand-in image server on http://localhost:${PORT}`));
