const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const file = require("node:path").resolve("lib/shopping.ts");
const m = new Module(file, module);
m._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  file,
);
const {
  quantityLimit,
  validQuantity,
  imageDisclosure,
  reviewDisclosure,
  basketBlocker,
} = m.exports;

test("shortage exposes allowed units while a blocked date never allows a quantity", () => {
  const short = {
    status: "unavailable",
    reason: "short",
    availableUnits: 7,
    requiredQty: 80,
  };
  assert.equal(quantityLimit(short), 7);
  assert.equal(validQuantity(7, short), true);
  assert.equal(validQuantity(8, short), false);
  assert.equal(quantityLimit({ ...short, reason: "blocked" }), 0);
  assert.equal(
    quantityLimit({ status: "unavailable", availableUnits: null }),
    0,
  );
});
test("quantity rules reject fractions, invalid values and quantities above the request ceiling", () => {
  for (const n of [0, -1, 1.5, NaN, Infinity, 10001])
    assert.equal(validQuantity(n), false);
  assert.equal(validQuantity(10000), true);
  assert.equal(quantityLimit({ status: "limited", availableUnits: 3.9 }), 3);
  assert.equal(
    quantityLimit({ status: "made_to_order", availableUnits: null }),
    10000,
  );
});
test("seeded imagery cannot masquerade as supplier photography", () => {
  assert.match(
    imageDisclosure({ image: "/img/items/example.png", imageKind: "supplier" }),
    /Illustrative/,
  );
  assert.match(
    imageDisclosure({ image: "/uploads/example.png" }),
    /unverified/,
  );
  assert.match(
    imageDisclosure({ image: "/uploads/example.png", imageKind: "supplier" }),
    /Supplier product photograph/,
  );
  assert.match(imageDisclosure({}), /No product photograph/);
});
test("synthetic counts and ratings do not appear as verified reviews", () => {
  assert.equal(
    reviewDisclosure({ reviewCount: 500, rating: 4.9 }),
    "No verified reviews available",
  );
  assert.match(
    reviewDisclosure({ reviewCount: 12, rating: 4.8, reviewsVerified: true }),
    /12 verified reviews/,
  );
});
const ready = {
  count: 1,
  catalogueLoading: false,
  catalogueError: null,
  dateProblem: null,
  missing: false,
  invalid: false,
  availabilityError: null,
  availabilityLoading: false,
  checked: true,
  stockBlocked: false,
};
test("basket proceeds only with a loaded catalogue and completed successful availability check", () => {
  assert.equal(basketBlocker(ready), null);
  for (const patch of [
    { count: 0 },
    { catalogueLoading: true },
    { catalogueError: "Failed" },
    { dateProblem: "Choose dates" },
    { missing: true },
    { invalid: true },
    { availabilityError: "Try again" },
    { availabilityLoading: true },
    { checked: false },
    { stockBlocked: true },
  ]) {
    assert.ok(basketBlocker({ ...ready, ...patch }), JSON.stringify(patch));
  }
  assert.match(
    basketBlocker({ ...ready, catalogueLoading: true, missing: true }),
    /Loading catalogue/,
  );
});

