// Use cent amounts consistently. Round each line before summing, then discount and tax.
export const cents = value => Math.round((Number(value) + Number.EPSILON) * 100);
export const roundUSD = value => cents(value) / 100;
export function invoiceTotals(items, discount = 0, taxRate = 0) {
  const subtotalCents = items.reduce((total, item) =>
    total + cents(Number(item.quantity) * Number(item.price)), 0);
  const discountCents = cents(discount);
  const rate = Number(taxRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100 ||
      discountCents < 0 || discountCents > subtotalCents) {
    throw new Error('Discount or tax rate is invalid');
  }
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableCents * rate / 100) + Number.EPSILON);
  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    tax: taxCents / 100,
    total: (taxableCents + taxCents) / 100
  };
}
