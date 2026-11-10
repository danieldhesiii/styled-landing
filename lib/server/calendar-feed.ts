import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIPv4 } from "node:net";

const denied = new BlockList();
// Public IPv4 only for this importer. Pin the resolved address for the HTTPS
// connection, so a hostname cannot rebind to a local service after validation.
for (const [base, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const)
  denied.addSubnet(base, bits, "ipv4");

export function isPublicCalendarAddress(address: string) {
  return isIPv4(address) && !denied.check(address, "ipv4");
}

export function calendarFeedUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || url.hash)
    throw Error("Use a direct HTTPS calendar link without a sign-in or redirect.");
  return url;
}

export async function fetchCalendarFeed(raw: string): Promise<string> {
  const url = calendarFeedUrl(raw);
  // The overall timer also bounds DNS, connection and body reads.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const records = await Promise.race([
      lookup(url.hostname, { all: true, family: 4 }),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(Error("Calendar timeout")), { once: true })),
    ]);
    if (!records.length || records.some(r => !isPublicCalendarAddress(r.address))) throw Error("Calendar host is not public.");
    return await new Promise<string>((resolve, reject) => {
      const req = request(url, {
        method: "GET", signal: controller.signal,
        headers: { Accept: "text/calendar", "Accept-Encoding": "identity" },
        lookup: (_host, options, callback) => callback(null, options.all ? [{ address: records[0].address, family: 4 }] : records[0].address, 4),
      }, res => {
        // Redirect destinations are deliberately never followed.
        if (res.statusCode !== 200) { res.destroy(); reject(Error("Calendar link did not return a feed.")); return; }
        const max = 2 * 1024 * 1024;
        if (Number(res.headers["content-length"]) > max) { res.destroy(); reject(Error("Calendar feed is too large.")); return; }
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > max) { res.destroy(); reject(Error("Calendar feed is too large.")); }
          else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("aborted", () => reject(Error("Incomplete calendar feed.")));
        res.on("end", () => {
          try { resolve(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
          catch { reject(Error("Invalid calendar encoding.")); }
        });
      });
      req.on("error", reject);
      req.end();
    });
  } finally { clearTimeout(timer); }
}
