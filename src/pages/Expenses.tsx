import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '@/store/AppContext';
import { MARKETPLACES, nowIso, uid } from '@/lib/types';
import type { GoodsExpense, ServiceExpense } from '@/lib/types';
import { fmtINR, fmtNum } from '@/lib/format';
import { activeGoods, activeServices } from '@/lib/calc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

export default function Expenses() {
  const { data, update, role } = useApp();
  const [goodsOpen, setGoodsOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);

  const goodsRows = useMemo(() => [...activeGoods(data)].sort((a, b) => b.date.localeCompare(a.date)), [data]);
  const svcRows = useMemo(() => [...activeServices(data)].sort((a, b) => b.date.localeCompare(a.date)), [data]);
  const dupEntryIds = useMemo(
    () => new Set(data.duplicates.filter((d) => d.status === 'pending').map((d) => d.entryId)),
    [data.duplicates],
  );

  const catName = (id: string) => data.goodsCategories.find((c) => c.id === id)?.name ?? id;
  const svcName = (id: string) => data.serviceCategories.find((c) => c.id === id)?.name ?? id;

  const [g, setG] = useState({
    date: new Date().toISOString().slice(0, 10), categoryId: data.goodsCategories[0]?.id ?? '',
    productType: '', qty: '', rate: '', vendor: '', marketplace: 'none', paid: true, reference: '', description: '',
  });
  const [s, setS] = useState({
    date: new Date().toISOString().slice(0, 10), categoryId: data.serviceCategories[0]?.id ?? '',
    amount: '', allocation: 'common', marketplace: 'Amazon', vendor: '', paid: true, reference: '', description: '',
  });

  const gCat = data.goodsCategories.find((c) => c.id === g.categoryId);

  const submitGoods = (e: FormEvent) => {
    e.preventDefault();
    const qty = Number(g.qty); const rate = Number(g.rate);
    if (!qty || !rate || !g.categoryId) return;
    const entry: GoodsExpense = {
      id: uid(), date: g.date, categoryId: g.categoryId, productType: g.productType || undefined,
      qty, rate, amount: qty * rate, vendor: g.vendor || undefined,
      marketplace: g.marketplace === 'none' ? undefined : g.marketplace,
      paid: g.paid, reference: g.reference || undefined, description: g.description || undefined,
      status: 'active', source: 'manual',
      audit: [{ at: nowIso(), by: role ?? 'user', action: 'Manual entry created' }],
    };
    update((d) => ({ ...d, goods: [...d.goods, entry] }));
    setGoodsOpen(false);
    setG({ ...g, qty: '', rate: '', vendor: '', reference: '', description: '', productType: '' });
  };

  const submitSvc = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(s.amount);
    if (!amount || !s.categoryId) return;
    const entry: ServiceExpense = {
      id: uid(), date: s.date, categoryId: s.categoryId, amount,
      allocation: s.allocation as 'common' | 'marketplace',
      marketplace: s.allocation === 'marketplace' ? s.marketplace : undefined,
      vendor: s.vendor || undefined, paid: s.paid,
      reference: s.reference || undefined, description: s.description || undefined,
      status: 'active', source: 'manual',
      audit: [{ at: nowIso(), by: role ?? 'user', action: 'Manual entry created' }],
    };
    update((d) => ({ ...d, services: [...d.services, entry] }));
    setSvcOpen(false);
    setS({ ...s, amount: '', vendor: '', reference: '', description: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <p className="text-sm text-slate-500">Goods (category-driven, vendor optional) and Services (common vs marketplace-specific allocation).</p>
      </div>

      <Tabs defaultValue="goods">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="goods">Goods / Purchases</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Dialog open={goodsOpen} onOpenChange={setGoodsOpen}>
              <DialogTrigger asChild><Button className="bg-amber-500 text-slate-900 hover:bg-amber-400"><Plus className="mr-1 h-4 w-4" /> Add Purchase</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Goods / Purchase</DialogTitle></DialogHeader>
                <form onSubmit={submitGoods} className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={g.date} onChange={(e) => setG({ ...g, date: e.target.value })} required /></div>
                  <div>
                    <Label>Product Category</Label>
                    <Select value={g.categoryId} onValueChange={(v) => setG({ ...g, categoryId: v, productType: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{data.goodsCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Product Type</Label>
                    <Select value={g.productType || 'none'} onValueChange={(v) => setG({ ...g, productType: v === 'none' ? '' : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {(gCat?.productTypes ?? []).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantity</Label><Input type="number" min="0" step="any" value={g.qty} onChange={(e) => setG({ ...g, qty: e.target.value })} required /></div>
                  <div><Label>Rate (₹)</Label><Input type="number" min="0" step="any" value={g.rate} onChange={(e) => setG({ ...g, rate: e.target.value })} required /></div>
                  <div><Label>Total (₹)</Label><Input disabled value={g.qty && g.rate ? fmtINR(Number(g.qty) * Number(g.rate)) : ''} /></div>
                  <div><Label>Vendor (optional)</Label><Input value={g.vendor} onChange={(e) => setG({ ...g, vendor: e.target.value })} /></div>
                  <div>
                    <Label>Marketplace Allocation</Label>
                    <Select value={g.marketplace} onValueChange={(v) => setG({ ...g, marketplace: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Not allocated —</SelectItem>
                        {MARKETPLACES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Reference / PO No.</Label><Input value={g.reference} onChange={(e) => setG({ ...g, reference: e.target.value })} /></div>
                  <div className="flex items-center gap-2 pt-5">
                    <Checkbox id="gpaid" checked={g.paid} onCheckedChange={(v) => setG({ ...g, paid: v === true })} />
                    <Label htmlFor="gpaid">Paid</Label>
                  </div>
                  <div className="col-span-2"><Label>Description</Label><Input value={g.description} onChange={(e) => setG({ ...g, description: e.target.value })} /></div>
                  <div className="col-span-2"><Button type="submit" className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400">Save Purchase</Button></div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
              <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> Add Service Expense</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Service Expense</DialogTitle></DialogHeader>
                <form onSubmit={submitSvc} className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} required /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={s.categoryId} onValueChange={(v) => setS({ ...s, categoryId: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{data.serviceCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount (₹)</Label><Input type="number" min="0" step="any" value={s.amount} onChange={(e) => setS({ ...s, amount: e.target.value })} required /></div>
                  <div>
                    <Label>Allocation</Label>
                    <Select value={s.allocation} onValueChange={(v) => setS({ ...s, allocation: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Common (whole project)</SelectItem>
                        <SelectItem value="marketplace">Marketplace-specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {s.allocation === 'marketplace' && (
                    <div>
                      <Label>Marketplace</Label>
                      <Select value={s.marketplace} onValueChange={(v) => setS({ ...s, marketplace: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MARKETPLACES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><Label>Vendor / Payee</Label><Input value={s.vendor} onChange={(e) => setS({ ...s, vendor: e.target.value })} /></div>
                  <div><Label>Reference No.</Label><Input value={s.reference} onChange={(e) => setS({ ...s, reference: e.target.value })} /></div>
                  <div className="flex items-center gap-2 pt-5">
                    <Checkbox id="spaid" checked={s.paid} onCheckedChange={(v) => setS({ ...s, paid: v === true })} />
                    <Label htmlFor="spaid">Paid</Label>
                  </div>
                  <div className="col-span-2"><Label>Description</Label><Input value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
                  <div className="col-span-2"><Button type="submit" className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400">Save Expense</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="goods">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Goods / Purchases ({goodsRows.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Product Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead><TableHead>Vendor</TableHead>
                    <TableHead>Paid</TableHead><TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goodsRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                      <TableCell>{catName(r.categoryId)}</TableCell>
                      <TableCell>{r.productType ?? '—'}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                      <TableCell className="text-right">{fmtINR(r.rate)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtINR(r.amount)}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.vendor ?? '—'}</TableCell>
                      <TableCell>{r.paid ? <Badge variant="secondary">Paid</Badge> : <Badge className="bg-red-500 text-white hover:bg-red-500">Unpaid</Badge>}</TableCell>
                      <TableCell>{dupEntryIds.has(r.id) && <Badge className="bg-red-500 text-white hover:bg-red-500">Possible Duplicate</Badge>}</TableCell>
                    </TableRow>
                  ))}
                  {goodsRows.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-slate-400">No purchases yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Service Expenses ({svcRows.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead>
                    <TableHead>Allocation</TableHead><TableHead>Marketplace</TableHead><TableHead>Vendor</TableHead>
                    <TableHead>Paid</TableHead><TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {svcRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                      <TableCell>{svcName(r.categoryId)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtINR(r.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={r.allocation === 'common' ? 'secondary' : 'default'}>
                          {r.allocation === 'common' ? 'Common' : 'Marketplace'}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.allocation === 'marketplace' ? r.marketplace : '—'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.vendor ?? '—'}</TableCell>
                      <TableCell>{r.paid ? <Badge variant="secondary">Paid</Badge> : <Badge className="bg-red-500 text-white hover:bg-red-500">Unpaid</Badge>}</TableCell>
                      <TableCell>{dupEntryIds.has(r.id) && <Badge className="bg-red-500 text-white hover:bg-red-500">Possible Duplicate</Badge>}</TableCell>
                    </TableRow>
                  ))}
                  {svcRows.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-slate-400">No service expenses yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
