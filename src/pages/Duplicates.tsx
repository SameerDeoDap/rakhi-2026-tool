import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { nowIso } from '@/lib/types';
import type { DuplicateFlag } from '@/lib/types';
import { fmtINR } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, ShieldAlert, EyeOff, PencilLine } from 'lucide-react';

interface EntryView { date: string; summary: string; amount: number }

export default function Duplicates() {
  const { data, update, role } = useApp();
  const [correcting, setCorrecting] = useState<DuplicateFlag | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [note, setNote] = useState('');

  if (role !== 'admin') {
    return <div className="p-8 text-slate-500">Duplicates review is an admin-only function.</div>;
  }

  const lookup = (flag: DuplicateFlag, id: string): EntryView => {
    if (flag.entryKind === 'income') {
      const e = data.income.find((x) => x.id === id);
      return e ? { date: e.date, summary: `${e.marketplace} · ${e.incomeType} · ${e.settlementId ?? e.bankRef ?? e.reference ?? ''}`, amount: e.amount } : { date: '—', summary: 'Entry removed', amount: 0 };
    }
    if (flag.entryKind === 'goods') {
      const e = data.goods.find((x) => x.id === id);
      const cat = data.goodsCategories.find((c) => c.id === e?.categoryId)?.name ?? '';
      return e ? { date: e.date, summary: `${cat} · ${e.productType ?? ''} · qty ${e.qty} × ₹${e.rate}`, amount: e.amount } : { date: '—', summary: 'Entry removed', amount: 0 };
    }
    const e = data.services.find((x) => x.id === id);
    const cat = data.serviceCategories.find((c) => c.id === e?.categoryId)?.name ?? '';
    return e ? { date: e.date, summary: `${cat} · ${e.allocation}${e.marketplace ? ' · ' + e.marketplace : ''}`, amount: e.amount } : { date: '—', summary: 'Entry removed', amount: 0 };
  };

  const resolve = (flag: DuplicateFlag, action: 'confirmed' | 'valid' | 'ignored') => {
    update((d) => {
      const duplicates = d.duplicates.map((x) =>
        x.id === flag.id ? { ...x, status: action, resolvedBy: 'admin', resolvedAt: nowIso() } : x,
      );
      const mark = <T extends { id: string; status: string; audit: unknown[] }>(arr: T[]): T[] =>
        arr.map((e) => {
          if (e.id !== flag.entryId) return e;
          const newStatus =
            action === 'confirmed' ? 'confirmed-duplicate' : action === 'valid' ? 'active' : 'ignored';
          return {
            ...e,
            status: newStatus,
            audit: [...e.audit, { at: nowIso(), by: 'admin', action: `Duplicate review: ${action}`, note: flag.reason }],
          };
        });
      return {
        ...d,
        duplicates,
        income: mark(d.income),
        goods: mark(d.goods),
        services: mark(d.services),
      };
    }, { skipDupeScan: true });
  };

  const applyCorrection = () => {
    if (!correcting) return;
    const amt = Number(newAmount);
    if (!amt || amt <= 0) return;
    update((d) => {
      const duplicates = d.duplicates.map((x) =>
        x.id === correcting.id ? { ...x, status: 'valid' as const, resolvedBy: 'admin', resolvedAt: nowIso(), note: `Amount corrected to ₹${amt}. ${note}` } : x,
      );
      const fix = <T extends { id: string; amount: number; audit: unknown[] }>(arr: T[]): T[] =>
        arr.map((e) =>
          e.id === correcting.entryId
            ? { ...e, amount: amt, audit: [...e.audit, { at: nowIso(), by: 'admin', action: `Entry corrected: amount ₹${e.amount} → ₹${amt}`, note }] }
            : e,
        );
      return { ...d, duplicates, income: fix(d.income), goods: fix(d.goods), services: fix(d.services) };
    }, { skipDupeScan: true });
    setCorrecting(null); setNewAmount(''); setNote('');
  };

  const renderList = (flags: DuplicateFlag[]) => (
    <div className="space-y-3">
      {flags.map((f) => {
        const a = lookup(f, f.matchedEntryId);
        const b = lookup(f, f.entryId);
        return (
          <Card key={f.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold">Possible Duplicate</span>
                  <Badge variant="secondary" className="capitalize">{f.entryKind}</Badge>
                  <Badge variant={f.status === 'pending' ? 'destructive' : 'secondary'}>{f.status}</Badge>
                </div>
                <span className="text-xs text-slate-400">flagged {new Date(f.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-3 text-sm">
                  <div className="font-medium">Entry A (kept)</div>
                  <div className="text-slate-600">{a.date} · {a.summary}</div>
                  <div className="font-semibold">{fmtINR(a.amount)}</div>
                </div>
                <div className="rounded-md bg-orange-50 p-3 text-sm">
                  <div className="font-medium">Entry B (flagged)</div>
                  <div className="text-slate-600">{b.date} · {b.summary}</div>
                  <div className="font-semibold">{fmtINR(b.amount)}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">{f.reason}</div>
              {f.note && <div className="mt-1 text-xs text-slate-500">Note: {f.note}</div>}
              {f.status === 'pending' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="destructive" onClick={() => resolve(f, 'confirmed')}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirm Duplicate (exclude B)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(f, 'valid')}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Valid (keep both)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(f, 'ignored')}>
                    <EyeOff className="mr-1 h-3.5 w-3.5" /> Ignore
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setCorrecting(f); setNewAmount(String(b.amount)); }}>
                    <PencilLine className="mr-1 h-3.5 w-3.5" /> Correct Entry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {flags.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-400">No flags in this view.</div>}
    </div>
  );

  const pending = data.duplicates.filter((d) => d.status === 'pending');
  const resolved = data.duplicates.filter((d) => d.status !== 'pending');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Duplicate Review</h1>
        <p className="text-sm text-slate-500">Possible duplicates are flagged automatically — nothing is ever auto-deleted. Every action is written to the entry's audit history.</p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="resolved">History ({resolved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderList(pending)}</TabsContent>
        <TabsContent value="resolved" className="mt-4">{renderList(resolved)}</TabsContent>
      </Tabs>

      <Dialog open={!!correcting} onOpenChange={(o) => !o && setCorrecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Correct Entry B</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>New amount (₹)</Label>
              <Input type="number" min="0" step="any" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
            </div>
            <div>
              <Label>Note (audit trail)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for correction" />
            </div>
            <Button onClick={applyCorrection} className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400">Save correction &amp; mark valid</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
