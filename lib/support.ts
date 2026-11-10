export const SUPPORT_EMAIL = "support@styleduk.com";
export const SUPPORT_TOPICS = {
  planning: "Planning and using Styled",
  request: "A supplier or venue request",
  account: "My account",
  business: "My supplier or venue workspace",
  problem: "Report a problem",
  feedback: "Feedback or a suggestion",
} as const;
export type SupportTopic = keyof typeof SUPPORT_TOPICS;
export type SupportDraft = {
  topic: SupportTopic;
  reference: string;
  message: string;
};
export function supportDraft(input: unknown): SupportDraft | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const b = input as Record<string, unknown>;
  if (
    typeof b.topic !== "string" ||
    !Object.hasOwn(SUPPORT_TOPICS, b.topic) ||
    typeof b.message !== "string" ||
    typeof b.reference !== "string"
  )
    return null;
  const reference = b.reference.trim(),
    message = b.message.trim();
  if (
    reference.length > 120 ||
    /[\r\n\x00-\x1f]/.test(reference) ||
    message.length < 10 ||
    message.length > 4000 ||
    /\x00/.test(message)
  )
    return null;
  return { topic: b.topic as SupportTopic, reference, message };
}
export function supportEmailBody(draft: SupportDraft) {
  return `Topic: ${SUPPORT_TOPICS[draft.topic]}\n${draft.reference ? `Request or listing: ${draft.reference}\n` : ""}\n${draft.message}`;
}
export function supportMailto(draft: SupportDraft) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Styled support: ${SUPPORT_TOPICS[draft.topic]}`)}&body=${encodeURIComponent(supportEmailBody(draft))}`;
}
export const SUPPORT_ANSWERS = [
  {
    question: "What is the difference between my plan and a booking?",
    answer:
      "Basket holds unsent choices. My bookings tracks submitted requests. Nothing is reserved until the supplier or venue confirms.",
  },
  {
    question: "Can I plan a ceremony and reception separately?",
    answer:
      "Use Add event, then switch with Currently planning. Venue, dates, basket and latest preview belong to each event. Saved items and Saved looks are shared. Submit each basket separately.",
  },
  {
    question: "Can different items arrive on different days?",
    answer:
      "In Basket, choose Change dates for an item. Set its delivery and return days, then agree timing and extra costs with the supplier.",
  },
  {
    question: "How do I change or cancel a request?",
    answer:
      "Choose the request topic and include your My bookings reference and the change needed. Support messages do not change or cancel bookings. Agreed terms determine charges or refunds.",
  },
  {
    question: "Why can’t I see my supplier or venue workspace?",
    answer:
      "Tell us your business name and sign-in email so we can check access. Ask us before creating another listing.",
  },
  {
    question: "Are AI previews exact?",
    answer:
      "AI previews are illustrative. Check actual product details, colours and dimensions before requesting.",
  },
  {
    question: "What should I include when something goes wrong?",
    answer:
      "Include the section, what you tried, the error and any request reference. Never include passwords, recovery links, payment details or sign-in codes.",
  },
];
