import {
  SERVICE_LABELS,
  type SupplierServices,
} from "@/lib/supplier-workspace";
export default function SupplierRules({
  services: s,
}: {
  services: Partial<SupplierServices>;
}) {
  if (
    !s.coverage &&
    !s.deliveryNotes &&
    !s.returnNotes &&
    !s.cancellation &&
    !s.damage
  )
    return null;
  return (
    <section className="mt-8 border-y border-sand py-6">
      <h2 className="font-serif text-2xl">Delivery and hire information</h2>
      <p className="mt-2 text-sm text-ink/60">
        Provided by the supplier. Confirm the details and final quote for your
        dates before booking.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {s.delivery && (
          <span className="rounded-full bg-sage/15 px-3 py-2">
            Delivery offered
          </span>
        )}
        {s.collection && (
          <span className="rounded-full bg-sage/15 px-3 py-2">
            Collection offered
          </span>
        )}
        {s.setup && (
          <span className="rounded-full bg-sage/15 px-3 py-2">
            Setup offered
          </span>
        )}
      </div>
      <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
        {Object.entries(SERVICE_LABELS).map(
          ([k, label]) =>
            s[k as keyof SupplierServices] && (
              <div key={k}>
                <dt className="font-medium">{label}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-ink/70">
                  {String(s[k as keyof SupplierServices])}
                </dd>
              </div>
            ),
        )}
        {s.minimumOrder && (
          <div>
            <dt className="font-medium">Minimum hire-item subtotal</dt>
            <dd>£{Number(s.minimumOrder).toFixed(2)} excluding delivery and security deposits</dd>
          </div>
        )}
        {s.depositPercent && (
          <div>
            <dt className="font-medium">Supplier reservation deposit</dt>
            <dd>{s.depositPercent}% if agreed in your final quote</dd>
          </div>
        )}
        {s.balanceDays && (
          <div>
            <dt className="font-medium">Balance timing</dt>
            <dd>
              {s.balanceDays} days before the event, subject to your agreement
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
