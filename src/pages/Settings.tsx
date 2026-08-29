import { useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { MARKETPLACES } from '@/lib/types';
import type { AllocationMethod } from '@/lib/types';
import { exportJSON, parseImportJSON } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, ShieldCheck, User as UserIcon } from 'lucide-react';

export default function Settings() {
  const { data, update, role } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  if (role !== 'admin') {
    return <div className="p-8 text-slate-500">Settings are admin-only.</div>;
  }

  const onImportFile = async (file: File) => {
    try {
      const imported = parseImportJSON(await file.text());
      update(() => imported, { skipDupeScan: false });
      setMsg(`Imported data file: ${imported.income.length} income, ${imported.goods.length} purchases, ${imported.services.length} expenses, ${imported.stock.length} stock entries.`);
    } catch (e) {
      setMsg(`Import failed: ${e instanceof Error ? e.message : 'invalid file'}`);
    }
  };

  const manualTotal = Object.values(data.settings.manualPercents).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Admin controls: users &amp; permissions, expense allocation, data portability.</p>
      </div>

      {/* Users & permissions */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Users &amp; Permissions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Permissions</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-amber-500" /> Nikul</TableCell>
                <TableCell><Badge>Admin</Badge></TableCell>
                <TableCell className="text-sm text-slate-600">Full access — users/permissions, categories, Excel import, duplicate review/approve/merge, corrections, all dashboards, export/import.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2 font-medium"><UserIcon className="h-4 w-4 text-sky-500" /> Team</TableCell>
                <TableCell><Badge variant="secondary">User</Badge></TableCell>
                <TableCell className="text-sm text-slate-600">Data entry (manual + Excel import), view dashboards. Cannot manage categories, resolve duplicates, or access settings.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allocation method */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Common Expense Allocation (spec §7)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <Label>Allocation method</Label>
              <Select
                value={data.settings.allocationMethod}
                onValueChange={(v) => update((d) => ({ ...d, settings: { ...d.settings, allocationMethod: v as AllocationMethod } }), { skipDupeScan: true })}
              >
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue %</SelectItem>
                  <SelectItem value="orders">Orders %</SelectItem>
                  <SelectItem value="units">Units %</SelectItem>
                  <SelectItem value="manual">Manual %</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="pb-2 text-sm text-slate-500">Common expenses are allocated to each marketplace once — never double-counted.</p>
          </div>
          {data.settings.allocationMethod === 'manual' && (
            <div>
              <div className="mb-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                {MARKETPLACES.map((m) => (
                  <div key={m}>
                    <Label>{m} %</Label>
                    <Input
                      type="number" min="0" max="100"
                      value={data.settings.manualPercents[m] ?? 0}
                      onChange={(e) => update((d) => ({
                        ...d,
                        settings: { ...d.settings, manualPercents: { ...d.settings.manualPercents, [m]: Number(e.target.value) || 0 } },
                      }), { skipDupeScan: true })}
                    />
                  </div>
                ))}
              </div>
              <p className={`text-sm ${Math.abs(manualTotal - 100) > 0.01 ? 'text-amber-600' : 'text-emerald-600'}`}>
                Total: {manualTotal}% {Math.abs(manualTotal - 100) > 0.01 ? '(will be normalised to 100%)' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data portability */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Data Export / Import</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => exportJSON(data)}><Download className="mr-1 h-4 w-4" /> Export data (JSON)</Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> Import data (JSON)</Button>
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </CardContent>
      </Card>
    </div>
  );
}
