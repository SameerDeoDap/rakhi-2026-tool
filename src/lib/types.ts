// ─── Rakhi 2026 Project — core data model (spec §14) ─────────────────────────

export type Role = 'admin' | 'user';

export const MARKETPLACES = ['Amazon', 'Flipkart', 'Meesho', 'DeoDap.in', 'Wholesale', 'Other'] as const;

export const INCOME_TYPES = [
  'Marketplace Sales',
  'Marketplace Settlement',
  'Bank Receipt',
  'TCS',
  'Other Recoverable',
  'Other Income',
] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

/** Types that count as revenue in the profit formula. Bank Receipt / TCS / Recoverable NEVER count. */
export const REVENUE_TYPES: IncomeType[] = ['Marketplace Sales', 'Marketplace Settlement', 'Other Income'];

export interface SellerAccount {
  id: string;
  marketplace: string;
  name: string;
}

export interface GoodsCategory {
  id: string;
  name: string;
  productTypes: string[];
}

export type ServiceGroup = 'advertising' | 'hr' | 'service';

export interface ServiceCategory {
  id: string;
  name: string;
  definition: string;
  group: ServiceGroup;
}

export interface AuditEvent {
  at: string; // ISO timestamp
  by: string; // role or username
  action: string;
  note?: string;
}

export type EntryStatus = 'active' | 'confirmed-duplicate' | 'ignored';
export type EntrySource = 'manual' | 'import' | 'seed';

export interface IncomeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  marketplace: string;
  sellerAccountId?: string;
  incomeType: IncomeType;
  amount: number;
  orders?: number;
  units?: number;
  reference?: string;
  settlementId?: string;
  bankRef?: string;
  description?: string;
  status: EntryStatus;
  source: EntrySource;
  audit: AuditEvent[];
}

export interface GoodsExpense {
  id: string;
  date: string;
  categoryId: string;
  productType?: string;
  qty: number;
  rate: number;
  amount: number;
  vendor?: string;
  marketplace?: string; // optional allocation
  paid: boolean;
  reference?: string;
  description?: string;
  status: EntryStatus;
  source: EntrySource;
  audit: AuditEvent[];
}

export interface ServiceExpense {
  id: string;
  date: string;
  categoryId: string;
  amount: number;
  allocation: 'common' | 'marketplace';
  marketplace?: string;
  vendor?: string;
  paid: boolean;
  reference?: string;
  description?: string;
  status: EntryStatus;
  source: EntrySource;
  audit: AuditEvent[];
}

export interface StockEntry {
  id: string;
  kind: 'opening' | 'closing';
  date: string;
  categoryId: string;
  productType?: string;
  qty: number;
  rate: number;
  amount: number;
  source: EntrySource;
  audit: AuditEvent[];
}

export type DuplicateEntryKind = 'income' | 'goods' | 'service';

export interface DuplicateFlag {
  id: string;
  entryKind: DuplicateEntryKind;
  entryId: string;
  matchedEntryId: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'valid' | 'ignored';
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  note?: string;
}

export type AllocationMethod = 'revenue' | 'orders' | 'units' | 'manual';

export interface AppSettings {
  allocationMethod: AllocationMethod;
  manualPercents: Record<string, number>; // marketplace -> %
}

export interface AppData {
  version: number;
  sellerAccounts: SellerAccount[];
  goodsCategories: GoodsCategory[];
  serviceCategories: ServiceCategory[];
  income: IncomeEntry[];
  goods: GoodsExpense[];
  services: ServiceExpense[];
  stock: StockEntry[];
  duplicates: DuplicateFlag[];
  settings: AppSettings;
  seeded: boolean;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
