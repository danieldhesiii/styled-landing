import { NextResponse } from "next/server";
import { supplierJson } from "@/lib/server/supplier-body";
import { environmentMatches } from "@/lib/pilot-readiness";
import { env } from "@/lib/server/env";
import { sendEmail } from "@/lib/server/notify";
import { requireStaff } from "@/lib/server/staff";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status,headers:{"Cache-Control":"no-store"} });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/admin/suppliers/[id]/users: the login accounts linked to this supplier.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { id } = await params;

  const { data: links, error: linksError } = await admin.from("supplier_users").select("user_id, created_at").eq("supplier_id", id);
  if (linksError) return fail(503,"Could not load linked accounts.");
  if (!links || links.length === 0) return NextResponse.json({ ok: true, users: [] });

  // Resolve only this supplier's accounts, including those beyond the first auth page.
  const accounts = await Promise.all(links.map(l=>admin.auth.admin.getUserById(l.user_id)));
  if(accounts.some(r=>r.error))return fail(503,"Could not load linked accounts.");
  const emailById = new Map(accounts.flatMap(r=>r.data.user?[[r.data.user.id,r.data.user.email||""]]:[]));

  return NextResponse.json({
    ok: true,
    users: links.map((l) => ({ userId: l.user_id, email: emailById.get(l.user_id as string) ?? "(unknown)", createdAt: l.created_at })),
  },{headers:{"Cache-Control":"no-store"}});
}

// Invitations go to the approved recipient. No password or login token is returned to staff.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { admin } = auth, { id } = await params;
  let body:any;
  try { body = await supplierJson(req, 3000); } catch { return fail(400, "Check the invitation form."); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 160 || body.confirmAccess !== true) return fail(422, "Enter the supplier-approved email and confirm access.");
  if(!environmentMatches(env.supabaseUrl,env.siteUrl))return fail(409,"Check the isolated development database and site URL before creating access.");
  if (!env.brevoApiKeyIfSet && !env.resendApiKeyIfSet) return fail(409, "Connect development email first. No account or access was created.");
  const limited = await admin.rpc("hit_rate_limit", {p_key:`supplier-invite:${auth.user.id}`,p_limit:5,p_window_seconds:3600});
  if (limited.error || limited.data !== true) return fail(429, "Please wait before inviting more accounts.");
  const recipientLimit = await admin.rpc("hit_rate_limit", {p_key:`supplier-invite-recipient:${id}:${email}`,p_limit:1,p_window_seconds:60});
  if(recipientLimit.error || recipientLimit.data !== true) return fail(429,"An invitation was just requested for this account. Please wait a minute before resending.");
  const supplier = await admin.from("suppliers").select("id,name").eq("id", id).maybeSingle();
  if (supplier.error || !supplier.data) return fail(404, "Supplier not found.");
  let user:any=null;
  for (let page=1;page<=50;page++) {
    const list=await admin.auth.admin.listUsers({page,perPage:200});
    if (list.error) return fail(503,"Could not check existing accounts. No invitation was created.");
    user=list.data.users.find(u=>u.email?.toLowerCase()===email);
    if(user||list.data.users.length<200)break;
    if(page===50)return fail(503,"Account lookup limit reached. Ask support to check this recipient.");
  }
  if(user){
    const [linked,staff]=await Promise.all([admin.from("supplier_users").select("supplier_id").eq("user_id",user.id).maybeSingle(),admin.from("staff").select("user_id").eq("user_id",user.id).maybeSingle()]);
    if(linked.error||staff.error)return fail(503,"Could not check recipient access.");
    if(staff.data)return fail(409,"Use a separate business account rather than a staff login.");
    if(linked.data&&linked.data.supplier_id!==id)return fail(409,"This account already belongs to another supplier.");
  }
  const type=user?.email_confirmed_at?"magiclink":"invite";
  const generated=await admin.auth.admin.generateLink({type,email});
  if(generated.error||!generated.data.user||!generated.data.properties?.hashed_token)return fail(503,"Could not prepare a private invitation. No password has been changed.");
  const userId=generated.data.user.id;
  const linked=await admin.from("supplier_users").upsert({user_id:userId,supplier_id:id},{onConflict:"user_id",ignoreDuplicates:true});
  const checked=await admin.from("supplier_users").select("supplier_id").eq("user_id",userId).maybeSingle();
  if(linked.error||checked.error||checked.data?.supplier_id!==id)return fail(409,"Could not link this account safely. Review its supplier access.");
  const link=new URL("/auth/invite",env.siteUrl);link.searchParams.set("token_hash",generated.data.properties.hashed_token);link.searchParams.set("type",type);
  const delivered=await sendEmail({to:[email],subject:"Your Styled supplier workspace invitation",text:`You have been invited to manage your supplier workspace on Styled. This gives access only to the supplier profile linked by the Styled team. Open the private invitation below. New account holders choose their own password.\n\n${link.href}\n\nIf you were not expecting this, contact support@styleduk.com.`,html:`<p>You have been invited to your Styled supplier workspace.</p><p><a href="${link.href.replaceAll('&','&amp;')}">Open your private invitation</a></p><p>New account holders choose their own password. If this was unexpected, contact support@styleduk.com.</p>`});
  if(delivered) await admin.from("vendor_applications").update({invitation_sent_at:new Date().toISOString()}).eq("supplier_id",id).eq("email",email);
  return NextResponse.json({ok:true,email,invitationSent:delivered,message:delivered?"Invitation sent. The recipient signs in privately and new account holders choose their own password.":"Access was linked, but the invitation was not confirmed as sent. Check the provider before retrying. No password was created or shared."},{headers:{"Cache-Control":"no-store"}});
}
