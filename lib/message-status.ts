export interface ReplyState {
  last_sender_role: string | null;
  awaiting_since: string | null;
  reply_target_hours: number | null;
}
export function validReplyHours(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 168)
  );
}
export function replyTargetLabel(hours: number | null | undefined) {
  if (!hours) return "Response time to be agreed";
  return `Reply target: within ${hours % 24 === 0 ? `${hours / 24} ${hours === 24 ? "day" : "days"}` : `${hours} hours`}`;
}
export function conversationStatus(
  thread: ReplyState,
  supplier: boolean,
  now = Date.now(),
) {
  const waiting = thread.last_sender_role === "customer";
  const since = thread.awaiting_since ? Date.parse(thread.awaiting_since) : NaN;
  const overdue =
    waiting &&
    !!thread.reply_target_hours &&
    Number.isFinite(since) &&
    now > since + thread.reply_target_hours * 3600000;
  return {
    overdue,
    label: overdue
      ? supplier
        ? "Your reply is overdue"
        : "Supplier response target passed"
      : waiting
        ? supplier
          ? "Waiting for your reply"
          : "Waiting for supplier to reply"
        : thread.last_sender_role === "supplier"
          ? supplier
            ? "Waiting for customer to reply"
            : "Supplier replied"
          : "Start a conversation",
  };
}
export function receiptLabel(
  readAt: string | null | undefined,
  supplier: boolean,
) {
  return readAt ? `Seen by ${supplier ? "customer" : "supplier"}` : "Sent";
}
