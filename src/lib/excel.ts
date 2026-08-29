import * as XLSX from 'xlsx';
import { INCOME_TYPES, MARKETPLACES, uid, nowIso } from './types';
import type { AppData, IncomeEntry, GoodsExpense, ServiceExpense, StockEntry, IncomeType } from './types';

// ─── Import target definitions ────────────────────────────────────────────────
export type ImportKind = 'income' | 'goods' | 'service' | 'advertising' | 'hr' | 'opening' | 'closing';

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
}

export const IMPORT_DEFS: Record<ImportKind, { title: string; fields: FieldDef[] }> = {
  income: {
    title: 'Income',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'marketplace', label: 'Marketplace', required: true },
      { key: 'sellerAccount', label: 'Seller Account', required: false },
      { key: 'incomeType', label: 'Income Type', required: true },
      { key: 'amount', label: 'Amount (₹)', required: true },
      { key: 'orders', label: 'Orders', required: false },
      { key: 'units', label: 'Units', required: false },
      { key: 'reference', label: 'Reference No.', required: false },
      { key: 'settlementId', label: 'Settlement ID', required: false },
      { key: 'bankRef', label: 'Bank Reference', required: false },
      { key: 'description', label: 'Description', required: false },
    ],
  },
  goods: {
    title: 'Goods / Purchases',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'category', label: 'Product Category', required: true },
      { key: 'productType', label: 'Product Type', required: false },
      { key: 'qty', label: 'Quantity', required: true },
      { key: 'rate', label: 'Rate (₹)', required: true },
      { key: 'amount', label: 'Total Amount (₹)', required: false },
      { key: 'vendor', label: 'Vendor (optional)', required: false },
      { key: 'marketplace', label: 'Marketplace Allocation', required: false },
      { key: 'paid', label: 'Paid? (yes/no)', required: false },
      { key: 'reference', label: 'Reference / PO No.', required: false },
      { key: 'description', label: 'Description', required: false },
    ],
  },
  service: {
    title: 'Service Expenses',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'category', label: 'Expense Category', required: true },
      { key: 'amount', label: 'Amount (₹)', required: true },
      { key: 'allocation', label: 'Allocation (common/marketplace)', required: true },
      { key: 'marketplace', label: 'Marketplace (if specific)', required: false },
      { key: 'vendor', label: 'Vendor / Payee', required: false },
      { key: 'paid', label: 'Paid? (yes/no)', required: false },
      { key: 'reference', label: 'Reference No.', required: false },
      { key: 'description', label: 'Description', required: false },
    ],
  },
  advertising: {
    title: 'Advertising Expenses',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'category', label: 'Ad Category', required: true },
      { key: 'amount', label: 'Amount (₹)', required: true },
      { key: 'allocation', label: 'Allocation (common/marketplace)', required: true },
      { key: 'marketplace', label: 'Marketplace / Channel', required: false },
      { key: 'vendor', label: 'Platform (Amazon Ads, Meta…)', required: false },
      { key: 'paid', label: 'Paid? (yes/no)', required: false },
      { key: 'reference', label: 'Reference No.', required: false },
      { key: 'description', label: 'Description', required: false },
    ],
  },
  hr: {
    title: 'HR Expenses',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'category', label: 'HR Category', required: true },
      { key: 'amount', label: 'Amount (₹)', required: true },
      { key: 'allocation', label: 'Allocation (common/marketplace)', required: true },
      { key: 'marketplace', label: 'Marketplace (if specific)', required: false },
      { key: 'vendor', label: 'Payee / Agency', required: false },
      { key: 'paid', label: 'Paid? (yes/no)', required: false },
      { key: 'reference', label: 'Reference No.', required: false },
      { key: 'description', label: 'Description', required: false },
    ],
  },
  opening: {
    title: 'Opening Stock',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'category', label: 'Product Category', required: true },
      { key: 'productType', label: 'Product Type', required: false },
      { key: 'qty', label: 'Quantity', required: true },
      { key: 'rate', label: 'Rate (₹)', required: true },
      { key: 'amount', label: 'Total Value (₹)', required: false },
    ],
  },
  closing: {
    title: 'Closing Stock',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'category', label: 'Product Category', required: true },
      { key: 'productType', label: 'Product Type', required: false },
      { key: 'qty', label: 'Quantity', required: true },
      { key: 'rate', label: 'Rate (₹)', required: true },
      { key: 'amount', label: 'Total Value (₹)', required: false },
    ],
  },
};

