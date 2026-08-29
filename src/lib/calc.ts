import { MARKETPLACES, REVENUE_TYPES } from './types';
import type { AppData, IncomeEntry, GoodsExpense, ServiceExpense } from './types';

// ─── Active-entry filters (confirmed duplicates are excluded from all maths) ──
const act = <T extends { status: string }>(arr: T[]): T[] =>
  arr.filter((e) => e.status === 'active' || e.status === 'ignored');

export const activeIncome = (d: AppData): IncomeEntry[] => act(d.income);
export const activeGoods = (d: AppData): GoodsExpense[] => act(d.goods);
export const activeServices = (d: AppData): ServiceExpense[] => act(d.services);

// ─── Income totals ────────────────────────────────────────────────────────────
export function sumByType(d: AppData, type: string, marketplace?: string): number {
  return activeIncome(d)
    .filter((e) => e.incomeType === type && (!marketplace || e.marketplace === marketplace))
    .reduce((s, e) => s + e.amount, 0);
}

/** Revenue = income types in REVENUE_TYPES. Bank Receipt, TCS, Recoverable NEVER count. */
export function revenue(d: AppData, marketplace?: string): number {
  return activeIncome(d)
    .filter((e) => REVENUE_TYPES.includes(e.incomeType) && (!marketplace || e.marketplace === marketplace))
    .reduce((s, e) => s + e.amount, 0);
}

export function bankReceipts(d: AppData): number {
  return sumByType(d, 'Bank Receipt');
}

export function tcsRecoverables(d: AppData): number {
  return sumByType(d, 'TCS') + sumByType(d, 'Other Recoverable');
}

export function totalOrders(d: AppData, marketplace?: string): number {
  return activeIncome(d)
    .filter((e) => REVENUE_TYPES.includes(e.incomeType) && (!marketplace || e.marketplace === marketplace))
    .reduce((s, e) => s + (e.orders ?? 0), 0);
}

export function totalUnits(d: AppData, marketplace?: string): number {
  return activeIncome(d)
    .filter((e) => REVENUE_TYPES.includes(e.incomeType) && (!marketplace || e.marketplace === marketplace))
    .reduce((s, e) => s + (e.units ?? 0), 0);
}

/** Outstanding receivables = revenue billed but not yet received as bank receipts. */
export function outstandingReceivables(d: AppData): number {
  return Math.max(0, revenue(d) - bankReceipts(d));
}

/** Outstanding payments = unpaid goods purchases + unpaid service expenses. */
export function outstandingPayables(d: AppData): number {
  const g = activeGoods(d).filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0);
  const s = activeServices(d).filter((e) => !e.paid).reduce((x, e) => x + e.amount, 0);
  return g + s;
}

// ─── Inventory (spec §9): Opening + Purchases − Closing = Inventory Consumed ─
export function stockValue(d: AppData, kind: 'opening' | 'closing', categoryId?: string): number {
  return d.stock
    .filter((s) => s.kind === kind && (!categoryId || s.categoryId === categoryId))
    .reduce((sum, s) => sum + s.amount, 0);
}

export function purchaseValue(d: AppData, categoryId?: string): number {
  return activeGoods(d)
    .filter((g) => !categoryId || g.categoryId === categoryId)
    .reduce((s, g) => s + g.amount, 0);
}

export function inventoryConsumed(d: AppData, categoryId?: string): number {
  return stockValue(d, 'opening', categoryId) + purchaseValue(d, categoryId) - stockValue(d, 'closing', categoryId);
}

export function unsoldStockPct(d: AppData): number {
  const base = stockValue(d, 'opening') + purchaseValue(d);
  if (base <= 0) return 0;
  return (stockValue(d, 'closing') / base) * 100;
}

export function sellThroughPct(d: AppData): number {
  return 100 - unsoldStockPct(d);
}

export interface CategoryStockRow {
  categoryId: string;
  category: string;
  opening: number;
  purchases: number;
  closing: number;
  consumed: number;
  unsoldPct: number;
  sellThroughPct: number;
}

export function categoryStockTable(d: AppData): CategoryStockRow[] {
  return d.goodsCategories.map((c) => {
    const opening = stockValue(d, 'opening', c.id);
    const purchases = purchaseValue(d, c.id);
    const closing = stockValue(d, 'closing', c.id);
    const base = opening + purchases;
    return {
      categoryId: c.id,
      category: c.name,
      opening,
      purchases,
      closing,
      consumed: base - closing,
      unsoldPct: base > 0 ? (closing / base) * 100 : 0,
      sellThroughPct: base > 0 ? 100 - (closing / base) * 100 : 0,
    };
  });
}

