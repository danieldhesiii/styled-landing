import SupportRequests from "@/components/support/SupportRequests";
export const metadata = { title: "Support · Styled staff" };
export default function Page() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-3 font-serif text-4xl">Support inbox</h1>
      <SupportRequests staff />
    </div>
  );
}
