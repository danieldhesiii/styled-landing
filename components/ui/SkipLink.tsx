export default function SkipLink({
  target = "main-content",
}: {
  target?: string;
}) {
  return (
    <a
      href={`#${target}`}
      className="sr-only z-50 rounded-full bg-ink px-5 py-3 text-sm text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Skip to content
    </a>
  );
}