// Render the small shared controls with inert data. No network, storage or DOM writes.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const path = require("node:path");
const item = {
  id: "chair",
  name: "Chair",
  supplier: "Example supplier",
  supplierArea: "Essex",
  unitPrice: 10,
  unit: "each",
  qtyRule: "fixed",
  styles: [],
  icon: "C",
  rating: 4.9,
  reviewCount: 500,
  leadTimeDays: 0,
};
let catalogue = {
  items: [item],
  getItem: (id) => (id === item.id ? item : undefined),
  loading: false,
  error: null,
};
let availability = {
  lines: {
    chair: { status: "available", requiredQty: 1, availableUnits: null },
  },
  allAvailable: true,
  checked: true,
  loading: false,
  error: null,
};
function loadUI(relative) {
  const file = path.resolve(relative);
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (id) => {
    if (id === "@/components/catalogue/CatalogueProvider")
      return { useCatalogue: () => catalogue };
    if (id === "@/components/availability/useAvailability")
      return { useBasketAvailability: () => availability };
    if (id === "@/components/help/HelpButton")
      return { __esModule: true, default: () => null };
    if (id.startsWith("@/") || id.startsWith(".")) {
      const base = id.startsWith("@/")
        ? path.resolve(id.slice(2))
        : path.resolve(path.dirname(file), id);
      return loadUI(
        fs.existsSync(base + ".tsx") ? base + ".tsx" : base + ".ts",
      );
    }
    return require(id);
  };
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const render = (file, props) =>
  renderToStaticMarkup(React.createElement(loadUI(file).default, props));
const noop = () => {};
test("product actions disable known blocked stock and catalogue failures", () => {
  const props = { item, onAdd: noop, onQty: noop };
  const blocked = render("components/design/ProductPurchase.tsx", {
    ...props,
    availability: {
      status: "unavailable",
      reason: "blocked",
      availableUnits: 0,
    },
  });
  assert.match(blocked, /disabled=""/);
  assert.match(blocked, /Unavailable for these dates/);
  catalogue = { ...catalogue, error: "Cannot load" };
  const failed = render("components/design/ProductPurchase.tsx", props);
  assert.match(failed, /disabled=""/);
  assert.match(failed, /Catalogue unavailable/);
  catalogue = { ...catalogue, error: null };
});
test("basket treats zero and negative budgets as unset and blocks failed availability", () => {
  const props = {
    basket: [{ itemId: "chair", quantity: 1 }],
    guestCount: 10,
    weddingDate: "2099-01-01",
    onQty: noop,
    onRemove: noop,
    onCheckout: noop,
  };
  for (const budget of [0, -1, null]) {
    const html = render("components/design/BasketPanel.tsx", {
      ...props,
      budget,
    });
    assert.doesNotMatch(html, /over<|to spare|Budget £/);
  }
  const withBudget = render("components/design/BasketPanel.tsx", {
    ...props,
    budget: 5,
  });
  assert.match(withBudget, /£5 over/);
  availability = {
    ...availability,
    error: "Availability failed",
    checked: false,
  };
  const failed = render("components/design/BasketPanel.tsx", {
    ...props,
    budget: 0,
  });
  assert.match(failed, /Availability failed/);
  assert.match(failed, /disabled=""/);
  availability = { ...availability, error: null, checked: true };
});
test("product sheet marks missing terms explicitly without fabricating product facts", () => {
  const html = render("components/design/ProductDetails.tsx", {
    item,
    onAdd: noop,
    onClose: noop,
  });
  for (const label of [
    "Dimensions",
    "Material",
    "Hire quantity",
    "Booking lead time",
    "Delivery and collection terms",
    "Damage terms",
  ])
    assert.ok(html.includes(label));
  assert.equal(
    (html.match(/Not supplied\. Ask the supplier before booking\./g) || [])
      .length,
    6,
  );
  assert.doesNotMatch(html, /500 verified/);
});
test("board catalogue picker uses thumbnail buttons and leaves board actions optional", () => {
  const html = render("components/wedding/BoardCataloguePicker.tsx", {
    items: [{ ...item, image: "/img/items/chair.png" }],
    savedIds: [],
    pinnedIds: [],
    disabled: false,
    onPick: noop,
  });
  assert.match(html, /<img/);
  assert.match(html, /Illustrative catalogue image/);
  assert.doesNotMatch(html, /<select/);
  assert.equal(
    render("components/wedding/BoardPicker.tsx", {
      target: { kind: "product", ref: "chair" },
    }),
    "",
  );
});
test("saved look removal shows parent errors and disables only pending removals", () => {
  const html = render("components/design/SavedLooks.tsx", {
    looks: [
      { id: "look-1", styleId: "classic", styleName: "Classic", savedAt: 0 },
      { id: "look-2", styleId: "garden", styleName: "Garden", savedAt: 0 },
    ],
    onClose: noop,
    onLoad: noop,
    onUnsave: noop,
    busyIds: new Set(["look-1"]),
    error: "Could not remove saved look",
  });
  assert.match(html, /role="alert"[^>]*>Could not remove saved look/);
  assert.match(
    html,
    /disabled=""[^>]*aria-label="Removing Classic from saved"/,
  );
  assert.doesNotMatch(
    html,
    /disabled=""[^>]*aria-label="Remove Garden from saved"/,
  );
});
