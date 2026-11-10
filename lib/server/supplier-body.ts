export async function supplierJson(req: Request, limit = 20000): Promise<any> {
  if (!req.headers.get("origin") || new URL(req.headers.get("origin")!).host !== (req.headers.get("host") || new URL(req.url).host))
    throw Error("Cross-site request refused.");
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw Error("Send a valid form.");
  const reader = req.body?.getReader();
  if (!reader) throw Error("Empty form.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw Error("Form is too long.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  const b = JSON.parse(new TextDecoder().decode(all));
  if (!b || typeof b !== "object" || Array.isArray(b))
    throw Error("Invalid form.");
  return b;
}
