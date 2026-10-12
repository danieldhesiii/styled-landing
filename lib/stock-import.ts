import { VENDOR_CATEGORIES } from "./vendor-categories";
import { QTY_RULES } from "./product-options";
import { STYLES } from "./styles";

// Reading a supplier's stock list (a spreadsheet saved as CSV) into validated
// product rows. Pure: no database, no network. The server (lib/server/stock-import.ts)
// matches rows to existing products and applies them; the UI uses TEMPLATE_CSV
// and the column help below.

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_CHARS = 500_000;

// The columns we understand. Only `name` is required in the file; anything not
// given for an existing product is left exactly as it is.
export const IMPORT_COLUMNS: { key: string; help: string }[] = [
  { key: "name", help: "Product name. Matches an existing product of yours by name. Needed unless you give an id." },
  { key: "category", help: "Backdrops & arches, Florals, Centrepieces, Furniture & seating, Linen & tableware, Lighting, Signage, Bar & drinks, Attire, Stationery, Cake & favours. Required for a new product." },
  { key: "price", help: "Price in pounds, e.g. 12.50. Required for a new product." },
  { key: "unit", help: "What the price is for, e.g. each, per guest, per table." },
  { key: "quantity_rule", help: "How a couple's quantity is worked out: fixed, per guest, per table, or per venue." },
  { key: "capacity", help: "How many you can supply on one day. Leave empty (or write 'made to order') if you're not limited by stock." },
  { key: "lead_time_days", help: "How many days' notice you need." },
  { key: "styles", help: "Styles it suits, separated by ; e.g. Garden Romance; Classic Elegance." },
  { key: "image", help: "Link to a photo (https://...). Optional." },
  { key: "note", help: "Short note shown to couples. Optional." },
  { key: "active", help: "yes or no: show it in the shop. Optional." },
  { key: "id", help: "Our product id, if you've exported your list from us. Optional; name is enough." },
];

export const TEMPLATE_CSV =
  "name,category,price,unit,quantity_rule,capacity,lead_time_days,styles,image,note,active\r\n" +
  'Gold Chiavari Chair,Furniture & seating,5.50,per guest,per guest,120,45,Garden Romance; Classic Elegance,,Gold frame with ivory cushion,yes\r\n' +
  "Bridal Bouquet,Florals,180,each,fixed,,90,Garden Romance,,Made to order for each bride,yes\r\n";

// ---------------------------------------------------------------- CSV reader

// RFC 4180: quoted fields (with "" for a quote, and commas/newlines inside),
// CRLF or LF, a leading byte-order mark, and a trailing blank line.
export function parseCsv(input: string, delimiter = ","): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  let sawAnything = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    sawAnything = false;
  };

  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && field === "") {
      quoted = true;
      sawAnything = true;
      i++;
    } else if (c === delimiter) {
      endField();
      sawAnything = true;
      i++;
    } else if (c === "\r") {
      i += text[i + 1] === "\n" ? 2 : 1;
      endRow();
    } else if (c === "\n") {
      i++;
      endRow();
    } else {
      field += c;
      sawAnything = true;
      i++;
    }
  }
  if (sawAnything || field !== "" || row.length > 0) endRow();
  return rows;
}

