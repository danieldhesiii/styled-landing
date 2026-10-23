import { calendarHealth } from "./calendar-health";

export const SUPPLIER_REPLY_OVERDUE_MS = 48 * 60 * 60 * 1000;
export type AttentionKind =
  | "application"
  | "venue_draft"
  | "supplier_reply"
  | "calendar"
  | "venue_request";
export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  nextActor: string;
  timestamp: string | null;
  timestampLabel: string;
  href: string;
  action: string;
}
export interface AttentionSource {
  applications: {
    id: string;
    business_name: string;
    status: string;
    created_at: string;
  }[];
  drafts: {
    venue_id: string;
    status: string;
    updated_at: string;
    venue_listings: { name: string } | null;
  }[];
  replies: {
    id: string;
    order_id: string;
    supplier_id: string | null;
    supplier_name: string;
    supplier_status: string;
    created_at: string;
    orders: { reference: string; status: string; updated_at: string } | null;
  }[];
  questions?: {
    id: string;
    venue_id: string;
    request_kind: string;
    status: string;
    next_actor: string | null;
    created_at: string;
    venue_listings: { name: string } | null;
    venue_request_messages: { created_at: string }[];
  }[];
  calendars: {
    id: string;
    name: string;
    active: boolean;
    ical_url: string | null;
    ical_synced_at: string | null;
  }[];
}

// Pure projection. No private contacts, feed URLs, or draft payloads leave this
// helper. Ages use recorded request creation, not an invented reminder/SLA clock.
export function buildStaffAttention(
  source: AttentionSource,
  now = Date.now(),
): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const a of source.applications) {
    if (!["new", "reviewing"].includes(a.status)) continue;
    items.push({
      id: `application:${a.id}`,
      kind: "application",
      title: a.business_name,
      detail:
        a.status === "new"
          ? "Application awaiting first review"
          : "Application review in progress",
      nextActor: "Styled staff",
      timestamp: a.created_at,
      timestampLabel: "Received (review update time not recorded)",
      href: "/admin/vendors",
      action: "Review applications",
    });
  }
  for (const d of source.drafts) {
    if (!["draft", "submitted"].includes(d.status)) continue;
    const submitted = d.status === "submitted";
    items.push({
      id: `venue:${d.venue_id}`,
      kind: "venue_draft",
      title: d.venue_listings?.name || "Venue listing",
      detail: submitted
        ? "Submitted listing awaiting staff review"
        : "Private draft; owner has not submitted it",
      nextActor: submitted ? "Styled staff" : "Venue owner",
      timestamp: d.updated_at,
      timestampLabel: "Draft updated",
      href: `/admin/venues/${encodeURIComponent(d.venue_id)}/enquiries`,
      action: submitted ? "Review venue draft" : "Check draft progress",
    });
  }
  const grouped = new Map<string, AttentionSource["replies"]>();
  for (const line of source.replies) {
    if (
      line.supplier_status !== "pending" ||
      line.orders?.status !== "requested" ||
      !Number.isFinite(Date.parse(line.created_at)) ||
      now - Date.parse(line.created_at) < SUPPLIER_REPLY_OVERDUE_MS
    )
      continue;
    const key = `${line.order_id}:${line.supplier_id ?? line.supplier_name}`;
    grouped.set(key, [...(grouped.get(key) ?? []), line]);
  }
  for (const [key, lines] of grouped) {
    const l = lines[0];
    items.push({
      id: `reply:${key}`,
      kind: "supplier_reply",
      title: `${l.orders!.reference} · ${l.supplier_name}`,
      detail: `${lines.length} pending item${lines.length === 1 ? "" : "s"} on a request at least 48 hours old. Staff to follow up manually.`,
      nextActor: "Supplier reply; Styled staff to follow up",
      timestamp: l.orders!.updated_at,
      timestampLabel: "Order updated",
      href: `/admin/orders/${encodeURIComponent(l.order_id)}`,
      action: "Review supplier reply",
    });
  }
  for (const c of source.calendars) {
    const health = calendarHealth(!!c.ical_url, c.ical_synced_at, now);
    if (!c.active || !["stale", "never_synced"].includes(health)) continue;
    items.push({
      id: `calendar:${c.id}`,
      kind: "calendar",
      title: c.name,
      detail:
        health === "stale"
          ? "Last successful calendar sync is at least 48 hours old. Ask supplier to sync or block dates manually."
          : "Connected calendar has no valid successful sync time. Ask supplier to retry or check the feed.",
      nextActor: "Supplier; Styled staff to follow up",
      timestamp: c.ical_synced_at,
      timestampLabel: "Last successful sync",
      href: `/admin/suppliers/${encodeURIComponent(c.id)}`,
      action: "Review supplier",
    });
  }
  for (const request of source.questions || []) {
    if (
      (request.next_actor !== "venue" &&
        !(request.next_actor == null && request.status === "new")) ||
      request.status === "cancelled"
    )
      continue;
    const latest =
      request.venue_request_messages?.[0]?.created_at || request.created_at;
    items.push({
      id: `question:${request.id}`,
      kind: "venue_request",
      title: request.venue_listings?.name || "Venue request",
      detail: `Customer ${request.request_kind === "viewing" ? "viewing" : "booking"} request or message awaiting the venue team. Follow up manually.`,
      nextActor: "Venue team; Styled staff can follow up",
      timestamp: latest,
      timestampLabel: "Latest request activity",
      href: `/admin/venues/${encodeURIComponent(request.venue_id)}/enquiries`,
      action: "Review venue request",
    });
  }
  return items.sort(
    (a, b) =>
      (a.timestamp ? Date.parse(a.timestamp) : 0) -
        (b.timestamp ? Date.parse(b.timestamp) : 0) || a.id.localeCompare(b.id),
  );
}
