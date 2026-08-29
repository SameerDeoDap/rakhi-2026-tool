import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '@/store/AppContext';
import { INCOME_TYPES, MARKETPLACES, nowIso, uid } from '@/lib/types';
import type { IncomeEntry } from '@/lib/types';
import { fmtINR, fmtNum } from '@/lib/format';
import { activeIncome } from '@/lib/calc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';

export default function Income() {
  const { data, update, role } = useApp();
  const [open, setOpen] = useState(false);
  const [filterMp, setFilterMp] = useState<string>('all');

  const rows = useMemo(
    () => [...activeIncome(data)]
      .filter((e) => filterMp === 'all' || e.marketplace === filterMp)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [data, filterMp],
  );
  const dupEntryIds = useMemo(
    () => new Set(data.duplicates.filter((d) => d.status === 'pending').map((d) => d.entryId)),
    [data.duplicates],
  );
  const sellerName = (id?: string) => data.sellerAccounts.find((s) => s.id === id)?.name ?? '—';

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    marketplace: 'Amazon', sellerAccountId: '', incomeType: 'Marketplace Sales',
    amount: '', orders: '', units: '', reference: '', settlementId: '', bankRef: '', description: '',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    const entry: IncomeEntry = {
      id: uid(), date: form.date, marketplace: form.marketplace,
      sellerAccountId: form.sellerAccountId || undefined,
      incomeType: form.incomeType as IncomeEntry['incomeType'],
      amount, orders: form.orders ? Number(form.orders) : undefined,
      units: form.units ? Number(form.units) : undefined,
      reference: form.reference || undefined, settlementId: form.settlementId || undefined,
      bankRef: form.bankRef || undefined, description: form.description || undefined,
      status: 'active', source: 'manual',
      audit: [{ at: nowIso(), by: role ?? 'user', action: 'Manual entry created' }],
    };
    update((d) => ({ ...d, income: [...d.income, entry] }));
    setOpen(false);
    setForm({ ...form, amount: '', orders: '', units: '', reference: '', settlementId: '', bankRef: '', description: '' });
  };

  const filteredSellers = data.sellerAccounts.filter((s) => s.marketplace === form.marketplace);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Income</h1>
          <p className="text-sm text-slate-500">Marketplace → Seller Account → Transactions. Bank Receipt &amp; TCS are tracked separately and never counted as revenue.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 text-slate-900 hover:bg-amber-400"><Plus className="mr-1 h-4 w-4" /> Add Income</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Income Entry</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              <div>
                <Label>Marketplace</Label>
                <Select value={form.marketplace} onValueChange={(v) => setForm({ ...form, marketplace: v, sellerAccountId: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MARKETPLACES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seller Account</Label>
                <Select value={form.sellerAccountId || 'none'} onValueChange={(v) => setForm({ ...form, sellerAccountId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {filteredSellers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Income Type</Label>
                <Select value={form.incomeType} onValueChange={(v) => setForm({ ...form, incomeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOME_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (₹)</Label><Input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><Label>Orders</Label><Input type="number" min="0" value={form.orders} onChange={(e) => setForm({ ...form, orders: e.target.value })} /></div>
              <div><Label>Units</Label><Input type="number" min="0" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} /></div>
              <div><Label>Reference No.</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>Settlement ID</Label><Input value={form.settlementId} onChange={(e) => setForm({ ...form, settlementId: e.target.value })} /></div>
              <div><Label>Bank Reference</Label><Input value={form.bankRef} onChange={(e) => setForm({ ...form, bankRef: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="col-span-2"><Button type="submit" className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400">Save Entry</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm text-slate-500">Filter:</Label>
        <Select value={filterMp} onValueChange={setFilterMp}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All marketplaces</SelectItem>
            {MARKETPLACES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{rows.length} entries</span>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Income Transactions</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Marketplace</TableHead><TableHead>Seller Account</TableHead>
                <TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Units</TableHead>
                <TableHead>Reference</TableHead><TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                  <TableCell>{r.marketplace}</TableCell>
                  <TableCell>{sellerName(r.sellerAccountId)}</TableCell>
                  <TableCell>
                    <Badge variant={r.incomeType === 'Bank Receipt' || r.incomeType === 'TCS' || r.incomeType === 'Other Recoverable' ? 'secondary' : 'default'}>
                      {r.incomeType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtINR(r.amount)}</TableCell>
                  <TableCell className="text-right">{r.orders ? fmtNum(r.orders) : '—'}</TableCell>
                  <TableCell className="text-right">{r.units ? fmtNum(r.units) : '—'}</TableCell>
                  <TableCell className="text-xs text-slate-500">{r.settlementId ?? r.bankRef ?? r.reference ?? '—'}</TableCell>
                  <TableCell>{dupEntryIds.has(r.id) && <Badge className="bg-red-500 text-white hover:bg-red-500">Possible Duplicate</Badge>}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="py-8 text-center text-slate-400">No income entries yet. Add manually or import from Excel.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
