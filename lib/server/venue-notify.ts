import { createAdminClient } from "@/lib/supabase/admin";
import { bookingEmailEnabled } from "./booking-notifications";
import { dispatchVenueConversationNotifications } from "./venue-conversation-notifications";
import { sendEmail } from "./notify";
import { env } from "./env";
const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export async function notifyVenueRequest(id: string, kind: "new" | "response") {
  try {
    if (!bookingEmailEnabled()) return;
    const admin = createAdminClient();
    // Responses are transactionally queued by venue_request_messages. Never
    // send the legacy response body/address or create a second response notice.
    if (kind === "response") {
      await dispatchVenueConversationNotifications(admin, id);
      return;
    }
    const { data: r, error } = await admin
      .from("venue_enquiries")
      .select(
        "id,venue_id,owner_user_id,name,preferred_date,booking_start,booking_end,request_kind,status",
      )
      .eq("id", id)
      .single();
    if (error || !r) return;
    const { data: v } = await admin
      .from("venue_listings")
      .select("name")
      .eq("id", r.venue_id)
      .single();
    const requestedDates = r.request_kind === "booking" ? `${r.booking_start || r.preferred_date} to ${r.booking_end || r.preferred_date} (wedding ${r.preferred_date})` : r.preferred_date;
    const subject = `Styled: your ${r.request_kind} request for ${v?.name || "your venue"}`;
    const text = `We received your venue request. Sign in to review it: ${env.siteUrl}/venues/requests. This does not reserve a date and no payment has been taken.`;
    const owner = r.owner_user_id ? await admin.auth.admin.getUserById(r.owner_user_id) : null;
    if (owner?.data.user?.email_confirmed_at && !owner.data.user.is_anonymous && owner.data.user.email) {
    await sendEmail({
      to: [owner.data.user.email],
      subject: subject.replace(/[\r\n]/g, " "),
      text,
      html: `<div style="font-family:Arial;max-width:580px;line-height:1.6">${escape(text).replace(/\n/g, "<br>")}</div>`,
    });
    }
    if (kind === "new") {
      const [{ data: links }, { data: staff }] = await Promise.all([
        admin.from("venue_users").select("user_id").eq("venue_id", r.venue_id),
        admin.from("staff").select("user_id"),
      ]);
      const ids = [
        ...new Set(
          [...(links || []), ...(staff || [])].map((x) => x.user_id as string),
        ),
      ];
      const users = await Promise.all(
        ids.map((u) => admin.auth.admin.getUserById(u)),
      );
      const to = users.flatMap((u) =>
        !u.error && u.data.user?.email_confirmed_at && !u.data.user.is_anonymous && u.data.user.email ? [u.data.user.email] : [],
      );
      const notice = `New ${r.request_kind} request for ${v?.name || "your venue"}, ${requestedDates}. Review and respond in your venue dashboard: ${env.siteUrl}/venue-portal. Styled staff can also review it in the admin venue area. No payment has been taken.`;
      await sendEmail({
        to,
        subject: "New Styled venue request to review",
        text: notice,
        html: `<p>${escape(notice)}</p>`,
      });
    }
  } catch (e) {
    console.error("[venue notification]", e);
  }
}
