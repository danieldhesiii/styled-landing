"use client";

import StockImportPanel from "@/components/stock/StockImportPanel";

// A supplier uploads their own stock list: new products and updated prices and
// stock in one go, with a preview before anything is saved.
export default function PortalImportPage() {
  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Import your stock list</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/55">
        Upload a CSV to update products, prices and quantities. Review changes before saving.
      </p>
      <ol className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <li className="rounded-xl border border-sand p-4">
          <span className="block text-xs text-clay">01</span> Download the
          template and add your pieces.
        </li>
        <li className="rounded-xl border border-sand p-4">
          <span className="block text-xs text-clay">02</span> Upload a CSV and
          review prices, stock and changes.
        </li>
        <li className="rounded-xl border border-sand p-4">
          <span className="block text-xs text-clay">03</span> Apply the checked
          rows, then add photos in Products and submit your range for review.
        </li>
      </ol>
      <div className="mt-6">
        <StockImportPanel endpoint="/api/vendor/stock-import" vendor />
      </div>
    </div>
  );
}
