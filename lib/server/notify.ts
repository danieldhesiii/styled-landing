import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/server/env";

// Transactional email, and the supplier "you have an order to confirm" notice.
//
// Sending uses Brevo, with Resend supported as a fallback. Without a provider
// key, emails are logged instead of sent, so local development,
// previews and the demo-order script never fail on a missing provider. Nothing
// here is allowed to throw into the caller: a notification must never break an
// order.

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

interface Email {
  replyTo?: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<boolean> {
  const to = [...new Set(email.to.map((e) => e.trim()).filter(Boolean))];
  if (to.length === 0) return false;

  const replyTo = email.replyTo || env.notifyReplyToEmailIfSet;
  const key = env.resendApiKeyIfSet;
  const brevoKey = env.brevoApiKeyIfSet;
  if (!key && !brevoKey) {
    // No provider configured: log so the flow is visible in dev without sending.
    console.log(
      `[notify] (not sent: no transactional email provider configured) to=${to.join(",")} subject="${email.subject}"`,
    );
    return false;
  }

  try {
    if (brevoKey) {
      const match = env.notifyFromEmail.match(/^(.*?)\s*<([^>]+)>$/);
      const sender = match
        ? { name: match[1].trim(), email: match[2].trim() }
        : { name: "Styled", email: env.notifyFromEmail.trim() };
      if (sender.email.endsWith("@resend.dev")) {
        console.error(
          "[notify] Configure a verified Brevo sender in NOTIFY_FROM_EMAIL.",
        );
        return false;
      }
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "api-key": brevoKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender,
          to: to.map((email) => ({ email })),
          subject: email.subject,
          htmlContent: email.html,
          textContent: email.text,
          ...(replyTo
            ? { replyTo: { email: replyTo } }
            : {}),
        }),
      });
      if (!response.ok) {
        console.error(`[notify] Brevo returned ${response.status}`);
        return false;
      }
      return true;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.notifyFromEmail,
        ...(replyTo
          ? { reply_to: replyTo }
          : {}),
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!res.ok) {
      console.error(
        `[notify] Resend ${res.status}:`,
        await res.text().catch(() => ""),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] send failed:", err);
    return false;
  }
}

const longDate = (day: string | null) =>
  day
    ? new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "a date to confirm";

