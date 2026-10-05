import { ORDER_STATUS_LABEL } from "@/lib/admin-client";

const CLS: Record<string, string> = {
  requested: "bg-clay/15 text-clay",
  confirmed: "bg-sage/20 text-sage",
  deposit_paid: "bg-sage/20 text-sage",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-ink/10 text-ink/60",
  pending: "bg-ink/5 text-ink/50",
};

export default function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CLS[status] ?? CLS.pending}`}>
      {label ?? ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}