export interface TypeStockRow {
  category: string;
  productType: string;
  opening: number;
  purchases: number;
  closing: number;
  leftover: number;
  unsoldPct: number;
}

export function productTypeStockTable(d: AppData): TypeStockRow[] {
  const key = (c: string, p?: string) => `${c}||${p ?? ''}`;
  const openMap = new Map<string, number>();
  const closeMap = new Map<string, number>();
  for (const s of d.stock) {
    const m = s.kind === 'opening' ? openMap : closeMap;
    m.set(key(s.categoryId, s.productType), (m.get(key(s.categoryId, s.productType)) ?? 0) + s.amount);
  }
  const purMap = new Map<string, number>();
  for (const g of activeGoods(d)) {
    purMap.set(key(g.categoryId, g.productType), (purMap.get(key(g.categoryId, g.productType)) ?? 0) + g.amount);
  }
  const catName = (id: string) => d.goodsCategories.find((c) => c.id === id)?.name ?? id;
  const rows: TypeStockRow[] = [];
  const allKeys = new Set([...openMap.keys(), ...closeMap.keys(), ...purMap.keys()]);
  for (const k of allKeys) {
    const [catId, pt] = k.split('||');
    const opening = openMap.get(k) ?? 0;
    const purchases = purMap.get(k) ?? 0;
    const closing = closeMap.get(k) ?? 0;
    const base = opening + purchases;
    if (base <= 0 && closing <= 0) continue;
    rows.push({
      category: catName(catId),
      productType: pt || '—',
      opening,
      purchases,
      closing,
      leftover: closing,
      unsoldPct: base > 0 ? (closing / base) * 100 : 0,
    });
  }
  return rows.sort((a, b) => b.leftover - a.leftover);
}

// ─── Expense totals ───────────────────────────────────────────────────────────
export function goodsCost(d: AppData): number {
  return purchaseValue(d);
}

export function adSpend(d: AppData): number {
  return activeServices(d)
    .filter((e) => d.serviceCategories.find((c) => c.id === e.categoryId)?.group === 'advertising')
    .reduce((s, e) => s + e.amount, 0);
}

export function hrCost(d: AppData): number {
  return activeServices(d)
    .filter((e) => d.serviceCategories.find((c) => c.id === e.categoryId)?.group === 'hr')
    .reduce((s, e) => s + e.amount, 0);
}

export function serviceCost(d: AppData): number {
  return activeServices(d)
    .filter((e) => d.serviceCategories.find((c) => c.id === e.categoryId)?.group === 'service')
    .reduce((s, e) => s + e.amount, 0);
}

// ─── Common-expense allocation (spec §7) — never double counts ───────────────
export function allocationWeights(d: AppData): Record<string, number> {
  const method = d.settings.allocationMethod;
  const weights: Record<string, number> = {};
  if (method === 'manual') {
    const total = Object.values(d.settings.manualPercents).reduce((s, v) => s + v, 0);
    for (const m of MARKETPLACES) {
      weights[m] = total > 0 ? (d.settings.manualPercents[m] ?? 0) / total : 0;
    }
    return weights;
  }
  const metric = (m: string) =>
    method === 'revenue' ? revenue(d, m) : method === 'orders' ? totalOrders(d, m) : totalUnits(d, m);
  const totals = MARKETPLACES.map((m) => metric(m));
  const sum = totals.reduce((s, v) => s + v, 0);
  MARKETPLACES.forEach((m, i) => {
    weights[m] = sum > 0 ? totals[i] / sum : 0;
  });
  return weights;
}

// ─── Marketplace P&L (spec §11) ───────────────────────────────────────────────
export interface MarketplacePnLRow {
  marketplace: string;
  revenue: number;
  inventoryConsumed: number; // allocated by revenue %
  advertising: number; // marketplace-specific ad spend
  marketplaceExpenses: number; // other marketplace-specific services
  allocatedCommon: number; // common services by allocation method
  profit: number;
  marginPct: number;
}

