// Setup acknowledgements do not determine publication. Live count comes from
// the same signed-out visibility rules as the public catalogue.
export function supplierReadiness(input: {
  logoUrl: string | null;
  availabilityReviewedAt: string | null;
  total: number;
  draft: number;
  live: number;
  supplierId: string;
}) {
  const steps = [!!input.logoUrl, input.total > 0, !!input.availabilityReviewedAt];
  return {
    steps,
    completed: steps.filter(Boolean).length,
    total: input.total,
    draft: input.draft,
    live: input.live,
    publicProfileHref: input.live > 0 ? `/suppliers/${encodeURIComponent(input.supplierId)}` : null,
  };
}
