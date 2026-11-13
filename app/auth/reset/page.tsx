import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeLocalRedirect } from "@/lib/auth/navigation";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reset password · Styled" };
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ next?: string; setup?: string }> }) {
  const params = await searchParams;
  const next = safeLocalRedirect(params.next);
  const supplierSetup = params.setup === "supplier" && /^\/portal(?:\/|$)/.test(next);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous) redirect(`/auth/recovery?${new URLSearchParams({ next, error: "link" })}`);
  return <main className="mx-auto min-h-screen max-w-md px-5 py-16"><div className="rounded-3xl border border-sand bg-white p-7"><ResetPasswordForm next={next} supplierSetup={supplierSetup} /></div></main>;
}
