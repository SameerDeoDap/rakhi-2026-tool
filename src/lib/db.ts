import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AppData, AppSettings, DuplicateFlag, GoodsCategory, GoodsExpense,
  IncomeEntry, SellerAccount, ServiceCategory, ServiceExpense, StockEntry,
} from './types';
import { buildSeed } from './seed';

/**
 * Data layer — dual mode.
 *
 * SHARED mode: when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are present,
 * all data loads from and writes through to Supabase (one shared dataset for
 * the whole team), with a realtime subscription for live updates.
 *
 * LOCAL mode: without those env vars the app behaves exactly as before —
 * everything lives in this browser's localStorage.
 *
 * localStorage is also written in shared mode as an offline cache.
 */

const STORAGE_KEY = 'rakhi2026.data.v2'; // v2: starts empty (no demo dataset)
const SESSION_KEY = 'rakhi2026.session';

// ─── Mode detection ─────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the app is connected to the shared Supabase backend. */
export const SHARED_MODE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabase: SupabaseClient | null = null;
if (SHARED_MODE) {
  supabase = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
}

// ─── Local mode (unchanged behavior) ────────────────────────────────────────

export function emptyData(): AppData {
  return buildSeed(); // structure only, zero transactions
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = emptyData();
      saveData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.version) throw new Error('bad data');
    return parsed;
  } catch {
    const fresh = emptyData();
    saveData(fresh);
    return fresh;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportJSON(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rakhi-2026-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportJSON(text: string): AppData {
  const parsed = JSON.parse(text) as AppData;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.income) || !Array.isArray(parsed.goods)) {
    throw new Error('Not a valid Rakhi 2026 data file');
  }
  return { ...parsed, version: 1 };
}

// ─── Session (role) ─────────────────────────────────────────────────────────
export type SessionRole = 'admin' | 'user' | null;

export function loadSession(): SessionRole {
  const v = localStorage.getItem(SESSION_KEY);
  return v === 'admin' || v === 'user' ? v : null;
}

export function saveSession(role: SessionRole): void {
  if (role) localStorage.setItem(SESSION_KEY, role);
  else localStorage.removeItem(SESSION_KEY);
}

// ─── Shared mode: row mapping (types.ts ⇄ snake_case columns) ───────────────

type Row = Record<string, unknown>;
const s = (v: unknown): string | undefined => (v === null || v === undefined ? undefined : String(v));
const n = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : Number(v));

const incomeToRow = (e: IncomeEntry): Row => ({
  id: e.id, date: e.date, marketplace: e.marketplace ?? null,
  seller_account_id: e.sellerAccountId ?? null, income_type: e.incomeType,
  amount: e.amount, orders: e.orders ?? null, units: e.units ?? null,
  reference: e.reference ?? null, settlement_id: e.settlementId ?? null,
  bank_ref: e.bankRef ?? null, description: e.description ?? null,
  status: e.status, source: e.source, audit: e.audit,
});
const incomeFromRow = (r: Row): IncomeEntry => ({
  id: String(r.id), date: String(r.date), marketplace: s(r.marketplace) ?? '',
  sellerAccountId: s(r.seller_account_id),
  incomeType: String(r.income_type) as IncomeEntry['incomeType'],
  amount: Number(r.amount), orders: n(r.orders), units: n(r.units),
  reference: s(r.reference), settlementId: s(r.settlement_id), bankRef: s(r.bank_ref),
  description: s(r.description),
  status: String(r.status) as IncomeEntry['status'],
  source: String(r.source) as IncomeEntry['source'],
  audit: (r.audit ?? []) as IncomeEntry['audit'],
});

const goodsToRow = (e: GoodsExpense): Row => ({
  id: e.id, date: e.date, category_id: e.categoryId, product_type: e.productType ?? null,
  qty: e.qty, rate: e.rate, amount: e.amount, vendor: e.vendor ?? null,
  marketplace: e.marketplace ?? null, paid: e.paid,
  reference: e.reference ?? null, description: e.description ?? null,
  status: e.status, source: e.source, audit: e.audit,
});
const goodsFromRow = (r: Row): GoodsExpense => ({
  id: String(r.id), date: String(r.date), categoryId: String(r.category_id),
  productType: s(r.product_type), qty: Number(r.qty), rate: Number(r.rate),
  amount: Number(r.amount), vendor: s(r.vendor), marketplace: s(r.marketplace),
  paid: Boolean(r.paid), reference: s(r.reference), description: s(r.description),
  status: String(r.status) as GoodsExpense['status'],
  source: String(r.source) as GoodsExpense['source'],
  audit: (r.audit ?? []) as GoodsExpense['audit'],
});

