import { isValidDay } from "./availability";

// This is total stock for the day, before Styled reservations are deducted.
// Null removes the exception; zero closes the product on that date.
export function productDayLimitInput(body: Record<string, unknown>, today: string) {
  if (typeof body.productId !== "string" || !body.productId.trim() || body.productId.length > 200)
    return { error: "Choose one of your products." } as const;
  if (!isValidDay(body.day) || body.day < today)
    return { error: "Choose today or a future date." } as const;
  if (body.units !== null && (typeof body.units !== "number" || !Number.isSafeInteger(body.units) || body.units < 0 || body.units > 1000000))
    return { error: "Enter a whole number of units, including zero to close this product." } as const;
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 300))
    return { error: "Keep the note within 300 characters." } as const;
  return { value: { productId: body.productId.trim(), day: body.day, units: body.units, note: typeof body.note === "string" ? body.note.trim() || null : null } } as const;
}
