export function safeImageUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))
    return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function venueEmbed(
  value: string | null,
  kind: "video" | "tour" | "map",
): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      (u.port && u.port !== "443")
    )
      return null;
    if (
      kind === "tour" &&
      u.hostname === "my.matterport.com" &&
      u.pathname === "/show/" &&
      u.searchParams.get("m")
    )
      return u.href;
    if (
      kind === "tour" &&
      ["kuula.co", "www.kuula.co"].includes(u.hostname) &&
      /^\/share\/(?:[A-Za-z0-9]+\/)?(?:collection\/)?[A-Za-z0-9]+\/?$/.test(
        u.pathname,
      )
    ) {
      return u.href;
    }
    if (
      kind === "map" &&
      ["www.google.com", "maps.google.com"].includes(u.hostname) &&
      u.pathname.startsWith("/maps/embed")
    )
      return u.href;
    if (kind === "video") {
      if (
        [
          "youtube.com",
          "www.youtube.com",
          "youtu.be",
          "www.youtube-nocookie.com",
        ].includes(u.hostname)
      ) {
        const id =
          u.hostname === "youtu.be"
            ? u.pathname.slice(1)
            : u.searchParams.get("v") || u.pathname.split("/embed/")[1];
        if (id && /^[\w-]{11}$/.test(id))
          return `https://www.youtube-nocookie.com/embed/${id}`;
      }
      if (
        ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(u.hostname)
      ) {
        const id = u.pathname.split("/").filter(Boolean).pop();
        if (id && /^\d+$/.test(id))
          return `https://player.vimeo.com/video/${id}`;
      }
    }
  } catch {
    /* Invalid stored URL: omit the embed. */
  }
  return null;
}

export function validateVenueEnquiry(
  body: Record<string, unknown>,
  today: string,
) {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name),
    email = str(body.email).toLowerCase(),
    phone = str(body.phone);
  const date = str(body.date),
    message = str(body.message),
    venueId = str(body.venueId),
    packageId = str(body.packageId);
  const guests = Number(body.guests);
  const request_kind =
    body.requestKind === undefined ? "booking" : str(body.requestKind);
  if (!["booking", "viewing"].includes(request_kind))
    return { error: "Choose a booking or viewing request." };
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(venueId) || (packageId && !uuid.test(packageId)))
    return { error: "Please choose a valid venue and package." };
  if (!name || name.length > 200)
    return { error: "Please enter your name (up to 200 characters)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320)
    return { error: "Please enter a valid email address." };
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < today
  )
    return { error: "Please choose today or a future date." };
  if (!Number.isInteger(guests) || guests < 1 || guests > 10000)
    return { error: "Please enter a guest count between 1 and 10,000." };
  if (message.length > 5000 || phone.length > 40)
    return { error: "Please shorten your message or phone number." };
  return {
    value: {
      request_kind,
      venue_id: venueId,
      package_id: packageId || null,
      name,
      email,
      phone: phone || null,
      guest_count: guests,
      preferred_date: date,
      message: message || null,
    },
  };
}
