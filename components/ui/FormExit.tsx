import Link from "next/link";

export default function FormExit({ href = "/", children = "Back to home" }: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink underline-offset-4 hover:underline">
      <span aria-hidden="true">←</span>{children}
    </Link>
  );
}
