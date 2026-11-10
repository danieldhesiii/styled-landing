import { hireDateError } from "./booking-dates";
export type DemoVenueRequest = { start: string; end: string; guests: string; message: string };
export function demoVenueRequestError(request: DemoVenueRequest, min: number, max: number, today: string): string | null {
  const dates = hireDateError(request.start, request.end, today);
  if (dates) return dates.replace("delivery and return", "venue hire start and end").replace("Return or collection must be on or after delivery.", "Venue hire must end on or after it starts.");
  if (!/^\d+$/.test(request.guests) || Number(request.guests) < min || Number(request.guests) > max)
    return `Choose a guest count from ${min} to ${max}.`;
  if (request.message.length > 1000) return "Keep your note under 1,000 characters.";
  return null;
}
export function demoAlternativeDay(day: string): string {
  const next = new Date(`${day}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 7);
  return next.toISOString().slice(0, 10);
}
