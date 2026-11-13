import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVendor } from "@/lib/server/vendor";
import { supplierJson } from "@/lib/server/supplier-body";

export const dynamic = "force-dynamic";
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const reply = (data: object, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function actor(req: Request) {
  if (new URL(req.url).searchParams.get("workspace") === "supplier") {
    const vendor = await requireVendor(req);
    if (!vendor.ok) return null;
    return {
      user: vendor.user,
      db: vendor.admin,
      supplierId: vendor.supplierId,
    };
  }
  const { data, error } = await (await createClient()).auth.getUser();
  if (
    error ||
    !data.user ||
    data.user.is_anonymous ||
    !data.user.email_confirmed_at
  )
    return null;
  return { user: data.user, db: createAdminClient(), supplierId: null };
}
export async function GET(req: Request) {
  try {
    const auth = await actor(req);
    if (!auth)
      return reply(
        { error: "Sign in with an account that has access to this inbox." },
        401,
      );
    if (new URL(req.url).searchParams.get("notifications") === "1") {
      if (auth.supplierId) return reply({ error: "Use your supplier inbox." }, 400);
      const observedAt = new Date().toISOString();
      const { data, count, error } = await auth.db
        .from("supplier_conversations")
        .select("id,supplier_id,last_message_id,last_sender_role,updated_at,suppliers(name)", { count: "exact" })
        .eq("customer_id", auth.user.id)
        .eq("customer_unread", true)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return reply({ threads: data || [], unreadCount: count || 0, observedAt });
    }
    const contactId = new URL(req.url).searchParams.get("supplier");
    if (contactId) {
      if (auth.supplierId || !uuid(contactId))
        return reply({ error: "Supplier not found." }, 404);
      const { data: contact, error } = await auth.db
        .from("suppliers")
        .select("id,name,message_reply_hours")
        .eq("id", contactId)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return contact
        ? reply({ contact })
        : reply({ error: "Supplier not found." }, 404);
    }
    const id = new URL(req.url).searchParams.get("thread");
    let query = auth.db
      .from("supplier_conversations")
      .select(
        "id,customer_id,supplier_id,customer_label,last_body,last_message_id,updated_at,customer_unread,supplier_unread,last_sender_role,awaiting_since,reply_target_hours,suppliers(name)",
      );
    query = auth.supplierId
      ? query.eq("supplier_id", auth.supplierId)
      : query.eq("customer_id", auth.user.id);
    if (id) {
      if (!uuid(id)) return reply({ error: "Conversation not found." }, 404);
      const { data: thread, error } = await query.eq("id", id).maybeSingle();
      if (error) throw error;
      if (!thread) return reply({ error: "Conversation not found." }, 404);
      const before = new URL(req.url).searchParams.get("before");
      if (before && !uuid(before))
        return reply({ error: "Invalid message cursor." }, 400);
      // UUID cursor references a message in this conversation, never a timestamp supplied by another participant.
      let messagesQuery = auth.db
        .from("supplier_messages")
        .select("id,sender_role,body,created_at,read_at")
        .eq("conversation_id", id);
      if (before) {
        const { data: cursor } = await auth.db
          .from("supplier_messages")
          .select("created_at")
          .eq("conversation_id", id)
          .eq("id", before)
          .maybeSingle();
        if (!cursor) return reply({ error: "Message not found." }, 404);
        messagesQuery = messagesQuery.or(
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${before})`,
        );
      }
      const { data: messages, error: messageError } = await messagesQuery
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(101);
      if (messageError) throw messageError;
      return reply({
        thread,
        messages: (messages || []).slice(0, 100).reverse(),
        hasOlder: (messages?.length || 0) > 100,
      });
    }
    const offset = Number(new URL(req.url).searchParams.get("offset") || "0");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      return reply({ error: "Invalid inbox page." }, 400);
    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 49);
    if (error) throw error;
    let unreadQuery = auth.db
      .from("supplier_conversations")
      .select("id", { count: "exact", head: true })
      .eq(auth.supplierId ? "supplier_unread" : "customer_unread", true);
    unreadQuery = auth.supplierId
      ? unreadQuery.eq("supplier_id", auth.supplierId)
      : unreadQuery.eq("customer_id", auth.user.id);
    const { count, error: countError } = await unreadQuery;
    if (countError) throw countError;
    return reply({
      threads: data || [],
      hasMoreThreads: data?.length === 50,
      unreadCount: count || 0,
    });
  } catch {
    return reply(
      { error: "Messages are temporarily unavailable. Please retry." },
      503,
    );
  }
}
export async function POST(req: Request) {
  try {
    const auth = await actor(req);
    if (!auth) return reply({ error: "Sign in to use this inbox." }, 401);
    const body = await supplierJson(req);
    let customerId = auth.user.id,
      supplierId = body.supplierId;
    if (body.threadId) {
      if (!uuid(body.threadId))
        return reply({ error: "Conversation not found." }, 404);
      let query = auth.db
        .from("supplier_conversations")
        .select("*")
        .eq("id", body.threadId);
      query = auth.supplierId
        ? query.eq("supplier_id", auth.supplierId)
        : query.eq("customer_id", auth.user.id);
      const { data: thread, error } = await query.maybeSingle();
      if (error) throw error;
      if (!thread) return reply({ error: "Conversation not found." }, 404);
      customerId = thread.customer_id;
      supplierId = thread.supplier_id;
      if (body.action === "read") {
        if (!uuid(body.lastMessageId)) return reply({ ok: true });
        const { error: readError } = await auth.db.rpc(
          "read_supplier_messages",
          {
            p_thread: thread.id,
            p_actor: auth.user.id,
            p_supplier_workspace: !!auth.supplierId,
            p_last: body.lastMessageId,
          },
        );
        if (readError) throw readError;
        return reply({ ok: true });
      }
    } else if (auth.supplierId)
      return reply({ error: "Choose a customer conversation." }, 422);
    if (
      !uuid(supplierId) ||
      !uuid(body.clientId) ||
      typeof body.message !== "string" ||
      !body.message.trim() ||
      body.message.length > 4000
    )
      return reply(
        { error: "Write a message of up to 4,000 characters." },
        422,
      );
    const { data: allowed, error: limitError } = await auth.db.rpc(
      "hit_rate_limit",
      {
        p_key: "supplier-inbox:" + auth.user.id,
        p_limit: 60,
        p_window_seconds: 3600,
      },
    );
    if (limitError || !allowed)
      return reply({ error: "Please wait before sending more messages." }, 429);
    const { data, error } = await auth.db.rpc("send_supplier_message", {
      p_customer: customerId,
      p_supplier: supplierId,
      p_actor: auth.user.id,
      p_label:
        (typeof auth.user.user_metadata?.display_name === "string"
          ? auth.user.user_metadata.display_name
          : auth.user.email?.split("@")[0] || "Customer"
        )
          .replace(/[\x00-\x1f]/g, " ")
          .trim()
          .slice(0, 100) || "Customer",
      p_body: body.message.trim(),
      p_client: body.clientId,
    });
    if (error)
      return reply(
        { error: "Could not send. Check the supplier is available and retry." },
        422,
      );
    return reply({ ok: true, threadId: data });
  } catch {
    return reply(
      { error: "Could not save your message. Your text has been kept." },
      400,
    );
  }
}
