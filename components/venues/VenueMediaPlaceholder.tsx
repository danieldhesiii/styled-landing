export default function VenueMediaPlaceholder({
  kind,
}: {
  kind: "tour" | "video";
}) {
  const tour = kind === "tour";
  return (
    <div className="mt-6 flex w-full min-w-0 aspect-[4/3] min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-clay/40 bg-sand/20 px-6 text-center sm:aspect-video">
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className="mb-4 h-12 w-12 text-clay"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {tour ? (
          <>
            <circle cx="24" cy="24" r="16" />
            <ellipse cx="24" cy="24" rx="7" ry="16" />
            <path d="M8 24h32 M12 14c7 6 17 6 24 0 M12 34c7-6 17-6 24 0" />
          </>
        ) : (
          <>
            <rect x="5" y="10" width="38" height="28" rx="5" />
            <path d="m20 18 12 6-12 6z" />
          </>
        )}
      </svg>
      <h3 className="font-serif text-2xl">
        {tour ? "3D walkthrough" : "Venue video"}
      </h3>
      <p className="mt-2 text-sm text-ink/60">
        {tour ? "Walkthrough not added yet" : "Video not added yet"}
      </p>
      <p className="mt-3 max-w-sm text-xs leading-relaxed text-ink/50">
        {tour
          ? "An interactive tour will appear here once the venue adds a captured 360° or 3D walkthrough."
          : "A venue film will appear here once the venue adds its video."}
      </p>
    </div>
  );
}
