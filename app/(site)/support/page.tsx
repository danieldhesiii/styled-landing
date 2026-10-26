import SupportContent from "@/components/support/SupportContent";
export const metadata = {
  title: "Help & support · Styled",
  description:
    "Ask Styled a question, get help with a request, or find answers about planning and business workspaces.",
};
export default function SupportPage() {
  return (
    <section className="mx-auto max-w-2xl py-10 sm:py-14">
      <h1 className="font-serif text-4xl">Help & support</h1>
      <p className="mb-6 mt-3 text-sm text-ink/70">
        Get help with your plans, requests or business workspace.
      </p>
      <SupportContent />
    </section>
  );
}
