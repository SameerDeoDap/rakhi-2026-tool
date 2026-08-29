import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '@/store/AppContext';
import { nowIso, uid } from '@/lib/types';
import type { StockEntry } from '@/lib/types';
import { fmtINR, fmtNum, fmtPct } from '@/lib/format';
import { categoryStockTable, productTypeStockTable, stockValue, purchaseValue, inventoryConsumed } from '@/lib/calc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';

export default function Inventory() {
  const { data, update, role } = useApp();
  const [open, setOpen] = useState(false);

  const catTable = useMemo(() => categoryStockTable(data), [data]);
  const typeTable = useMemo(() => productTypeStockTable(data), [data]);
  const opening = stockValue(data, 'opening');
  const purchases = purchaseValue(data);
  const closing = stockValue(data, 'closing');
  const consumed = inventoryConsumed(data);

  const [f, setF] = useState({
    kind: 'opening' as 'opening' | 'closing',
    date: new Date().toISOString().slice(0, 10),
    categoryId: data.goodsCategories[0]?.id ?? '',
    productType: '', qty: '', rate: '',
  });
  const fCat = data.goodsCategories.find((c) => c.id === f.categoryId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const qty = Number(f.qty); const rate = Number(f.rate);
    if (!qty || !rate || !f.categoryId) return;
    const entry: StockEntry = {
      id: uid(), kind: f.kind, date: f.date, categoryId: f.categoryId,
      productType: f.productType || undefined, qty, rate, amount: qty * rate,
      source: 'manual',
      audit: [{ at: nowIso(), by: role ?? 'user', action: `Manual ${f.kind} stock entry` }],
    };
    update((d) => ({ ...d, stock: [...d.stock, entry] }), { skipDupeScan: true });
    setOpen(false);
    setF({ ...f, qty: '', rate: '', productType: '' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Opening Stock + Purchases − Closing Stock = Inventory Consumed (used in profitability).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-amber-500 text-slate-900 hover:bg-amber-400"><Plus className="mr-1 h-4 w-4" /> Add Stock Entry</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Stock Entry</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock Type</Label>
                <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v as 'opening' | 'closing' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opening">Opening Stock</SelectItem>
                    <SelectItem value="closing">Closing Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></div>
              <div>
                <Label>Category</Label>
                <Select value={f.categoryId} onValueChange={(v) => setF({ ...f, categoryId: v, productType: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{data.goodsCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product Type</Label>
                <Select value={f.productType || 'none'} onValueChange={(v) => setF({ ...f, productType: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {(fCat?.productTypes ?? []).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" min="0" step="any" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} required /></div>
              <div><Label>Rate (₹)</Label><Input type="number" min="0" step="any" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} required /></div>
              <div className="col-span-2"><Label>Total Value</Label><Input disabled value={f.qty && f.rate ? fmtINR(Number(f.qty) * Number(f.rate)) : ''} /></div>
              <div className="col-span-2"><Button type="submit" className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400">Save Stock Entry</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Formula strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="shadow-sm"><CardContent className="p-4"><div className="text-xs uppercase text-slate-500">Opening Stock</div><div className="text-xl font-bold">{fmtINR(opening)}</div></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4"><div className="text-xs uppercase text-slate-500">+ Purchases</div><div className="text-xl font-bold">{fmtINR(purchases)}</div></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4"><div className="text-xs uppercase text-slate-500">− Closing Stock</div><div className="text-xl font-bold">{fmtINR(closing)}</div></CardContent></Card>
        <Card className="border-amber-300 bg-amber-50 shadow-sm"><CardContent className="p-4"><div className="text-xs uppercase text-amber-700">= Inventory Consumed</div><div className="text-xl font-bold text-amber-800">{fmtINR(consumed)}</div></CardContent></Card>
      </div>

      {/* Category-wise table */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Category-wise Stock &amp; Sell-through</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Closing</TableHead><TableHead className="text-right">Consumed</TableHead>
                <TableHead className="w-48">Unsold %</TableHead><TableHead className="text-right">Sell-through</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catTable.map((c) => (
                <TableRow key={c.categoryId}>
                  <TableCell className="font-medium">{c.category}</TableCell>
                  <TableCell className="text-right">{fmtINR(c.opening)}</TableCell>
                  <TableCell className="text-right">{fmtINR(c.purchases)}</TableCell>
                  <TableCell className="text-right">{fmtINR(c.closing)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtINR(c.consumed)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(100, c.unsoldPct)} className="h-2" />
                      <span className={`text-xs font-medium ${c.unsoldPct > 40 ? 'text-red-600' : 'text-slate-600'}`}>{fmtPct(c.unsoldPct, 0)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={c.sellThroughPct >= 60 ? 'secondary' : 'destructive'}>{fmtPct(c.sellThroughPct, 0)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product-type leftover table */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Product-type Leftover Stock (sorted by leftover value)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead><TableHead>Product Type</TableHead>
                <TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Leftover (Closing)</TableHead><TableHead className="text-right">Unsold %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typeTable.map((t, i) => (
                <TableRow key={i} className={t.unsoldPct > 50 ? 'bg-red-50' : ''}>
                  <TableCell>{t.category}</TableCell>
                  <TableCell>{t.productType}</TableCell>
                  <TableCell className="text-right">{fmtINR(t.opening)}</TableCell>
                  <TableCell className="text-right">{fmtINR(t.purchases)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtINR(t.leftover)}</TableCell>
                  <TableCell className={`text-right ${t.unsoldPct > 50 ? 'font-semibold text-red-600' : ''}`}>{fmtPct(t.unsoldPct, 0)}</TableCell>
                </TableRow>
              ))}
              {typeTable.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-400">No stock data yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Raw stock entries */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Stock Entries ({data.stock.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead><TableHead>Date</TableHead><TableHead>Category</TableHead>
                <TableHead>Product Type</TableHead><TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data.stock].sort((a, b) => a.kind.localeCompare(b.kind) || b.date.localeCompare(a.date)).map((s) => (
                <TableRow key={s.id}>
                  <TableCell><Badge variant={s.kind === 'opening' ? 'secondary' : 'default'}>{s.kind === 'opening' ? 'Opening' : 'Closing'}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap">{s.date}</TableCell>
                  <TableCell>{data.goodsCategories.find((c) => c.id === s.categoryId)?.name ?? s.categoryId}</TableCell>
                  <TableCell>{s.productType ?? '—'}</TableCell>
                  <TableCell className="text-right">{fmtNum(s.qty)}</TableCell>
                  <TableCell className="text-right">{fmtINR(s.rate)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtINR(s.amount)}</TableCell>
                </TableRow>
              ))}
              {data.stock.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-slate-400">No stock entries yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