const serviceToRow = (e: ServiceExpense): Row => ({
  id: e.id, date: e.date, category_id: e.categoryId, amount: e.amount,
  allocation: e.allocation, marketplace: e.marketplace ?? null, vendor: e.vendor ?? null,
  paid: e.paid, reference: e.reference ?? null, description: e.description ?? null,
  status: e.status, source: e.source, audit: e.audit,
});
const serviceFromRow = (r: Row): ServiceExpense => ({
  id: String(r.id), date: String(r.date), categoryId: String(r.category_id),
  amount: Number(r.amount),
  allocation: String(r.allocation) as ServiceExpense['allocation'],
  marketplace: s(r.marketplace), vendor: s(r.vendor), paid: Boolean(r.paid),
  reference: s(r.reference), description: s(r.description),
  status: String(r.status) as ServiceExpense['status'],
  source: String(r.source) as ServiceExpense['source'],
  audit: (r.audit ?? []) as ServiceExpense['audit'],
});

const stockToRow = (e: StockEntry): Row => ({
  id: e.id, kind: e.kind, date: e.date, category_id: e.categoryId,
  product_type: e.productType ?? null, qty: e.qty, rate: e.rate, amount: e.amount,
  source: e.source, audit: e.audit,
});
const stockFromRow = (r: Row): StockEntry => ({
  id: String(r.id), kind: String(r.kind) as StockEntry['kind'], date: String(r.date),
  categoryId: String(r.category_id), productType: s(r.product_type),
  qty: Number(r.qty), rate: Number(r.rate), amount: Number(r.amount),
  source: String(r.source) as StockEntry['source'],
  audit: (r.audit ?? []) as StockEntry['audit'],
});

const sellerToRow = (e: SellerAccount): Row => ({ id: e.id, marketplace: e.marketplace, name: e.name });
const sellerFromRow = (r: Row): SellerAccount => ({
  id: String(r.id), marketplace: String(r.marketplace), name: String(r.name),
});

const goodsCatToRow = (e: GoodsCategory): Row => ({ id: e.id, name: e.name, product_types: e.productTypes });
const goodsCatFromRow = (r: Row): GoodsCategory => ({
  id: String(r.id), name: String(r.name), productTypes: (r.product_types ?? []) as string[],
});

const svcCatToRow = (e: ServiceCategory): Row => ({
  id: e.id, name: e.name, definition: e.definition, group: e.group,
});
const svcCatFromRow = (r: Row): ServiceCategory => ({
  id: String(r.id), name: String(r.name), definition: String(r.definition ?? ''),
  group: String(r.group) as ServiceCategory['group'],
});

const dupToRow = (e: DuplicateFlag): Row => ({
  id: e.id, entry_kind: e.entryKind, entry_id: e.entryId, matched_entry_id: e.matchedEntryId,
  reason: e.reason, status: e.status, created_at: e.createdAt,
  resolved_by: e.resolvedBy ?? null, resolved_at: e.resolvedAt ?? null, note: e.note ?? null,
});
const dupFromRow = (r: Row): DuplicateFlag => ({
  id: String(r.id), entryKind: String(r.entry_kind) as DuplicateFlag['entryKind'],
  entryId: String(r.entry_id), matchedEntryId: String(r.matched_entry_id),
  reason: String(r.reason ?? ''), status: String(r.status) as DuplicateFlag['status'],
  createdAt: String(r.created_at), resolvedBy: s(r.resolved_by), resolvedAt: s(r.resolved_at),
  note: s(r.note),
});

interface SettingsValue extends AppSettings {
  version: number;
  seeded: boolean;
}

// ─── Shared mode: load everything ───────────────────────────────────────────

