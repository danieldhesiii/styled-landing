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
      "Your plan, Boards and Saved keep your ideas. Basket holds choices you have not sent. My bookings tracks submitted requests. Nothing is reserved until the supplier or venue confirms the arrangements.",
  },
  {
    question: "Can I plan a ceremony and reception separately?",
    answer:
      "Use Add event and switch with Currently planning. Each event has its own venue, dates, basket and latest preview. Boards and Saved are shared. Submit each event’s basket separately.",
  },
  {
    question: "Can different items arrive on different days?",
    answer:
      "Yes. Open Basket and tick Different dates for this item. Choose its delivery or collection day and return day. Agree the timing and any extra costs with the supplier before booking.",
  },
  {
    question: "How do I change or cancel a request?",
    answer:
      "Choose the request topic and include the reference shown in My bookings. Describe the change you need. Sending a support message does not itself change or cancel a booking. Agreed supplier or venue terms determine any charges or refunds.",
  },
  {
    question: "Why can’t I see my supplier or venue workspace?",
    answer:
      "Business access is linked separately from a customer account. Tell us your business or listing name and the email you use to sign in. Please ask us to check access before creating another listing.",
  },
  {
    question: "Are the images and Pinterest imports exact?",
    answer:
      "AI previews are illustrative, so check actual products and dimensions. Pinterest links let you view inspiration; they do not import a whole board. Upload individual images you have permission to use. Google Photos also uses a download and upload flow.",
  },
  {
    question: "What should I include when something goes wrong?",
    answer:
      "Tell us which section you were using, what you tried and what happened. Include the visible error message and request or listing reference if relevant. Do not include passwords, recovery links, payment details or one-time codes.",
  },
];