export function marketplacePnL(d: AppData): MarketplacePnLRow[] {
  const weights = allocationWeights(d);
  const totalConsumed = inventoryConsumed(d);
  const services = activeServices(d);
  const catOf = (id: string) => d.serviceCategories.find((c) => c.id === id);

  return MARKETPLACES.map((m) => {
    const rev = revenue(d, m);
    const specific = services.filter((e) => e.allocation === 'marketplace' && e.marketplace === m);
    const ads = specific
      .filter((e) => catOf(e.categoryId)?.group === 'advertising')
      .reduce((s, e) => s + e.amount, 0);
    const otherSpecific = specific
      .filter((e) => catOf(e.categoryId)?.group !== 'advertising')
      .reduce((s, e) => s + e.amount, 0);
    const common = services
      .filter((e) => e.allocation === 'common')
      .reduce((s, e) => s + e.amount, 0);
    const allocatedCommon = common * (weights[m] ?? 0);
    const consumedShare = totalConsumed * (rev > 0 && revenue(d) > 0 ? rev / revenue(d) : 0);
    const profit = rev - consumedShare - ads - otherSpecific - allocatedCommon;
    return {
      marketplace: m,
      revenue: rev,
      inventoryConsumed: consumedShare,
      advertising: ads,
      marketplaceExpenses: otherSpecific,
      allocatedCommon,
      profit,
      marginPct: rev > 0 ? (profit / rev) * 100 : 0,
    };
  });
}

// ─── Headline P&L (spec §11 + profit formula) ─────────────────────────────────
export interface Headline {
  totalSales: number;
  marketplaceIncome: number;
  bankReceipts: number;
  goodsCost: number;
  serviceExpenses: number;
  adSpend: number;
  hrCost: number;
  openingStock: number;
  closingStock: number;
  inventoryConsumed: number;
  unsoldStockPct: number;
  sellThroughPct: number;
  grossProfit: number;
  netProfit: number;
  marginPct: number;
  tcsRecoverables: number;
  outstandingReceivables: number;
  outstandingPayables: number;
}

/**
 * Net Profit = Marketplace Sales Income (excl. TCS & recoverables)
 *   − Inventory Consumed (Opening + Purchases − Closing)
 *   − Service Expenses − Advertising − HR (incl. allocated common costs)
 */
export function headline(d: AppData): Headline {
  const rev = revenue(d);
  const consumed = inventoryConsumed(d);
  const ads = adSpend(d);
  const hr = hrCost(d);
  const svc = serviceCost(d);
  const grossProfit = rev - consumed;
  const netProfit = grossProfit - ads - hr - svc;
  return {
    totalSales: rev,
    marketplaceIncome: sumByType(d, 'Marketplace Sales') + sumByType(d, 'Marketplace Settlement'),
    bankReceipts: bankReceipts(d),
    goodsCost: goodsCost(d),
    serviceExpenses: svc,
    adSpend: ads,
    hrCost: hr,
    openingStock: stockValue(d, 'opening'),
    closingStock: stockValue(d, 'closing'),
    inventoryConsumed: consumed,
    unsoldStockPct: unsoldStockPct(d),
    sellThroughPct: sellThroughPct(d),
    grossProfit,
    netProfit,
    marginPct: rev > 0 ? (netProfit / rev) * 100 : 0,
    tcsRecoverables: tcsRecoverables(d),
    outstandingReceivables: outstandingReceivables(d),
    outstandingPayables: outstandingPayables(d),
  };
}

// ─── Post-Mortem (spec §13) — auto-generated findings with thresholds ─────────
export interface Finding {
  severity: 'critical' | 'warning' | 'positive' | 'info';
  title: string;
  detail: string;
}

export interface PostMortem {
  findings: Finding[];
  whatWorked: string[];
  whatDidnt: string[];
  lostMoney: string[];
  overspent: string[];
  overPurchased: string[];
  bestMarketplace: string;
  recommendations: string[];
}

