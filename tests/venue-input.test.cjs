const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const directory = mkdtempSync(path.join(tmpdir(), "styled-venues-"));
execFileSync(process.execPath, [
  "node_modules/typescript/lib/tsc.js",
  "lib/venue-input.ts",
  "lib/venue-admin-input.ts",
  "lib/venues.ts",
  "--outDir",
  directory,
  "--target",
  "ES2020",
  "--module",
  "commonjs",
  "--skipLibCheck",
]);
const { safeImageUrl, venueEmbed, validateVenueEnquiry } = require(
  path.join(directory, "venue-input.js"),
);
const { parseVenue, parseVenuePackage } = require(
  path.join(directory, "venue-admin-input.js"),
);
process.on("exit", () => rmSync(directory, { recursive: true, force: true }));
const valid = {
  venueId: "11111111-1111-4111-8111-111111111111",
  name: " Test Couple ",
  email: "Couple@example.com",
  date: "2026-11-22",
  guests: "80",
};
test("normalises a valid enquiry without accepting caller-supplied status", () => {
  const { value } = validateVenueEnquiry(
    { ...valid, status: "booked" },
    "2026-10-22",
  );
  assert.equal(value.name, "Test Couple");
  assert.equal(value.email, "couple@example.com");
  assert.equal(value.guest_count, 80);
  assert.equal(value.package_id, null);
  assert.equal(value.status, undefined);
});
test("rejects past, impossible and malformed dates", () => {
  for (const date of ["2026-10-21", "2026-02-30", "tomorrow", "2026-13-01"])
    assert.ok(validateVenueEnquiry({ ...valid, date }, "2026-10-22").error);
});
test("rejects invalid identifiers, guests, email and oversized fields", () => {
  for (const change of [
    { venueId: "wrong" },
    { packageId: "wrong" },
    { guests: 0 },
    { guests: 1.5 },
    { guests: 10001 },
    { email: "bad" },
    { name: "" },
    { message: "x".repeat(5001) },
    { phone: "x".repeat(41) },
  ])
    assert.ok(
      validateVenueEnquiry({ ...valid, ...change }, "2026-10-22").error,
    );
});
test("omits unsafe images and unsupported embeds", () => {
  for (const url of [
    "javascript:alert(1)",
    "//evil.test/a",
    "/\\evil.test",
    "http://example.com/a",
  ])
    assert.equal(safeImageUrl(url), null);
  assert.equal(safeImageUrl("/img/venues/test.jpg"), "/img/venues/test.jpg");
  for (const url of [
    "https://youtube.com.evil.test/embed/abcdefghijk",
    "https://evil.test/",
    "javascript:alert(1)",
  ])
    assert.equal(venueEmbed(url, "video"), null);
  assert.equal(
    venueEmbed("https://youtu.be/abcdefghijk", "video"),
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  );
  assert.equal(
    venueEmbed("https://vimeo.com/12345678", "video"),
    "https://player.vimeo.com/video/12345678",
  );
  assert.equal(
    venueEmbed("https://my.matterport.com/show/?m=demo", "tour"),
    "https://my.matterport.com/show/?m=demo",
  );
});

test("admin venue input preserves pence and refuses inverted capacities or unsafe embeds", () => {
  const input = {
    name: "Oak Barn",
    slug: "oak-barn",
    location: "Chelmsford",
    county: "Essex",
    capacity_min: "20",
    capacity_max: "150",
    package_from_pence: "420000",
    active: true,
  };
  assert.equal(parseVenue(input).package_from_pence, 420000);
  assert.equal(parseVenue(input).active, true);
  assert.equal(parseVenue({ ...input, active: "true" }).active, false);
  for (const change of [
    { slug: "partner" },
    { capacity_min: 200 },
    { capacity_max: -1 },
    { capacity_max: true },
    { hero_image: "javascript:alert(1)" },
    { video_url: "https://evil.test/embed" },
    { gallery_images: ["//evil.test/image"] },
  ])
    assert.throws(() => parseVenue({ ...input, ...change }));
});
test("admin packages require a real style and explicit whole-pence price", () => {
  const input = {
    name: "Garden Romance",
    style_id: "garden_romance",
    price_from_pence: "420000",
    sort_order: "0",
  };
  assert.equal(parseVenuePackage(input).price_from_pence, 420000);
  for (const change of [
    { price_from_pence: "" },
    { price_from_pence: null },
    { price_from_pence: true },
    { price_from_pence: 12.5 },
    { price_from_pence: -1 },
    { style_id: "unknown" },
    { sort_order: 2147483648 },
  ])
    assert.throws(() => parseVenuePackage({ ...input, ...change }));
});

