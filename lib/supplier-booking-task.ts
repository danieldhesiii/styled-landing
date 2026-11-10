import { EMPTY_REPLY, serviceProblems, type ServiceReply } from "./booking-operations";

// Availability alone is not a complete service quote. Declined lines are for
// Styled to resolve; never ask a supplier to quote items they cannot supply.
export function supplierBookingTasks(
  status: string,
  lines: { status: string }[],
  reply?: Partial<ServiceReply> | null,
): string[] {
  if (status !== "requested" || !lines.length) return [];
  if (lines.some(line => line.status === "pending")) return ["Respond to availability and complete service costs"];
  if (lines.some(line => line.status === "declined")) return [];
  return serviceProblems({ ...EMPTY_REPLY, ...reply });
}
