"use client";
import { useRef, useState } from "react";
export default function VenueGallery({
  name,
  images,
}: {
  name: string;
  images: string[];
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [index, setIndex] = useState(0);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => {
              setIndex(i);
              dialog.current?.showModal();
            }}
            aria-label={`View ${name} photo ${i + 1}`}
          >
            <img
              src={url}
              alt={`${name}, view ${i + 1}`}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        aria-label={`${name} gallery`}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
        className="max-h-[95vh] w-[95vw] max-w-5xl rounded-xl bg-cream p-4 backdrop:bg-ink/80"
      >
        <div className="mb-3 flex justify-between">
          <span>
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="px-3"
          >
            Close ×
          </button>
        </div>
        {images[index] && (
          <img
            src={images[index]}
            alt={`${name}, view ${index + 1}`}
            className="max-h-[75vh] w-full object-contain"
          />
        )}
        <div className="mt-3 flex justify-between">
          <button
            type="button"
            onClick={() =>
              setIndex((index + images.length - 1) % images.length)
            }
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex((index + 1) % images.length)}
          >
            Next →
          </button>
        </div>
      </dialog>
    </>
  );
}
