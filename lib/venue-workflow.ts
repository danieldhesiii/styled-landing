// Pure workflow rules shared by request endpoints and focused tests.
export type VenueParticipant = "customer" | "venue";
export function venueParticipant(userId: string, ownerId: string | null, member: boolean): VenueParticipant | null {
  if (!userId) return null;
  if (userId === ownerId) return "customer";
  return member ? "venue" : null;
}
export function validateAlternative(request: { status: string; alternative_dates: string[] }, day: unknown) {
  return ["contacted", "declined"].includes(request.status) && typeof day === "string" && request.alternative_dates.includes(day);
}
export function validateVenueTransition(kind: string, current: string, next: string) {
  if (!["booking", "viewing"].includes(kind) || !["new", "contacted", "booked", "viewing_confirmed", "declined"].includes(next)) return false;
  if (current === "cancelled") return false;
  if (["booked", "viewing_confirmed"].includes(current) && current !== next) return false;
  if (next === "booked" && kind !== "booking") return false;
  if (next === "viewing_confirmed" && kind !== "viewing") return false;
  return true;
}
export function venueNextStep(status: string, actor?: string) {
  if (status === "cancelled") return "Request cancelled.";
  if (actor === "customer") return "Next: the couple can reply or request a suggested date.";
  if (actor === "venue") return "Next: the venue team will review and reply.";
  if (status === "viewing_confirmed") return "Viewing agreed. No wedding date is reserved.";
  if (status === "booked") return "Booking agreed. Arrange contracts and payment with the venue.";
  return "Next: the venue team will review and reply.";
}
