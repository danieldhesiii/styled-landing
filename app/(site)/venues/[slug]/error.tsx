"use client";
import Link from "next/link";
export default function VenueError({ reset }: { reset: () => void }) {
  return (
    <section className="py-20">
      <h1 className="font-serif text-4xl">We couldn’t load this venue</h1>
      <p className="mt-4 text-ink/60">Please try again in a moment.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-ink px-6 py-3 text-cream"
      >
        Try again
      </button>
      <Link href="/venues" className="ml-5 underline">
        All venues
      </Link>
    </section>
  );
}
