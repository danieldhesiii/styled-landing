import type { CatalogueItem } from './types';

export function oneDayDemoTotal(item: CatalogueItem): number | null {
  const pricing = item.demoPricing;
  if (!item.demoOnly || item.priceOnRequest || !pricing) return null;
  return pricing.dailyHireGBP + pricing.deliverySetupCollectionGBP + pricing.damageDepositGBP;
}

export function cataloguePriceForSort(item: CatalogueItem): number | null {
  if (item.priceOnRequest || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) return null;
  return item.demoOnly ? oneDayDemoTotal(item) : item.unitPrice;
}
