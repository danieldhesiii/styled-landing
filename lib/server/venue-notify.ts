import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./notify";
import { env } from "./env";
import { ENQUIRY_STATUSES } from "@/lib/venue-details";
const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export async function notifyVenueRequest(id: string, kind: "new" | "response") {
  try {
    const admin = createAdminClient();
    const { data: r, error } = await admin
      .from("venue_enquiries")
      .select(
        "id,venue_id,email,name,preferred_date,request_kind,status,response,alternative_dates",
      )
      .eq("id", id)
      .single();
    if (error || !r) return;
    const { data: v } = await admin
      .from("venue_listings")
      .select("name")
      .eq("id", r.venue_id)
      .single();
    const subject =
      kind === "new"
        ? `Styled: your ${r.request_kind} request for ${v?.name || "your venue"}`
        : `Styled: ${ENQUIRY_STATUSES[r.status] || "an update"} for ${v?.name || "your venue"}`;
    const text = [
      `Hi ${r.name},`,
      "",
      kind === "new"
        ? `We received your ${r.request_kind} request for ${r.preferred_date}. The venue will review your plans. This does not reserve the date and no payment has been taken.`
        : `Your request is now: ${ENQUIRY_STATUSES[r.status] || r.status}.`,
      r.response || "",
      r.alternative_dates?.length
        ? `Suggested dates: ${r.alternative_dates.join(", ")}. These are suggestions, not reservations.`
        : "",
      `View your request: ${env.siteUrl}/venues/requests`,
      "For payment, agreements or help, contact support@styleduk.com.",
      "Styled",
    ]
      .filter(Boolean)
      .join("\n\n");
    await sendEmail({
      to: [r.email],
      subject: subject.replace(/[\r\n]/g, " "),
      text,
      html: `<div style="font-family:Arial;max-width:580px;line-height:1.6">${escape(text).replace(/\n/g, "<br>")}</div>`,
    });
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
        u.data.user?.email ? [u.data.user.email] : [],
      );
      const notice = `New ${r.request_kind} request for ${v?.name || "your venue"}, ${r.preferred_date}. Review and respond in your venue dashboard: ${env.siteUrl}/venue-portal. Styled staff can also review it in the admin venue area. No payment has been taken.`;
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
