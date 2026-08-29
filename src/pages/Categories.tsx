import { useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '@/store/AppContext';
import { uid } from '@/lib/types';
import type { GoodsCategory, ServiceCategory, ServiceGroup } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

export default function Categories() {
  const { data, update, role } = useApp();
  const [gName, setGName] = useState('');
  const [gTypes, setGTypes] = useState('');
  const [sName, setSName] = useState('');
  const [sDef, setSDef] = useState('');
  const [sGroup, setSGroup] = useState<ServiceGroup>('service');
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');

  if (role !== 'admin') {
    return <div className="p-8 text-slate-500">Category management is an admin-only function.</div>;
  }

  const addGoodsCat = (e: FormEvent) => {
    e.preventDefault();
    if (!gName.trim()) return;
    const cat: GoodsCategory = {
      id: uid(), name: gName.trim(),
      productTypes: gTypes.split(',').map((t) => t.trim()).filter(Boolean),
    };
    update((d) => ({ ...d, goodsCategories: [...d.goodsCategories, cat] }), { skipDupeScan: true });
    setGName(''); setGTypes('');
  };

  const addSvcCat = (e: FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;
    const cat: ServiceCategory = { id: uid(), name: sName.trim(), definition: sDef.trim(), group: sGroup };
    update((d) => ({ ...d, serviceCategories: [...d.serviceCategories, cat] }), { skipDupeScan: true });
    setSName(''); setSDef('');
  };

  const removeGoodsCat = (id: string) => {
    const used = data.goods.some((g) => g.categoryId === id) || data.stock.some((s) => s.categoryId === id);
    if (used) { alert('Category is used by existing entries — merge it instead of deleting.'); return; }
    update((d) => ({ ...d, goodsCategories: d.goodsCategories.filter((c) => c.id !== id) }), { skipDupeScan: true });
  };

  const removeSvcCat = (id: string) => {
    const used = data.services.some((s) => s.categoryId === id);
    if (used) { alert('Category is used by existing entries — merge it instead of deleting.'); return; }
    update((d) => ({ ...d, serviceCategories: d.serviceCategories.filter((c) => c.id !== id) }), { skipDupeScan: true });
  };

  /** Merge duplicate goods categories: re-point all entries from → to, then remove. */
  const mergeGoods = () => {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) return;
    update((d) => ({
      ...d,
      goods: d.goods.map((g) => (g.categoryId === mergeFrom ? { ...g, categoryId: mergeTo } : g)),
      stock: d.stock.map((s) => (s.categoryId === mergeFrom ? { ...s, categoryId: mergeTo } : s)),
      goodsCategories: d.goodsCategories.filter((c) => c.id !== mergeFrom),
    }), { skipDupeScan: true });
    setMergeFrom(''); setMergeTo('');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <p className="text-sm text-slate-500">Centrally controlled structure — everyone enters data against the same categories.</p>
      </div>

      <Tabs defaultValue="goods">
        <TabsList>
          <TabsTrigger value="goods">Goods Categories</TabsTrigger>
          <TabsTrigger value="services">Service Categories</TabsTrigger>
          <TabsTrigger value="sellers">Seller Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="goods" className="mt-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Add Goods Category</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addGoodsCat} className="flex flex-wrap items-end gap-3">
                <div><Label>Name</Label><Input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="e.g. Sweets" /></div>
                <div className="min-w-72"><Label>Product Types (comma separated)</Label><Input value={gTypes} onChange={(e) => setGTypes(e.target.value)} placeholder="e.g. Kaju Katli, Ladoo" /></div>
                <Button type="submit" className="bg-amber-500 text-slate-900 hover:bg-amber-400"><Plus className="mr-1 h-4 w-4" /> Add</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Product Types</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
                <TableBody>
                  {data.goodsCategories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{c.productTypes.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeGoodsCat(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Merge duplicate categories</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Merge from (will be removed)</Label>
                <Select value={mergeFrom} onValueChange={setMergeFrom}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{data.goodsCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Merge into (kept)</Label>
                <Select value={mergeTo} onValueChange={setMergeTo}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{data.goodsCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={mergeGoods} disabled={!mergeFrom || !mergeTo || mergeFrom === mergeTo} variant="outline">Merge</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Add Service Category</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addSvcCat} className="flex flex-wrap items-end gap-3">
                <div><Label>Name</Label><Input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="e.g. PR" /></div>
                <div>
                  <Label>Group</Label>
                  <Select value={sGroup} onValueChange={(v) => setSGroup(v as ServiceGroup)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                      <SelectItem value="hr">HR / Manpower</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-72"><Label>Definition</Label><Input value={sDef} onChange={(e) => setSDef(e.target.value)} placeholder="What belongs in this category" /></div>
                <Button type="submit" className="bg-amber-500 text-slate-900 hover:bg-amber-400"><Plus className="mr-1 h-4 w-4" /> Add</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Group</TableHead><TableHead>Definition</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
                <TableBody>
                  {data.serviceCategories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant={c.group === 'advertising' ? 'default' : c.group === 'hr' ? 'destructive' : 'secondary'}>{c.group}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-600">{c.definition}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeSvcCat(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sellers" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Marketplace → Seller Accounts</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Marketplace</TableHead><TableHead>Seller Account</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.sellerAccounts.map((s) => (
                    <TableRow key={s.id}><TableCell className="font-medium">{s.marketplace}</TableCell><TableCell>{s.name}</TableCell></TableRow>
                  ))}
                  {data.sellerAccounts.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="py-8 text-center text-slate-400">No seller accounts yet. Add them via Excel import or they will appear as income is entered.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
