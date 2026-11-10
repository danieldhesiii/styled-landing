import products from './crescent-moon-preview.json';
import type { CatalogueItem } from './types';

export function crescentMoonDemoCatalogue(): CatalogueItem[] {
  return products.map((product): CatalogueItem => {
    const dimensions = `Drop ${product.dropCm} cm · diameter ${product.diameterCm} cm · weight ${product.weightKg} kg`;
    const brochureDetails = `${product.bulbs} dimmable incandescent bulbs · ${product.outputW} W output`;
    return {
      id: `demo-crescent-moon-${product.slug}`,
      name: product.name,
      category: 'lighting',
      slot: 'lighting',
      supplier: 'Crescent Moon',
      supplierArea: 'UK-wide delivery',
      unitPrice: product.mockPricing ? product.mockPricing.dailyHireGBP + product.mockPricing.deliverySetupCollectionGBP + product.mockPricing.damageDepositGBP : 0,
      unit: product.mockPricing ? 'one-day estimate, each' : 'price on request',
      qtyRule: 'fixed',
      styles: ['classic_elegance', 'manor_orangery'],
      icon: '✦',
      swatch: '#c8b69d',
      image: `/img/items/crescent-moon-demo/${product.image}`,
      imageKind: 'supplier_reference',
      rating: 0,
      reviewCount: 0,
      reviewsVerified: false,
      leadTimeDays: 0,
      stock: 'on_request',
      dimensions,
      material: 'Crystal chandelier.',
      hireUnits: brochureDetails,
      deliveryTerms: 'UK-wide delivery. Delivery, installation and collection are arranged for your venue.',
      damageTerms: product.mockPricing
        ? `Refundable damage deposit: £${product.mockPricing.damageDepositGBP}.`
        : 'Damage deposit to be confirmed in your hire quote.',
      note: product.description,
      demoOnly: true,
      requestOnly: true,
      demoPricing: product.mockPricing,
      priceOnRequest: !product.mockPricing,
    };
  });
}
