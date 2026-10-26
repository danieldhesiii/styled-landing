import Link from "next/link";
import RecoveryForm from "@/components/auth/RecoveryForm";
import { safeLocalRedirect } from "@/lib/auth/navigation";
export const metadata = { title: "Recover account access · Styled" };
export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="mx-auto min-h-screen max-w-md px-5 py-16">
    <Link href="/" className="mb-8 block font-serif text-2xl">Styled.</Link>
    <div className="rounded-3xl border border-sand bg-white p-7"><RecoveryForm next={safeLocalRedirect(params.next)} invalidLink={!!params.error} /></div>
  </main>;
}