const shell = (inner: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2622">${inner}<p style="color:#8a8277;font-size:13px">Styled</p></div>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#2b2622;color:#faf6f0;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">${label}</a></p>`;

// Tell the couple when a stylist confirms, declines or cancels their order. Best
// effort: never throws into the caller. The couple's email and the stylist's
// message come from the order itself; no internal fields are included.
export async function notifyCoupleOfDecision(
  admin: SupabaseClient,
  orderId: string,
  status: "confirmed" | "declined" | "cancelled" | "update",
): Promise<void> {
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

    const copy: Record<
      typeof status,
      { subject: string; lead: string; cta: string }
    > = {
      confirmed: {
        subject: `Your Styled order is confirmed: ${ref}`,
        lead: `Great news! Every supplier has confirmed your order for <strong>${escapeHtml(date)}</strong>. Styled will contact you about the agreed payment and delivery arrangements.`,
        cta: "View your order",
      },
      declined: {
        subject: `An update on your Styled order: ${ref}`,
        lead: `We're sorry, we weren't able to confirm your order for <strong>${escapeHtml(date)}</strong>.`,
        cta: "View your order",
      },
      update: {
        subject: `An update on your Styled request: ${ref}`,
        lead: `Styled has an update about your request for <strong>${escapeHtml(date)}</strong>. Please read the message below, including any alternative dates suggested by your suppliers.`,
        cta: "View your request",
      },
      cancelled: {
        subject: `Your Styled order has been cancelled: ${ref}`,
        lead: `Your order for <strong>${escapeHtml(date)}</strong> has been cancelled.`,
        cta: "View your order",
      },
    };
    const c = copy[status];

    const messageHtml = message
      ? `<p style="background:#f4efe8;border-radius:12px;padding:12px 16px">${escapeHtml(message)}</p>`
      : "";
    const html = shell(
      `<p style="font-size:20px;font-weight:600">${escapeHtml(c.subject.split(": ")[0])}</p>` +
        `<p>Hi ${escapeHtml(name)},</p><p>${c.lead}</p>${messageHtml}${button(orderUrl, c.cta)}` +
        `<p style="color:#8a8277;font-size:13px">Order reference: ${escapeHtml(ref)}</p>`,
    );
    const text = [
      `Hi ${name},`,
      ``,
      c.lead.replace(/<[^>]+>/g, ""),
      ...(message ? [``, message] : []),
      ``,
      `${c.cta}: ${orderUrl}`,
      `Order reference: ${ref}`,
      `Styled`,
    ].join("\n");

    await sendEmail({
      to: [order.email as string],
      subject: c.subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[notify] notifyCoupleOfDecision failed:", err);
  }
}

// Email every supplier on a new order the lines they need to confirm. Best
// effort: resolves recipients (the supplier's contact email plus any portal
// logins), sends one email per supplier, and swallows all errors.
export async function notifySuppliersOfOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<void> {
  try {
    const { data: order } = await admin
      .from("orders")
      .select("reference, wedding_date, venue_label")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    const { data: lines } = await admin
      .from("order_lines")
      .select("supplier_id, product_name, quantity, unit, needed_date, return_date")
      .eq("order_id", orderId);
    if (!lines || lines.length === 0) return;

    // One message per supplier, with the requested dates on every item.
    const bySupplier = new Map<
      string,
      {
        items: { name: string; quantity: number; unit: string | null; start: string | null; end: string | null }[];
      }
    >();
    for (const l of lines) {
      if (!l.supplier_id) continue;
      const group = bySupplier.get(l.supplier_id as string) ?? {
        items: [],
      };
      group.items.push({
        name: l.product_name as string,
        quantity: l.quantity as number,
        unit: l.unit as string | null,
        start: (l.needed_date as string | null) ?? (order.wedding_date as string | null),
        end: (l.return_date as string | null) ?? (order.wedding_date as string | null),
      });
      bySupplier.set(l.supplier_id as string, group);
    }
    if (bySupplier.size === 0) return;

    const supplierIds = [...bySupplier.keys()];

    // Recipient emails: the supplier's business contact + any portal logins.
    const { data: suppliers } = await admin
      .from("suppliers")
      .select("id, name, contact_email")
      .in("id", supplierIds);
    const supplierById = new Map(
      (suppliers ?? []).map((s) => [s.id as string, s]),
    );

    const { data: links } = await admin
      .from("supplier_users")
      .select("supplier_id, user_id")
      .in("supplier_id", supplierIds);
    const userIds = [...new Set((links ?? []).map((l) => l.user_id as string))];
    const emailByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: list } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of list?.users ?? [])
        if (u.email) emailByUser.set(u.id, u.email);
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
    const weddingDate = longDate(order.wedding_date as string | null);
    const venue = (order.venue_label as string | null) ?? null;

    const sends: Promise<boolean>[] = [];
    for (const [supplierId, group] of bySupplier) {
      const supplier = supplierById.get(supplierId);
      const to = [
        ...(supplier?.contact_email ? [supplier.contact_email as string] : []),
        ...(loginEmails.get(supplierId) ?? []),
      ];
      if (to.length === 0) continue; // nobody to tell yet — staff can relay from admin

      const items = group.items;
      const itemLines = items.map(
        (i) => `${i.quantity} × ${i.name}${i.unit ? ` (${i.unit})` : ""}: delivery / supplier pickup ${longDate(i.start)}; return / supplier collection ${longDate(i.end)}`,
      );
      const count = items.length;
      const subject = `New Styled order to confirm: ${order.reference}`;

      const text = [
        `Hi ${supplier?.name ?? "there"},`,
        ``,
        `You have ${count} item${count === 1 ? "" : "s"} to confirm for the hire dates listed below (wedding ${weddingDate})${venue ? ` at ${venue}` : ""}.`,
        ``,
        ...itemLines.map((l) => `  • ${l}`),
        ``,
        `Please reply to this email with availability for each item’s full requested hire period. If you cannot fulfil them, suggest your nearest available dates or suitable alternatives and include this order reference.`,
        `Styled will review your reply manually before confirming anything to the couple. You do not need a stock-management system to reply.`,
        `If you already use the supplier portal, you can also record your decision there:`,
        portalUrl,
        ``,
        `Order reference: ${order.reference}`,
        `Styled`,
      ].join("\n");

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2622">
          <p style="font-size:20px;font-weight:600">New order to confirm</p>
          <p>Hi ${escapeHtml(supplier?.name ?? "there")},</p>
          <p>You have <strong>${count} item${count === 1 ? "" : "s"}</strong> to confirm for the hire dates listed below. Wedding: ${escapeHtml(weddingDate)}${venue ? ` at <strong>${escapeHtml(venue)}</strong>` : ""}.</p>
          <ul>${itemLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
          <p>Please reply to this email to confirm product availability for each item’s full requested hire period. If you cannot fulfil them, suggest your nearest available dates or suitable alternatives and include the order reference.</p>
          <p>Styled will review your reply manually before confirming anything to the couple. You do not need a stock-management system to reply. If you already have portal access, you can also record your decision below.</p>
          <p style="margin:24px 0">
            <a href="${portalUrl}" style="background:#2b2622;color:#faf6f0;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">
              Confirm in your portal
            </a>
          </p>
          <p style="color:#8a8277;font-size:13px">Order reference: ${escapeHtml(order.reference as string)}</p>
          <p style="color:#8a8277;font-size:13px">Styled</p>
        </div>`;

      sends.push(sendEmail({ to, subject, html, text }));
    }
    await Promise.all(sends);
  } catch (err) {
    console.error("[notify] notifySuppliersOfOrder failed:", err);
  }
}

// Notify existing Styled staff only. This creates a review task, never a booking
// or payment. Exact addresses are resolved from existing staff memberships.
export async function notifyStaffOfOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<boolean> {
  try {
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("reference,couple_name,wedding_date,venue_label")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError || !order) return false;
    const { data: staff, error: staffError } = await admin
      .from("staff")
      .select("user_id");
    if (staffError || !staff?.length) return false;
    const users = await Promise.all(
      staff.map((s) => admin.auth.admin.getUserById(s.user_id)),
    );
    const to = users.flatMap((r) =>
      r.data.user?.email ? [r.data.user.email] : [],
    );
    const { data: lines, error: lineError } = await admin
      .from("order_lines")
      .select("product_name,supplier_name,quantity,needed_date,return_date")
      .eq("order_id", orderId);
    if (lineError) return false;
    const url = `${env.siteUrl}/admin/orders/${encodeURIComponent(orderId)}`;
    const details = (lines || []).map(
      (l) =>
        `${l.quantity} × ${l.product_name} (${l.supplier_name}), delivery ${longDate(l.needed_date)}, return / collection ${longDate(l.return_date ?? order.wedding_date)}`,
    );
    const intro = `New request ${order.reference} from ${order.couple_name}. Wedding: ${longDate(order.wedding_date)}. Venue: ${order.venue_label || "To confirm"}.`;
    return await sendEmail({
      to,
      subject: `Manual review needed: ${order.reference}`,
      text: [
        intro,
        "",
        ...details,
        "",
        "Check supplier availability for each item’s complete requested hire period. If unavailable, ask for alternatives before confirming. No payment has been collected.",
        url,
        "Styled",
      ].join("\n"),
      html: shell(
        `<p>${escapeHtml(intro)}</p><ul>${details.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul><p>Check supplier availability and dates manually. Ask for alternatives if needed. No payment has been collected.</p>${button(url, "Review order request")}`,
      ),
    });
  } catch (err) {
    console.error("[notify] staff review notice failed", err);
    return false;
  }
}
