"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import HowItWorks from "@/components/design/HowItWorks";
import { helpTopicForPage, type HelpTopic } from "@/lib/help";
export default function HelpButton({
  topic,
  label = "How it works",
  className = "rounded-full border border-sand px-4 py-2 text-sm",
}: {
  topic?: HelpTopic;
  label?: string;
  className?: string;
}) {
  const pathname = usePathname(),
    [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {label}
      </button>
      {open && (
        <HowItWorks
          initialTopic={topic ?? helpTopicForPage(pathname)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