// ─── Template download ────────────────────────────────────────────────────────
const SAMPLES: Record<ImportKind, string[][]> = {
  income: [['2026-08-05', 'Amazon', 'Amazon Seller 1', 'Marketplace Sales', '125000', '420', '650', 'REF-001', 'AMZ-SET-09', '', 'Rakhi sales week 1']],
  goods: [['2026-06-20', 'Rakhi', 'Single Rakhi', '10000', '8.5', '85000', 'Shree Rakhi Works', '', 'yes', 'PO-2001', 'First purchase lot']],
  service: [['2026-07-10', 'Logistics', '45000', 'common', '', 'Delhivery', 'yes', 'LOG-101', 'Inbound freight']],
  advertising: [['2026-07-15', 'Paid Advertising', '85000', 'marketplace', 'Amazon', 'Amazon Ads', 'yes', 'ADS-201', 'Sponsored Products']],
  hr: [['2026-07-31', 'Salary', '180000', 'common', '', '', 'yes', 'SAL-JUL-2', 'July salary batch']],
  opening: [['2026-06-01', 'Rakhi', 'Single Rakhi', '5000', '7.5', '37500']],
  closing: [['2026-08-20', 'Rakhi', 'Single Rakhi', '1200', '8', '9600']],
};

export function downloadTemplate(kind: ImportKind): void {
  const def = IMPORT_DEFS[kind];
  const headers = def.fields.map((f) => f.label);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...SAMPLES[kind]]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.title);
  XLSX.writeFile(wb, `rakhi-2026-${kind}-template.xlsx`);
}

// ─── Workbook parsing ─────────────────────────────────────────────────────────
export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: unknown[][];
}

export async function parseWorkbook(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);
  const name = wb.SheetNames[0];
  const ws = wb.Sheets[name];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  const nonEmpty = aoa.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (nonEmpty.length === 0) return { sheetName: name, headers: [], rows: [] };
  const headers = nonEmpty[0].map((h) => String(h).trim());
  return { sheetName: name, headers, rows: nonEmpty.slice(1) };
}

/** Best-guess auto-mapping from header text → field key. */
export function autoMap(headers: string[], fields: FieldDef[]): Record<number, string> {
  const map: Record<number, string> = {};
  const normTxt = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  headers.forEach((h, idx) => {
    const hn = normTxt(h);
    const hit = fields.find((f) => {
      const fl = normTxt(f.label);
      const fk = f.key.toLowerCase();
      return hn === fl || hn === fk || hn.includes(fk) || fl.includes(hn);
    });
    if (hit) map[idx] = hit.key;
  });
  return map;
}

// ─── Row → entry conversion with validation ───────────────────────────────────
export interface ImportRowResult {
  rowIndex: number;
  values: Record<string, string>;
  errors: string[];
  skipped: boolean;
}

function cellToDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const dmy = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return s;
}

function toNum(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[,₹\s]/g, ''));
  return isFinite(n) ? n : NaN;
}

export function rowsToValues(
  rows: unknown[][],
  mapping: Record<number, string>,
): Record<string, string>[] {
  return rows.map((r) => {
    const out: Record<string, string> = {};
    for (const [idxStr, key] of Object.entries(mapping)) {
      out[key] = String(r[Number(idxStr)] ?? '').trim();
    }
    return out;
  });
}

