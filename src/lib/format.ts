const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inr2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat('en-IN');

/** ₹12,34,567 */
export function fmtINR(n: number): string {
  if (!isFinite(n)) return '₹0';
  return inr.format(Math.round(n));
}

/** ₹12,34,567.89 */
export function fmtINR2(n: number): string {
  if (!isFinite(n)) return '₹0.00';
  return inr2.format(n);
}

/** 12,34,567 */
export function fmtNum(n: number): string {
  if (!isFinite(n)) return '0';
  return num.format(Math.round(n));
}

export function fmtPct(n: number, digits = 1): string {
  if (!isFinite(n)) return '0%';
  return `${n.toFixed(digits)}%`;
}

/** Compact Indian format: ₹1.2 Cr / ₹3.4 L / ₹12.3k */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}
