"use client";

import StockImportPanel from "@/components/stock/StockImportPanel";

// A supplier uploads their own stock list: new products and updated prices and
// stock in one go, with a preview before anything is saved.
export default function PortalImportPage() {
  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Import your stock list</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/55">
        Keep one spreadsheet of what you hire out and how many you have. Upload it here whenever it changes, and your prices
        and stock here are updated to match. You can also edit a single product from the Products page.
      </p>
      <div className="mt-6">
        <StockImportPanel endpoint="/api/vendor/stock-import" vendor />
      </div>
    </div>
  );
}
