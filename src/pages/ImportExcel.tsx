import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import {
  IMPORT_DEFS,
  parseWorkbook, autoMap, rowsToValues, validateRows, buildEntries, downloadTemplate,
} from '@/lib/excel';
import type { ImportKind, ParsedSheet, ImportRowResult } from '@/lib/excel';
import { scanDuplicates } from '@/lib/dupes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileUp, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

const KINDS: ImportKind[] = ['income', 'goods', 'service', 'advertising', 'hr', 'opening', 'closing'];

type Step = 1 | 2 | 3 | 4;

export default function ImportExcel() {
  const { data, update } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<ImportKind>('income');
  const [step, setStep] = useState<Step>(1);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [results, setResults] = useState<ImportRowResult[]>([]);
  const [imported, setImported] = useState<number | null>(null);
  const [parseError, setParseError] = useState('');

  const def = IMPORT_DEFS[kind];

  // Pre-import duplicate check: compare parsed values against existing entries
  const dupRows = useMemo(() => {
    if (results.length === 0) return new Set<number>();
    const set = new Set<number>();
    const existingAmounts = new Map<string, boolean>();
    if (kind === 'income') {
      for (const e of data.income) existingAmounts.set(`${e.date}|${e.amount}|${e.marketplace}`, true);
      results.forEach((r, i) => { if (existingAmounts.has(`${r.values.date}|${Number(r.values.amount)}|${r.values.marketplace}`)) set.add(i); });
    } else if (kind === 'goods') {
      for (const e of data.goods) existingAmounts.set(`${e.date}|${e.amount}`, true);
      results.forEach((r, i) => {
        const amt = r.values.amount ? Number(r.values.amount) : Number(r.values.qty) * Number(r.values.rate);
        if (existingAmounts.has(`${r.values.date}|${amt}`)) set.add(i);
      });
    } else if (kind === 'service' || kind === 'advertising' || kind === 'hr') {
      for (const e of data.services) existingAmounts.set(`${e.date}|${e.amount}`, true);
      results.forEach((r, i) => { if (existingAmounts.has(`${r.values.date}|${Number(r.values.amount)}`)) set.add(i); });
    }
    return set;
  }, [results, data, kind]);

  const onFile = async (file: File) => {
    setParseError('');
    try {
      const parsed = await parseWorkbook(file);
      if (parsed.headers.length === 0) { setParseError('The sheet appears to be empty.'); return; }
      setSheet(parsed);
      setMapping(autoMap(parsed.headers, def.fields));
      setStep(2);
      setImported(null);
    } catch {
      setParseError('Could not read this file. Please upload a valid .xlsx / .xls / .csv file.');
    }
  };

  const runValidation = () => {
    if (!sheet) return;
    const valueRows = rowsToValues(sheet.rows, mapping);
    setResults(validateRows(kind, data, valueRows));
    setStep(3);
  };

  const doImport = () => {
    const built = buildEntries(kind, data, results);
    const count = built.income.length + built.goods.length + built.services.length + built.stock.length;
    update((d) => scanDuplicates({
      ...d,
      income: [...d.income, ...built.income],
      goods: [...d.goods, ...built.goods],
      services: [...d.services, ...built.services],
      stock: [...d.stock, ...built.stock],
    }));
    setImported(count);
    setStep(4);
  };

  const reset = () => {
    setStep(1); setSheet(null); setMapping({}); setResults([]); setImported(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validCount = results.filter((r) => !r.skipped && r.errors.length === 0).length;
  const mappedRequired = def.fields.filter((f) => f.required).every((f) => Object.values(mapping).includes(f.key));

  const setCell = (rowIdx: number, key: string, val: string) => {
    setResults((prev) => {
      const next = prev.map((r, i) => (i === rowIdx ? { ...r, values: { ...r.values, [key]: val } } : r));
      return validateRows(kind, data, next.map((r) => r.values)).map((vr, i) => ({ ...vr, skipped: next[i].skipped }));
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import from Excel</h1>
        <p className="text-sm text-slate-500">Upload → preview → map columns → validate → correct → import. Duplicates are flagged, never auto-deleted.</p>
      </div>

      {/* Templates */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">1 · Download a template (optional but recommended)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Button key={k} variant="outline" size="sm" onClick={() => downloadTemplate(k)}>
              <Download className="mr-1 h-3.5 w-3.5" /> {IMPORT_DEFS[k].title}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Step 1: pick kind + file */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">2 · Choose data type &amp; upload file</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={kind} onValueChange={(v) => { setKind(v as ImportKind); reset(); }}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{IMPORT_DEFS[k].title}</SelectItem>)}</SelectContent>
          </Select>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
          />
          <Button onClick={() => fileRef.current?.click()} className="bg-amber-500 text-slate-900 hover:bg-amber-400">
            <FileUp className="mr-1 h-4 w-4" /> Upload Excel
          </Button>
          {parseError && <span className="text-sm text-red-600">{parseError}</span>}
          {step > 1 && <Button variant="ghost" size="sm" onClick={reset}>Start over</Button>}
        </CardContent>
      </Card>

      {/* Step 2: preview + mapping */}
      {step >= 2 && sheet && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">3 · Preview &amp; map columns <Badge variant="secondary" className="ml-2">{sheet.rows.length} rows · sheet “{sheet.sheetName}”</Badge></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sheet.headers.map((h, i) => (
                      <TableHead key={i} className="min-w-44">
                        <div className="mb-1 truncate text-xs font-semibold" title={h}>{h || `(column ${i + 1})`}</div>
                        <Select
                          value={mapping[i] ?? 'skip'}
                          onValueChange={(v) => setMapping((m) => {
                            const next = { ...m };
                            if (v === 'skip') delete next[i];
                            else next[i] = v;
                            return next;
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Skip column" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">— Skip —</SelectItem>
                            {def.fields.map((f) => (
                              <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.rows.slice(0, 5).map((r, ri) => (
                    <TableRow key={ri}>
                      {sheet.headers.map((_, ci) => (
                        <TableCell key={ci} className="max-w-44 truncate text-xs">{String(r[ci] ?? '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!mappedRequired && (
              <p className="flex items-center gap-1 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" /> Map all required (*) fields before continuing.</p>
            )}
            <div className="flex justify-end">
              <Button disabled={!mappedRequired} onClick={runValidation} className="bg-amber-500 text-slate-900 hover:bg-amber-400">
                Validate rows <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: validation + correction */}
      {step >= 3 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              4 · Validate &amp; correct
              <Badge variant="secondary" className="ml-2">{validCount} ready</Badge>
              {results.length - validCount > 0 && <Badge variant="destructive" className="ml-1">{results.length - validCount} with issues</Badge>}
              {dupRows.size > 0 && <Badge className="ml-1 bg-orange-500 text-white hover:bg-orange-500">{dupRows.size} possible duplicates</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Import?</TableHead>
                    {def.fields.filter((f) => Object.values(mapping).includes(f.key)).map((f) => (
                      <TableHead key={f.key} className="min-w-32">{f.label}</TableHead>
                    ))}
                    <TableHead className="min-w-48">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, ri) => (
                    <TableRow key={ri} className={r.skipped ? 'opacity-40' : r.errors.length > 0 ? 'bg-red-50' : dupRows.has(ri) ? 'bg-orange-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={!r.skipped}
                          onCheckedChange={(v) => setResults((prev) => prev.map((x, i) => (i === ri ? { ...x, skipped: v !== true } : x)))}
                        />
                      </TableCell>
                      {def.fields.filter((f) => Object.values(mapping).includes(f.key)).map((f) => (
                        <TableCell key={f.key} className="p-1">
                          <Input
                            className="h-8 min-w-28 text-xs"
                            value={r.values[f.key] ?? ''}
                            onChange={(e) => setCell(ri, f.key, e.target.value)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-xs">
                        {r.errors.map((e, i) => <div key={i} className="text-red-600">{e}</div>)}
                        {dupRows.has(ri) && r.errors.length === 0 && <span className="font-medium text-orange-600">Possible duplicate of an existing entry</span>}
                        {r.errors.length === 0 && !dupRows.has(ri) && <span className="text-emerald-600">OK</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-1 h-4 w-4" /> Back to mapping</Button>
              <Button disabled={validCount === 0} onClick={doImport} className="bg-emerald-600 text-white hover:bg-emerald-500">
                <CheckCircle2 className="mr-1 h-4 w-4" /> Import {validCount} row{validCount === 1 ? '' : 's'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: done */}
      {step === 4 && imported !== null && (
        <Card className="border-emerald-300 bg-emerald-50 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <div className="font-semibold text-emerald-800">Import complete — {imported} entries added</div>
                <div className="text-sm text-emerald-700">Duplicate scan has been re-run. Check the Duplicates page if you are an admin.</div>
              </div>
            </div>
            <Button variant="outline" onClick={reset}>Import another file</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