const { parseVenueDetails, parseVenueResponse, listingMissing } = require(
  path.join(directory, "venue-details.js"),
);
const { filterVenueListings } = require(path.join(directory, "venues.js"));
test("venue profiles separate hire prices, strip unrecognised data and validate facilities", () => {
  const d = parseVenueDetails({
    venue_type: "barn",
    hire_from_pence: "450000",
    features: ["parking", "parking", "exclusive_use"],
    private_email: "hidden@example.com",
  });
  assert.equal(d.hire_from_pence, 450000);
  assert.deepEqual(d.features, ["parking", "exclusive_use"]);
  assert.equal(d.private_email, undefined);
  for (const bad of [
    { hire_from_pence: true },
    { hire_from_pence: 1.5 },
    { features: ["invented"] },
    { venue_type: "invalid" },
    { bedrooms: -1 },
    { postcode: "X".repeat(13) },
  ])
    assert.throws(() => parseVenueDetails(bad));
  assert.ok(listingMissing({ name: "A venue" }).includes("main photograph"));
});
test("venue filters respect guest capacity, hire budget, known facilities and location search", () => {
  const venue = {
    name: "Oak Barn",
    county: "Essex",
    location: "Chelmsford",
    capacity_min: 20,
    capacity_max: 120,
    indoor_outdoor: "both",
    details: {
      venue_type: "barn",
      hire_from_pence: 450000,
      features: ["parking", "exclusive_use"],
    },
  };
  const f = { county: "", setting: "", guests: 80 };
  assert.equal(
    filterVenueListings([venue], {
      ...f,
      query: "chelmsford",
      type: "barn",
      maxHirePence: 500000,
      features: ["parking"],
    }).length,
    1,
  );
  for (const extra of [
    { guests: 121 },
    { maxHirePence: 400000 },
    { features: ["accommodation"] },
    { type: "hotel" },
    { query: "London" },
  ])
    assert.equal(filterVenueListings([venue], { ...f, ...extra }).length, 0);
  assert.equal(
    filterVenueListings(
      [{ ...venue, details: { ...venue.details, hire_from_pence: null } }],
      { ...f, maxHirePence: 500000 },
    ).length,
    0,
  );
});
test("venue responses require explanation for decisions and bounded valid alternative dates", () => {
  assert.throws(() => parseVenueResponse({ status: "booked" }, "2026-10-23"));
  assert.throws(() =>
    parseVenueResponse({ status: "cancelled", response: "No" }, "2026-10-23"),
  );
  for (const dates of [
    ["2026-02-30"],
    ["2026-10-22"],
    Array(6).fill("2027-01-01"),
    ["tomorrow"],
  ])
    assert.throws(() =>
      parseVenueResponse(
        { status: "contacted", alternative_dates: dates },
        "2026-10-23",
      ),
    );
  assert.deepEqual(
    parseVenueResponse(
      {
        status: "declined",
        response: "Another date?",
        alternative_dates: ["2027-06-12", "2027-06-12"],
      },
      "2026-10-23",
    ).alternative_dates,
    ["2027-06-12"],
  );
});
test("walkthroughs accept provider share links and reject credentials, lookalike domains and profile links", () => {
  for (const url of [
    "https://kuula.co/share/collection/7abcD",
    "https://kuula.co/share/abcDE/collection/7abcD?logo=1",
  ])
    assert.equal(venueEmbed(url, "tour"), url);
  for (const url of [
    "https://kuula.co/post/abcDE",
    "https://kuula.co.evil.test/share/collection/abcDE",
    "https://user:pass@my.matterport.com/show/?m=abc",
    "https://kuula.co:444/share/collection/abcDE",
    '<iframe src="https://kuula.co/share/collection/abcDE"></iframe>',
  ])
    assert.equal(venueEmbed(url, "tour"), null);
});
test("enquiries distinguish viewing from booking and cannot set owner or response fields", () => {
  const { value } = validateVenueEnquiry(
    {
      ...valid,
      requestKind: "viewing",
      owner_user_id: "spoof",
      response: "confirmed",
    },
    "2026-10-22",
  );
  assert.equal(value.request_kind, "viewing");
  assert.equal(value.owner_user_id, undefined);
  assert.equal(value.response, undefined);
  assert.ok(
    validateVenueEnquiry({ ...valid, requestKind: "other" }, "2026-10-22")
      .error,
  );
});

test("venue owners enter pound prices without losing pennies or accepting ambiguous formats", () => {
  const { poundsToPence } = require(path.join(directory, "venue-details.js"));
  assert.equal(poundsToPence("4250.75"), 425075);
  assert.equal(poundsToPence("0"), 0);
  assert.equal(poundsToPence(""), null);
  assert.equal(
    parseVenueDetails({ hire_from_pounds: "4250.75" }).hire_from_pence,
    425075,
  );
  for (const price of ["1e4", "12.345", "-1", "£100", true, 100, "1000000.01"])
    assert.throws(() => poundsToPence(price));
  const parsed = parseVenue({
    name: "Oak Barn",
    slug: "oak-barn",
    location: "Chelmsford",
    county: "Essex",
    styling_from_pounds: "1250.50",
    hire_from_pounds: "4250.75",
  });
  assert.equal(parsed.package_from_pence, 125050);
  assert.equal(parsed.details.hire_from_pence, 425075);
});
