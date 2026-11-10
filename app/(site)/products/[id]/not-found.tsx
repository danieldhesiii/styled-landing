import Link from "next/link";
export default function ProductNotFound() {
  return <div className="py-16"><h1 className="font-serif text-3xl">This product is no longer listed</h1><p className="mt-3 text-ink/60">Explore the catalogue for other pieces.</p><Link href="/design?tab=catalogue" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm text-cream">Back to catalogue</Link></div>;
}
