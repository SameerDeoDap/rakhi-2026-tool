import { uid, nowIso } from './types';
import type {
  AppData, DuplicateFlag, DuplicateEntryKind, IncomeEntry, GoodsExpense, ServiceExpense,
} from './types';

/**
 * Duplicate detection (spec §10).
 * Flags POSSIBLE duplicates — never auto-deletes.
 * Match signals: amount, date, marketplace, seller account, category,
 * reference / settlement ID / bank ref, description similarity.
 */

interface DupCandidate {
  kind: DuplicateEntryKind;
  entryId: string;
  matchedEntryId: string;
  reason: string;
}

function norm(s?: string): string {
  return (s ?? '').trim().toLowerCase();
}

function similar(a?: string, b?: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // containment similarity for descriptions
  return x.length >= 8 && y.length >= 8 && (x.includes(y) || y.includes(x));
}

function detectIncome(income: IncomeEntry[]): DupCandidate[] {
  const out: DupCandidate[] = [];
  for (let i = 0; i < income.length; i++) {
    for (let j = i + 1; j < income.length; j++) {
      const a = income[i];
      const b = income[j];
      if (a.status === 'confirmed-duplicate' || b.status === 'confirmed-duplicate') continue;
      const signals: string[] = [];
      if (a.amount === b.amount) signals.push('same amount');
      if (a.date === b.date) signals.push('same date');
      if (a.marketplace === b.marketplace) signals.push('same marketplace');
      if (a.sellerAccountId && a.sellerAccountId === b.sellerAccountId) signals.push('same seller account');
      if (a.incomeType === b.incomeType) signals.push('same income type');
      if (norm(a.settlementId) && norm(a.settlementId) === norm(b.settlementId)) signals.push('same settlement ID');
      if (norm(a.bankRef) && norm(a.bankRef) === norm(b.bankRef)) signals.push('same bank reference');
      if (norm(a.reference) && norm(a.reference) === norm(b.reference)) signals.push('same reference');
      if (similar(a.description, b.description)) signals.push('similar description');

      const strongRef =
        (norm(a.settlementId) && norm(a.settlementId) === norm(b.settlementId)) ||
        (norm(a.bankRef) && norm(a.bankRef) === norm(b.bankRef)) ||
        (norm(a.reference) && norm(a.reference) === norm(b.reference));
      const hardMatch = a.amount === b.amount && a.date === b.date && a.marketplace === b.marketplace && a.incomeType === b.incomeType;

      if (strongRef || hardMatch || (a.amount === b.amount && signals.length >= 5)) {
        out.push({
          kind: 'income',
          entryId: b.id,
          matchedEntryId: a.id,
          reason: `Matched on: ${signals.join(', ')}`,
        });
      }
    }
  }
  return out;
}

function detectGoods(goods: GoodsExpense[]): DupCandidate[] {
  const out: DupCandidate[] = [];
  for (let i = 0; i < goods.length; i++) {
    for (let j = i + 1; j < goods.length; j++) {
      const a = goods[i];
      const b = goods[j];
      if (a.status === 'confirmed-duplicate' || b.status === 'confirmed-duplicate') continue;
      const signals: string[] = [];
      if (a.amount === b.amount) signals.push('same amount');
      if (a.date === b.date) signals.push('same date');
      if (a.categoryId === b.categoryId) signals.push('same category');
      if (norm(a.productType) === norm(b.productType)) signals.push('same product type');
      if (a.qty === b.qty) signals.push('same qty');
      if (norm(a.reference) && norm(a.reference) === norm(b.reference)) signals.push('same reference');
      if (similar(a.description, b.description)) signals.push('similar description');
      if (similar(a.vendor, b.vendor)) signals.push('same vendor');

      const strongRef = norm(a.reference) && norm(a.reference) === norm(b.reference);
      if (strongRef || (a.amount === b.amount && signals.length >= 5)) {
        out.push({ kind: 'goods', entryId: b.id, matchedEntryId: a.id, reason: `Matched on: ${signals.join(', ')}` });
      }
    }
  }
  return out;
}

function detectServices(services: ServiceExpense[]): DupCandidate[] {
  const out: DupCandidate[] = [];
  for (let i = 0; i < services.length; i++) {
    for (let j = i + 1; j < services.length; j++) {
      const a = services[i];
      const b = services[j];
      if (a.status === 'confirmed-duplicate' || b.status === 'confirmed-duplicate') continue;
      const signals: string[] = [];
      if (a.amount === b.amount) signals.push('same amount');
      if (a.date === b.date) signals.push('same date');
      if (a.categoryId === b.categoryId) signals.push('same category');
      if (a.allocation === b.allocation) signals.push('same allocation');
      if (norm(a.marketplace) === norm(b.marketplace)) signals.push('same marketplace');
      if (norm(a.reference) && norm(a.reference) === norm(b.reference)) signals.push('same reference');
      if (similar(a.description, b.description)) signals.push('similar description');
      if (similar(a.vendor, b.vendor)) signals.push('same vendor');

      const strongRef = norm(a.reference) && norm(a.reference) === norm(b.reference);
      if (strongRef || (a.amount === b.amount && signals.length >= 5)) {
        out.push({ kind: 'service', entryId: b.id, matchedEntryId: a.id, reason: `Matched on: ${signals.join(', ')}` });
      }
    }
  }
  return out;
}

/** Re-scan the dataset and add new pending flags (existing resolutions are preserved). */
export function scanDuplicates(data: AppData): AppData {
  const existing = new Set(data.duplicates.map((d) => `${d.entryKind}:${d.entryId}:${d.matchedEntryId}`));
  const candidates = [
    ...detectIncome(data.income),
    ...detectGoods(data.goods),
    ...detectServices(data.services),
  ];
  const fresh: DuplicateFlag[] = candidates
    .filter((c) => !existing.has(`${c.kind}:${c.entryId}:${c.matchedEntryId}`) && !existing.has(`${c.kind}:${c.matchedEntryId}:${c.entryId}`))
    .map((c) => ({
      id: uid(),
      entryKind: c.kind,
      entryId: c.entryId,
      matchedEntryId: c.matchedEntryId,
      reason: c.reason,
      status: 'pending',
      createdAt: nowIso(),
    }));
  if (fresh.length === 0) return data;
  return { ...data, duplicates: [...data.duplicates, ...fresh] };
}
