import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/server/env";

// Transactional email, and the supplier "you have an order to confirm" notice.
//
// Sending goes through Resend's REST API (no SDK dependency — just fetch). If
// RESEND_API_KEY isn't set, emails are logged instead of sent, so local dev,
// previews and the demo-order script never fail on a missing provider. Nothing
// here is allowed to throw into the caller: a notification must never break an
// order.

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Email {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<boolean> {
  const to = [...new Set(email.to.map((e) => e.trim()).filter(Boolean))];
  if (to.length === 0) return false;

  const key = env.resendApiKeyIfSet;
  if (!key) {
    // No provider configured: log so the flow is visible in dev without sending.
    console.log(`[notify] (not sent — no RESEND_API_KEY) to=${to.join(",")} subject="${email.subject}"`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.notifyFromEmail, to, subject: email.subject, html: email.html, text: email.text }),
    });
    if (!res.ok) {
      console.error(`[notify] Resend ${res.status}:`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] send failed:", err);
    return false;
  }
}

const longDate = (day: string | null) =>
  day ? new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "a date to confirm";

const shell = (inner: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2622">${inner}<p style="color:#8a8277;font-size:13px">— Styled</p></div>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#2b2622;color:#faf6f0;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">${label}</a></p>`;

// Tell the couple when a stylist confirms, declines or cancels their order. Best
// effort: never throws into the caller. The couple's email and the stylist's
// message come from the order itself; no internal fields are included.
export async function notifyCoupleOfDecision(admin: SupabaseClient, orderId: string, status: "confirmed" | "declined" | "cancelled"): Promise<void> {
  try {
    const { data: order } = await admin
      .from("orders")
      .select("reference, couple_name, email, wedding_date, couple_message")
      .eq("id", orderId)
      .maybeSingle();
    if (!order?.email) return;

    const ref = order.reference as string;
    const name = (order.couple_name as string | null)?.split(" ")[0] || "there";
    const date = longDate(order.wedding_date as string | null);
    const message = (order.couple_message as string | null) ?? null;
    const orderUrl = `${env.siteUrl}/order?ref=${encodeURIComponent(ref)}`;

    const copy: Record<typeof status, { subject: string; lead: string; cta: string }> = {
      confirmed: {
        subject: `Your Styled order is confirmed — ${ref}`,
        lead: `Great news — every supplier has confirmed your order for <strong>${escapeHtml(date)}</strong>. The next step is your deposit to secure the date.`,
        cta: "View your order & pay your deposit",
      },
      declined: {
        subject: `An update on your Styled order — ${ref}`,
        lead: `We're sorry — we weren't able to confirm your order for <strong>${escapeHtml(date)}</strong>.`,
        cta: "View your order",
      },
      cancelled: {
        subject: `Your Styled order has been cancelled — ${ref}`,
        lead: `Your order for <strong>${escapeHtml(date)}</strong> has been cancelled.`,
        cta: "View your order",
      },
    };
    const c = copy[status];

    const messageHtml = message ? `<p style="background:#f4efe8;border-radius:12px;padding:12px 16px">${escapeHtml(message)}</p>` : "";
    const html = shell(
      `<p style="font-size:20px;font-weight:600">${escapeHtml(c.subject.split(" — ")[0])}</p>` +
      `<p>Hi ${escapeHtml(name)},</p><p>${c.lead}</p>${messageHtml}${button(orderUrl, c.cta)}` +
      `<p style="color:#8a8277;font-size:13px">Order reference: ${escapeHtml(ref)}</p>`
    );
    const text = [
      `Hi ${name},`,
      ``,
      c.lead.replace(/<[^>]+>/g, ""),
      ...(message ? [``, message] : []),
      ``,
      `${c.cta}: ${orderUrl}`,
      `Order reference: ${ref}`,
      `— Styled`,
    ].join("\n");

    await sendEmail({ to: [order.email as string], subject: c.subject, html, text });
  } catch (err) {
    console.error("[notify] notifyCoupleOfDecision failed:", err);
  }
}

// Email every supplier on a new order the lines they need to confirm. Best
// effort: resolves recipients (the supplier's contact email plus any portal
// logins), sends one email per supplier, and swallows all errors.
export async function notifySuppliersOfOrder(admin: SupabaseClient, orderId: string): Promise<void> {
  try {
    const { data: order } = await admin
      .from("orders")
      .select("reference, wedding_date, venue_label")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    const { data: lines } = await admin
      .from("order_lines")
      .select("supplier_id, product_name, quantity, unit")
      .eq("order_id", orderId);
    if (!lines || lines.length === 0) return;

    // Group lines by supplier.
    const bySupplier = new Map<string, { name: string; quantity: number; unit: string | null }[]>();
    for (const l of lines) {
      if (!l.supplier_id) continue;
      const list = bySupplier.get(l.supplier_id as string) ?? [];
      list.push({ name: l.product_name as string, quantity: l.quantity as number, unit: l.unit as string | null });
      bySupplier.set(l.supplier_id as string, list);
    }
    if (bySupplier.size === 0) return;

    const supplierIds = [...bySupplier.keys()];

    // Recipient emails: the supplier's business contact + any portal logins.
    const { data: suppliers } = await admin.from("suppliers").select("id, name, contact_email").in("id", supplierIds);
    const supplierById = new Map((suppliers ?? []).map((s) => [s.id as string, s]));

    const { data: links } = await admin.from("supplier_users").select("supplier_id, user_id").in("supplier_id", supplierIds);
    const userIds = [...new Set((links ?? []).map((l) => l.user_id as string))];
    const emailByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of list?.users ?? []) if (u.email) emailByUser.set(u.id, u.email);
    }
    const loginEmails = new Map<string, string[]>();
    for (const l of links ?? []) {
      const e = emailByUser.get(l.user_id as string);
      if (!e) continue;
      const arr = loginEmails.get(l.supplier_id as string) ?? [];
      arr.push(e);
      loginEmails.set(l.supplier_id as string, arr);
    }

    const portalUrl = `${env.siteUrl}/portal`;
    const date = longDate(order.wedding_date as string | null);
    const venue = (order.venue_label as string | null) ?? null;

    const sends: Promise<boolean>[] = [];
    for (const [supplierId, items] of bySupplier) {
      const supplier = supplierById.get(supplierId);
      const to = [...(supplier?.contact_email ? [supplier.contact_email as string] : []), ...(loginEmails.get(supplierId) ?? [])];
      if (to.length === 0) continue; // nobody to tell yet — staff can relay from admin

      const itemLines = items.map((i) => `${i.quantity} × ${i.name}${i.unit ? ` (${i.unit})` : ""}`);
      const count = items.length;
      const subject = `New Styled order to confirm — ${order.reference}`;

      const text = [
        `Hi ${supplier?.name ?? "there"},`,
        ``,
        `You have ${count} item${count === 1 ? "" : "s"} to confirm for a wedding on ${date}${venue ? ` at ${venue}` : ""}.`,
        ``,
        ...itemLines.map((l) => `  • ${l}`),
        ``,
        `Confirm or decline in your supplier portal:`,
        portalUrl,
        ``,
        `Order reference: ${order.reference}`,
        `— Styled`,
      ].join("\n");

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2622">
          <p style="font-size:20px;font-weight:600">New order to confirm</p>
          <p>Hi ${escapeHtml(supplier?.name ?? "there")},</p>
          <p>You have <strong>${count} item${count === 1 ? "" : "s"}</strong> to confirm for a wedding on
             <strong>${escapeHtml(date)}</strong>${venue ? ` at <strong>${escapeHtml(venue)}</strong>` : ""}.</p>
          <ul>${itemLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
          <p style="margin:24px 0">
            <a href="${portalUrl}" style="background:#2b2622;color:#faf6f0;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">
              Confirm in your portal
            </a>
          </p>
          <p style="color:#8a8277;font-size:13px">Order reference: ${escapeHtml(order.reference as string)}</p>
          <p style="color:#8a8277;font-size:13px">— Styled</p>
        </div>`;

      sends.push(sendEmail({ to, subject, html, text }));
    }
    await Promise.all(sends);
  } catch (err) {
    console.error("[notify] notifySuppliersOfOrder failed:", err);
  }
}
