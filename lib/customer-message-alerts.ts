export type ReplyAlert = {
  id: string;
  supplier_id: string;
  last_message_id: string;
  last_sender_role: string;
  updated_at: string;
  suppliers: { name: string } | null;
};

// Older unread conversations must not become "new" when newer ones are read.
export function newSupplierReplies(threads: ReplyAlert[], seen: Set<string>, since: string) {
  return threads.filter(thread => thread.last_sender_role === "supplier" &&
    !seen.has(thread.last_message_id) && Date.parse(thread.updated_at) > Date.parse(since));
}
export function customerAlertsEnabled(path: string) {
  return !/^\/(portal|admin|auth|login|venue-portal|business)(\/|$)/.test(path);
}