export function postMortem(d: AppData): PostMortem {
  const h = headline(d);
  const pnl = marketplacePnL(d);
  const catTable = categoryStockTable(d);
  const typeTable = productTypeStockTable(d);
  const findings: Finding[] = [];
  const whatWorked: string[] = [];
  const whatDidnt: string[] = [];
  const lostMoney: string[] = [];
  const overspent: string[] = [];
  const overPurchased: string[] = [];
  const recommendations: string[] = [];

  // Empty dataset — nothing to analyse yet
  const hasData = d.income.length + d.goods.length + d.services.length + d.stock.length > 0;
  if (!hasData) {
    return {
      findings: [{
        severity: 'info',
        title: 'No data yet',
        detail: 'Add income, purchases, expenses and stock entries (manually or via Excel import) to auto-generate the Rakhi 2026 post-mortem.',
      }],
      whatWorked,
      whatDidnt,
      lostMoney,
      overspent,
      overPurchased,
      bestMarketplace: '—',
      recommendations: ['Start by entering opening stock, then record purchases and marketplace income as the season progresses.'],
    };
  }

  const f = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
  const pct = (n: number) => `${n.toFixed(1)}%`;

  // Inventory findings
  if (h.unsoldStockPct > 30) {
    findings.push({ severity: 'critical', title: 'High closing stock', detail: `${pct(h.unsoldStockPct)} of total stock value (${f(h.closingStock)}) was left unsold after Rakhi.` });
    whatDidnt.push(`Sell-through was only ${pct(h.sellThroughPct)} — ${f(h.closingStock)} of stock is stranded until next season.`);
    recommendations.push('Rakhi 2027: cut initial purchase quantities by at least 25–30% and buy in two waves with a mid-July re-order checkpoint.');
  } else if (h.unsoldStockPct > 15) {
    findings.push({ severity: 'warning', title: 'Moderate leftover stock', detail: `${pct(h.unsoldStockPct)} unsold (${f(h.closingStock)}).` });
  } else {
    findings.push({ severity: 'positive', title: 'Healthy sell-through', detail: `Only ${pct(h.unsoldStockPct)} of stock left unsold.` });
    whatWorked.push(`Strong inventory discipline — ${pct(h.sellThroughPct)} sell-through.`);
  }

  const worstCats = catTable.filter((c) => c.opening + c.purchases > 0).sort((a, b) => b.closing - a.closing);
  if (worstCats[0] && worstCats[0].closing > 0) {
    findings.push({
      severity: worstCats[0].unsoldPct > 40 ? 'critical' : 'warning',
      title: `Largest leftover category: ${worstCats[0].category}`,
      detail: `${f(worstCats[0].closing)} closing stock (${pct(worstCats[0].unsoldPct)} unsold).`,
    });
    overPurchased.push(`${worstCats[0].category}: ${f(worstCats[0].closing)} leftover (${pct(worstCats[0].unsoldPct)} of available stock).`);
  }
  for (const c of catTable.filter((c) => c.unsoldPct > 40 && c.opening + c.purchases > 50000)) {
    if (c.categoryId !== worstCats[0]?.categoryId) overPurchased.push(`${c.category}: ${pct(c.unsoldPct)} unsold (${f(c.closing)}).`);
  }
  const worstTypes = typeTable.filter((t) => t.unsoldPct > 50 && t.opening + t.purchases > 30000).slice(0, 3);
  for (const t of worstTypes) {
    findings.push({ severity: 'warning', title: `Poor sell-through: ${t.category} / ${t.productType}`, detail: `${pct(t.unsoldPct)} unsold, ${f(t.leftover)} leftover.` });
  }

  // Advertising
  const adPct = h.totalSales > 0 ? (h.adSpend / h.totalSales) * 100 : 0;
  if (adPct > 15) {
    findings.push({ severity: 'critical', title: 'High advertising spend', detail: `Ad spend ${f(h.adSpend)} = ${pct(adPct)} of revenue (threshold 15%).` });
    overspent.push(`Paid advertising consumed ${pct(adPct)} of revenue (${f(h.adSpend)}).`);
    recommendations.push('Rakhi 2027: cap blended ad spend at 12–15% of revenue with weekly ACOS reviews per marketplace.');
  } else {
    findings.push({ severity: 'positive', title: 'Ad spend within range', detail: `${pct(adPct)} of revenue.` });
  }

  // HR / manpower
  const hrPct = h.totalSales > 0 ? (h.hrCost / h.totalSales) * 100 : 0;
  if (hrPct > 12) {
    findings.push({ severity: 'warning', title: 'High manpower cost', detail: `HR/manpower ${f(h.hrCost)} = ${pct(hrPct)} of revenue (threshold 12%).` });
    overspent.push(`Manpower cost hit ${pct(hrPct)} of revenue (${f(h.hrCost)}).`);
    recommendations.push('Rakhi 2027: shift more packing work to per-piece temporary contracts instead of fixed salary allocation.');
  }

  // Services
  const svcPct = h.totalSales > 0 ? (h.serviceExpenses / h.totalSales) * 100 : 0;
  if (svcPct > 8) {
    findings.push({ severity: 'warning', title: 'High service expenses', detail: `Service expenses ${f(h.serviceExpenses)} = ${pct(svcPct)} of revenue (threshold 8%).` });
    overspent.push(`Service expenses reached ${pct(svcPct)} of revenue (${f(h.serviceExpenses)}).`);
  }

  // Marketplace analysis
  const active = pnl.filter((p) => p.revenue > 0);
  const best = [...active].sort((a, b) => b.marginPct - a.marginPct)[0];
  const totalRev = h.totalSales;
  const bestMarketplace = best ? best.marketplace : '—';
  if (best) {
    findings.push({ severity: 'positive', title: `Best margin marketplace: ${best.marketplace}`, detail: `${pct(best.marginPct)} margin on ${f(best.revenue)} revenue (${f(best.profit)} profit).` });
    whatWorked.push(`${best.marketplace} delivered the best margin at ${pct(best.marginPct)}.`);
  }
  for (const p of active) {
    const revShare = totalRev > 0 ? (p.revenue / totalRev) * 100 : 0;
    if (revShare > 25 && p.marginPct < 5) {
      findings.push({ severity: 'critical', title: `High revenue, low profit: ${p.marketplace}`, detail: `${pct(revShare)} of revenue but only ${pct(p.marginPct)} margin.` });
      lostMoney.push(`${p.marketplace}: ${f(p.revenue)} revenue produced only ${f(p.profit)} profit (${pct(p.marginPct)} margin).`);
    }
    if (p.profit < 0) {
      findings.push({ severity: 'critical', title: `Loss-making marketplace: ${p.marketplace}`, detail: `Loss of ${f(Math.abs(p.profit))} on ${f(p.revenue)} revenue.` });
      lostMoney.push(`${p.marketplace} ran at a ${f(Math.abs(p.profit))} loss.`);
    }
  }

  // Unusual expenses (single expense > 3× average)
  const allExp = [...activeServices(d)];
  if (allExp.length > 2) {
    const avg = allExp.reduce((s, e) => s + e.amount, 0) / allExp.length;
    for (const e of allExp.filter((e) => e.amount > avg * 3)) {
      const catName = d.serviceCategories.find((c) => c.id === e.categoryId)?.name ?? 'Expense';
      findings.push({ severity: 'info', title: `Unusual expense: ${catName}`, detail: `${f(e.amount)} is more than 3× the average expense (${f(avg)}). Verify necessity.` });
    }
  }

  // Duplicates
  const pendingDup = d.duplicates.filter((x) => x.status === 'pending').length;
  const confirmedDup = d.duplicates.filter((x) => x.status === 'confirmed').length;
  if (pendingDup + confirmedDup > 0) {
    findings.push({ severity: pendingDup > 0 ? 'warning' : 'info', title: 'Duplicate transactions detected', detail: `${confirmedDup} confirmed, ${pendingDup} pending review.` });
    if (pendingDup > 0) recommendations.push(`Resolve ${pendingDup} pending duplicate flag(s) before locking final numbers.`);
  }

  // Overall result
  if (h.netProfit >= 0) {
    whatWorked.push(`Project closed profitable: ${f(h.netProfit)} net profit at ${pct(h.marginPct)} margin.`);
  } else {
    lostMoney.push(`Overall net loss of ${f(Math.abs(h.netProfit))} (${pct(Math.abs(h.marginPct))} of revenue).`);
    whatDidnt.push('The project as a whole did not recover its costs.');
  }

  if (h.outstandingReceivables > 0) {
    findings.push({ severity: 'info', title: 'Outstanding receivables', detail: `${f(h.outstandingReceivables)} of revenue not yet received as bank receipts.` });
  }

  // Generic recommendations
  recommendations.push('Rakhi 2027: lock category-wise purchase budgets before 1 June and enforce them in this tool.');
  recommendations.push(`Replicate the ${bestMarketplace} playbook (its margin structure) on the two weakest marketplaces.`);
  if (overPurchased.length > 0) recommendations.push('Liquidate leftover stock early via wholesale/clearance combos instead of holding for a full year.');

  return { findings, whatWorked, whatDidnt, lostMoney, overspent, overPurchased, bestMarketplace, recommendations };
}