export async function loadRemote(): Promise<AppData> {
  if (!supabase) throw new Error('Supabase is not configured');
  const [sellers, gCats, sCats, income, goods, services, stock, dups, settingsRes] = await Promise.all([
    supabase.from('seller_accounts').select('*'),
    supabase.from('goods_categories').select('*'),
    supabase.from('service_categories').select('*'),
    supabase.from('income').select('*'),
    supabase.from('goods').select('*'),
    supabase.from('services').select('*'),
    supabase.from('stock').select('*'),
    supabase.from('duplicates').select('*'),
    supabase.from('settings').select('*').eq('key', 'app').maybeSingle(),
  ]);
  const firstError = [sellers, gCats, sCats, income, goods, services, stock, dups, settingsRes]
    .map((r) => r.error)
    .find(Boolean);
  if (firstError) throw new Error(firstError.message);

  const fresh = emptyData();
  const settingsValue = (settingsRes.data?.value ?? null) as SettingsValue | null;

  return {
    version: settingsValue?.version ?? 1,
    seeded: settingsValue?.seeded ?? false,
    // Keep the built-in category framework when the shared DB is still empty
    sellerAccounts: (sellers.data ?? []).map(sellerFromRow),
    goodsCategories: (gCats.data ?? []).length > 0 ? (gCats.data ?? []).map(goodsCatFromRow) : fresh.goodsCategories,
    serviceCategories: (sCats.data ?? []).length > 0 ? (sCats.data ?? []).map(svcCatFromRow) : fresh.serviceCategories,
    income: (income.data ?? []).map(incomeFromRow),
    goods: (goods.data ?? []).map(goodsFromRow),
    services: (services.data ?? []).map(serviceFromRow),
    stock: (stock.data ?? []).map(stockFromRow),
    duplicates: (dups.data ?? []).map(dupFromRow),
    settings: settingsValue
      ? { allocationMethod: settingsValue.allocationMethod, manualPercents: settingsValue.manualPercents ?? {} }
      : fresh.settings,
  };
}

// ─── Shared mode: write-through (row-level diff → upsert/delete) ────────────

async function syncTable<T extends { id: string }>(
  table: string,
  prev: T[],
  next: T[],
  toRow: (e: T) => Row,
): Promise<void> {
  if (!supabase || prev === next) return;
  const prevMap = new Map(prev.map((e) => [e.id, e]));
  const nextIds = new Set(next.map((e) => e.id));
  const upserts = next.filter((e) => prevMap.get(e.id) !== e).map(toRow);
  const deletes = prev.filter((e) => !nextIds.has(e.id)).map((e) => e.id);
  if (upserts.length > 0) {
    const { error } = await supabase.from(table).upsert(upserts);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  if (deletes.length > 0) {
    const { error } = await supabase.from(table).delete().in('id', deletes);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/** Push the difference between two app states to Supabase (per-row writes). */
export async function pushDiff(prev: AppData, next: AppData): Promise<void> {
  if (!supabase) return;
  await Promise.all([
    syncTable('seller_accounts', prev.sellerAccounts, next.sellerAccounts, sellerToRow),
    syncTable('goods_categories', prev.goodsCategories, next.goodsCategories, goodsCatToRow),
    syncTable('service_categories', prev.serviceCategories, next.serviceCategories, svcCatToRow),
    syncTable('income', prev.income, next.income, incomeToRow),
    syncTable('goods', prev.goods, next.goods, goodsToRow),
    syncTable('services', prev.services, next.services, serviceToRow),
    syncTable('stock', prev.stock, next.stock, stockToRow),
    syncTable('duplicates', prev.duplicates, next.duplicates, dupToRow),
  ]);
  if (prev.settings !== next.settings || prev.version !== next.version || prev.seeded !== next.seeded) {
    const value: SettingsValue = {
      allocationMethod: next.settings.allocationMethod,
      manualPercents: next.settings.manualPercents,
      version: next.version,
      seeded: next.seeded,
    };
    const { error } = await supabase.from('settings').upsert({ key: 'app', value });
    if (error) throw new Error(`settings: ${error.message}`);
  }
}

// ─── Shared mode: live updates (realtime, 15 s polling fallback) ────────────

/**
 * Subscribe to remote changes. Calls onRemote (debounce it yourself) whenever
 * any table changes. If the realtime channel fails, falls back to polling
 * every 15 seconds. Returns an unsubscribe function.
 */
export function subscribeRemote(onRemote: () => void): () => void {
  if (!supabase) return () => undefined;
  let poll: ReturnType<typeof setInterval> | null = null;
  const startPolling = () => {
    if (!poll) poll = setInterval(onRemote, 15000);
  };
  const channel = supabase
    .channel('rakhi-2026-shared')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => onRemote())
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startPolling();
    });
  return () => {
    if (poll) clearInterval(poll);
    void supabase?.removeChannel(channel);
  };
}
