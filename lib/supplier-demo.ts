export const SUPPLIER_DEMO_ID = "33eb18f6-434f-4b71-9ec6-846e0be641a1";
export function supplierDemoAvailable(host: string, database: string) {
  return (
    ["styledukprodprogress.vercel.app", "localhost", "127.0.0.1"].includes(
      host,
    ) && /^https:\/\/qkyeitvwscrxbiwamxan\.supabase\.co\/?$/.test(database)
  );
}