export function validateRows(kind: ImportKind, data: AppData, valueRows: Record<string, string>[]): ImportRowResult[] {
  const def = IMPORT_DEFS[kind];
  return valueRows.map((values, i) => {
    const errors: string[] = [];
    for (const f of def.fields) {
      if (f.required && !String(values[f.key] ?? '').trim()) errors.push(`Missing required: ${f.label}`);
    }
    if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(cellToDate(values.date))) errors.push('Invalid date format');
    if (values.amount !== undefined && values.amount !== '' && isNaN(toNum(values.amount))) errors.push('Amount is not a number');
    if ((kind === 'goods' || kind === 'opening' || kind === 'closing')) {
      if (isNaN(toNum(values.qty))) errors.push('Quantity is not a number');
      if (isNaN(toNum(values.rate))) errors.push('Rate is not a number');
    }
    if (kind === 'income') {
      if (values.marketplace && !MARKETPLACES.includes(values.marketplace as (typeof MARKETPLACES)[number]))
        errors.push(`Unknown marketplace "${values.marketplace}"`);
      if (values.incomeType && !INCOME_TYPES.includes(values.incomeType as IncomeType))
        errors.push(`Unknown income type "${values.incomeType}"`);
    }
    if (kind === 'goods' || kind === 'opening' || kind === 'closing') {
      if (values.category && !data.goodsCategories.some((c) => c.name.toLowerCase() === values.category.toLowerCase()))
        errors.push(`Unknown category "${values.category}"`);
    }
    if (kind === 'service' || kind === 'advertising' || kind === 'hr') {
      if (values.category && !data.serviceCategories.some((c) => c.name.toLowerCase() === values.category.toLowerCase()))
        errors.push(`Unknown category "${values.category}"`);
      if (values.allocation && !['common', 'marketplace'].includes(values.allocation.toLowerCase()))
        errors.push('Allocation must be "common" or "marketplace"');
    }
    return { rowIndex: i, values, errors, skipped: false };
  });
}

export interface BuiltEntries {
  income: IncomeEntry[];
  goods: GoodsExpense[];
  services: ServiceExpense[];
  stock: StockEntry[];
}

const yes = (v?: string) => ['yes', 'y', 'true', '1', 'paid'].includes((v ?? '').trim().toLowerCase());

export function buildEntries(kind: ImportKind, data: AppData, results: ImportRowResult[]): BuiltEntries {
  const out: BuiltEntries = { income: [], goods: [], services: [], stock: [] };
  const audit = [{ at: nowIso(), by: 'import', action: 'Imported from Excel' }];
  const goodsCat = (name: string) => data.goodsCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const svcCat = (name: string) => data.serviceCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const sellerId = (name?: string) =>
    name ? data.sellerAccounts.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id : undefined;

  for (const r of results) {
    if (r.skipped || r.errors.length > 0) continue;
    const v = r.values;
    if (kind === 'income') {
      out.income.push({
        id: uid(), date: cellToDate(v.date), marketplace: v.marketplace,
        sellerAccountId: sellerId(v.sellerAccount), incomeType: v.incomeType as IncomeType,
        amount: toNum(v.amount), orders: v.orders ? toNum(v.orders) : undefined,
        units: v.units ? toNum(v.units) : undefined,
        reference: v.reference || undefined, settlementId: v.settlementId || undefined,
        bankRef: v.bankRef || undefined, description: v.description || undefined,
        status: 'active', source: 'import', audit,
      });
    } else if (kind === 'goods') {
      const qty = toNum(v.qty); const rate = toNum(v.rate);
      out.goods.push({
        id: uid(), date: cellToDate(v.date), categoryId: goodsCat(v.category)!.id,
        productType: v.productType || undefined, qty, rate,
        amount: v.amount ? toNum(v.amount) : qty * rate,
        vendor: v.vendor || undefined,
        marketplace: v.marketplace || undefined,
        paid: yes(v.paid), reference: v.reference || undefined, description: v.description || undefined,
        status: 'active', source: 'import', audit,
      });
    } else if (kind === 'service' || kind === 'advertising' || kind === 'hr') {
      out.services.push({
        id: uid(), date: cellToDate(v.date), categoryId: svcCat(v.category)!.id,
        amount: toNum(v.amount),
        allocation: v.allocation.toLowerCase() === 'marketplace' ? 'marketplace' : 'common',
        marketplace: v.marketplace || undefined, vendor: v.vendor || undefined,
        paid: yes(v.paid), reference: v.reference || undefined, description: v.description || undefined,
        status: 'active', source: 'import', audit,
      });
    } else {
      const qty = toNum(v.qty); const rate = toNum(v.rate);
      out.stock.push({
        id: uid(), kind: kind === 'opening' ? 'opening' : 'closing', date: cellToDate(v.date),
        categoryId: goodsCat(v.category)!.id, productType: v.productType || undefined,
        qty, rate, amount: v.amount ? toNum(v.amount) : qty * rate,
        source: 'import', audit,
      });
    }
  }
  return out;
}