// Spreadsheets in some locales save with ; or tabs. Pick whichever the header uses.
export function detectDelimiter(text: string): string {
  const header = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [",", ";", "\t"].map((d) => [d, header.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

// ---------------------------------------------------------------- headers

const ALIASES: Record<string, string> = {
  id: "id", sku: "id", product_id: "id",
  name: "name", product: "name", product_name: "name", item: "name", item_name: "name", title: "name",
  category: "category", type: "category",
  price: "price", unit_price: "price", price_gbp: "price", price_per_unit: "price", cost: "price",
  unit: "unit", per: "unit",
  quantity_rule: "quantity_rule", qty_rule: "quantity_rule", rule: "quantity_rule", priced_per: "quantity_rule",
  capacity: "capacity", stock: "capacity", quantity: "capacity", qty: "capacity", units: "capacity",
  stock_per_day: "capacity", quantity_available: "capacity", available: "capacity",
  lead_time_days: "lead_time_days", lead_time: "lead_time_days", notice_days: "lead_time_days", notice: "lead_time_days",
  styles: "styles", style: "styles",
  image: "image", image_url: "image", photo: "image", photo_url: "image",
  note: "note", notes: "note", description: "note",
  active: "active", live: "active", visible: "active", show: "active",
};

const normaliseHeader = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// ---------------------------------------------------------------- values

const CATEGORY_BY_TEXT = new Map<string, string>();
for (const c of VENDOR_CATEGORIES) {
  CATEGORY_BY_TEXT.set(c.value, c.value);
  CATEGORY_BY_TEXT.set(simple(c.label), c.value);
}
// A few likely spellings.
for (const [k, v] of Object.entries({
  furniture: "furniture", "furniture seating": "furniture", seating: "furniture", chairs: "furniture", tables: "furniture",
  backdrops: "backdrops", arches: "backdrops", "backdrops arches": "backdrops", arch: "backdrops",
  flowers: "florals", floral: "florals", linen: "linen_tableware", tableware: "linen_tableware", "linen tableware": "linen_tableware",
  bar: "bar", "bar drinks": "bar", drinks: "bar", cake: "cake_favours", favours: "cake_favours", "cake favours": "cake_favours",
})) CATEGORY_BY_TEXT.set(k, v);

const STYLE_BY_TEXT = new Map<string, string>();
for (const s of STYLES) {
  STYLE_BY_TEXT.set(s.id, s.id);
  STYLE_BY_TEXT.set(simple(s.name), s.id);
}

const QTY_BY_TEXT = new Map<string, string>();
for (const r of QTY_RULES) {
  QTY_BY_TEXT.set(r.value, r.value);
  QTY_BY_TEXT.set(simple(r.label), r.value);
}
for (const [k, v] of Object.entries({
  "per guest": "per_guest", "per person": "per_guest", "per head": "per_guest", guest: "per_guest",
  "per table": "per_table", table: "per_table",
  "per venue": "per_venue", "one per venue": "per_venue", venue: "per_venue", "one off": "per_venue",
  fixed: "fixed", "fixed quantity": "fixed", each: "fixed",
})) QTY_BY_TEXT.set(k, v);

function simple(s: string) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\band\b/g, " ").replace(/\s+/g, " ").trim();
}

// Sensible default when the file doesn't say how quantity is worked out.
export function inferQtyRule(unit: string): string {
  const u = simple(unit);
  if (/guest|person|head|cover|setting/.test(u)) return "per_guest";
  if (/table/.test(u)) return "per_table";
  if (/venue|package|event/.test(u)) return "per_venue";
  return "fixed";
}

const clean = (s: string, max: number) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const MADE_TO_ORDER = new Set(["", "made to order", "made-to-order", "mto", "unlimited", "none", "n/a", "na", "-", "no limit", "bespoke"]);

// ---------------------------------------------------------------- rows

// What the file says about one product. A key that's absent from `fields` means
// "the file said nothing about it": leave an existing product's value alone.
export interface ImportRow {
  line: number; // line number in the file, counting the header as 1
  id?: string;
  name: string;
  nameKey: string; // normalised, for matching and duplicate detection
  fields: {
    category?: string;
    unit_price_pence?: number;
    unit?: string;
    qty_rule?: string;
    capacity?: number | null;
    lead_time_days?: number;
    styles?: string[];
    image?: string | null;
    note?: string | null;
    active?: boolean;
  };
  errors: string[];
  warnings: string[];
}

export interface ParsedImport {
  rows: ImportRow[];
  ignoredColumns: string[];
  fileErrors: string[];
}

export const nameKey = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();

function parsePence(raw: string): number | string {
  const t = raw.replace(/[£\s]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (t === "") return "Enter a price.";
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return `“${raw}” isn't a price in pounds.`;
  const n = Number(t);
  if (n > 1_000_000) return "That price is too large.";
  return Math.round(n * 100);
}

export function parseStockCsv(text: string): ParsedImport {
  const fileErrors: string[] = [];
  if (text.length > MAX_IMPORT_CHARS) {
    return { rows: [], ignoredColumns: [], fileErrors: ["That file is too large. Please split it into smaller lists."] };
  }
  const table = parseCsv(text, detectDelimiter(text)).filter((r) => r.some((c) => c.trim() !== ""));
  if (table.length === 0) return { rows: [], ignoredColumns: [], fileErrors: ["The file is empty."] };

  // Header -> canonical column names.
  const header = table[0].map((h) => ALIASES[normaliseHeader(h)] ?? null);
  const ignoredColumns = table[0].filter((_, i) => header[i] === null && table[0][i].trim() !== "").map((h) => h.trim());
  const seen = new Set<string>();
  for (const h of header) {
    if (h && seen.has(h)) fileErrors.push(`The column “${h}” appears more than once.`);
    if (h) seen.add(h);
  }
  if (!seen.has("name") && !seen.has("id")) {
    fileErrors.push("The first row needs a column called “name” with each product's name (or an “id” column).");
  }
  if (fileErrors.length) return { rows: [], ignoredColumns, fileErrors };

  const body = table.slice(1);
  if (body.length === 0) return { rows: [], ignoredColumns, fileErrors: ["The file has a header row but no products."] };
  if (body.length > MAX_IMPORT_ROWS) {
    return { rows: [], ignoredColumns, fileErrors: [`That list has ${body.length} products. The limit is ${MAX_IMPORT_ROWS} at a time.`] };
  }

  const rows: ImportRow[] = body.map((cells, idx) => {
    const get = (key: string): string | undefined => {
      const i = header.indexOf(key);
      return i === -1 ? undefined : (cells[i] ?? "").trim();
    };
    const errors: string[] = [];
    const warnings: string[] = [];
    const fields: ImportRow["fields"] = {};
    const line = idx + 2;

    const name = clean(get("name") ?? "", 160);
    const id = clean(get("id") ?? "", 80) || undefined;
    // A row can be identified by id alone (e.g. a list exported from us, edited and re-uploaded).
    if (name.length < 2 && !id) errors.push("Product name is missing.");

    const category = get("category");
    if (category !== undefined && category !== "") {
      const c = CATEGORY_BY_TEXT.get(simple(category)) ?? CATEGORY_BY_TEXT.get(category.toLowerCase());
      if (!c) errors.push(`Category “${category}” isn't one we use.`);
      else fields.category = c;
    }

    const price = get("price");
    if (price !== undefined && price !== "") {
      const p = parsePence(price);
      if (typeof p === "string") errors.push(p);
      else fields.unit_price_pence = p;
    }

    const unit = get("unit");
    if (unit !== undefined && unit !== "") fields.unit = clean(unit, 40);

    const rule = get("quantity_rule");
    if (rule !== undefined && rule !== "") {
      const r = QTY_BY_TEXT.get(simple(rule)) ?? QTY_BY_TEXT.get(rule.toLowerCase());
      if (!r) errors.push(`Quantity rule “${rule}” isn't recognised. Use fixed, per guest, per table or per venue.`);
      else fields.qty_rule = r;
    }

    const capacity = get("capacity");
    if (capacity !== undefined) {
      if (MADE_TO_ORDER.has(capacity.toLowerCase())) fields.capacity = null;
      else if (/^\d+$/.test(capacity.replace(/[,\s]/g, ""))) {
        const n = Number(capacity.replace(/[,\s]/g, ""));
        if (n > 100000) errors.push("Capacity is too large (the limit is 100,000 per day).");
        else fields.capacity = n;
      } else errors.push(`Capacity “${capacity}” should be a whole number, or empty for made to order.`);
    }

    const lead = get("lead_time_days");
    if (lead !== undefined && lead !== "") {
      if (!/^\d+$/.test(lead) || Number(lead) > 365) errors.push(`Lead time “${lead}” should be a whole number of days up to 365.`);
      else fields.lead_time_days = Number(lead);
    }

    const styles = get("styles");
    if (styles !== undefined) {
      const out: string[] = [];
      for (const part of styles.split(/[;|]/).map((s) => s.trim()).filter(Boolean)) {
        const sid = STYLE_BY_TEXT.get(simple(part)) ?? STYLE_BY_TEXT.get(part.toLowerCase());
        if (!sid) warnings.push(`Style “${part}” isn't one we use, so it was ignored.`);
        else if (!out.includes(sid)) out.push(sid);
      }
      fields.styles = out;
    }

    const image = get("image");
    if (image !== undefined) {
      if (image === "") fields.image = null;
      else if (image.length > 300) errors.push("The image link is too long.");
      else if (/^https:\/\/[^\s]+$/i.test(image) || /^\/[A-Za-z0-9_\-./]+$/.test(image)) fields.image = image;
      else errors.push("The image should be a link starting https://");
    }

    const note = get("note");
    if (note !== undefined) fields.note = note === "" ? null : clean(note, 500);

    const active = get("active");
    if (active !== undefined && active !== "") {
      const a = active.toLowerCase();
      if (["yes", "y", "true", "1", "live", "show"].includes(a)) fields.active = true;
      else if (["no", "n", "false", "0", "hidden", "hide"].includes(a)) fields.active = false;
      else errors.push(`“${active}” should be yes or no.`);
    }

    return { line, id, name, nameKey: nameKey(name), fields, errors, warnings };
  });

  return { rows, ignoredColumns, fileErrors };
}
