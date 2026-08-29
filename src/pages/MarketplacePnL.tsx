import { useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { marketplacePnL, revenue, activeIncome } from '@/lib/calc';
import { REVENUE_TYPES } from '@/lib/types';
import { fmtINR, fmtPct } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function MarketplacePnL() {
  const { data } = useApp();
  const pnl = useMemo(() => marketplacePnL(data), [data]);
  const [openMp, setOpenMp] = useState<string | null>(null);

  const sellerRows = (mp: string) => {
    const accounts = data.sellerAccounts.filter((s) => s.marketplace === mp);
    return accounts.map((acc) => ({
      name: acc.name,
      revenue: activeIncome(data)
        .filter((e) => e.sellerAccountId === acc.id && REVENUE_TYPES.includes(e.incomeType))
        .reduce((s, e) => s + e.amount, 0),
    })).filter((r) => r.revenue > 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Marketplace P&amp;L</h1>
        <p className="text-sm text-slate-500">
          Seller accounts consolidated per marketplace. Common expenses allocated by <b>{data.settings.allocationMethod === 'manual' ? 'manual %' : `${data.settings.allocationMethod} %`}</b> (change in Settings). Inventory consumed allocated by revenue share.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Marketplace</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Goods Cost (Consumed)</TableHead>
                <TableHead className="text-right">Advertising</TableHead>
                <TableHead className="text-right">Marketplace Expenses</TableHead>
                <TableHead className="text-right">Allocated Common</TableHead>
                <TableHead className="text-right">Profit / Loss</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pnl.map((p) => {
                const sellers = sellerRows(p.marketplace);
                const open = openMp === p.marketplace;
                return [
                  <TableRow
                    key={p.marketplace}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setOpenMp(open ? null : p.marketplace)}
                  >
                    <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell className="font-semibold">{p.marketplace}</TableCell>
                    <TableCell className="text-right">{fmtINR(p.revenue)}</TableCell>
                    <TableCell className="text-right">{fmtINR(p.inventoryConsumed)}</TableCell>
                    <TableCell className="text-right">{fmtINR(p.advertising)}</TableCell>
                    <TableCell className="text-right">{fmtINR(p.marketplaceExpenses)}</TableCell>
                    <TableCell className="text-right">{fmtINR(p.allocatedCommon)}</TableCell>
                    <TableCell className={`text-right font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtINR(p.profit)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.marginPct >= 10 ? 'secondary' : p.marginPct >= 0 ? 'default' : 'destructive'}>{fmtPct(p.marginPct)}</Badge>
                    </TableCell>
                  </TableRow>,
                  open && (
                    <TableRow key={`${p.marketplace}-detail`} className="bg-slate-50 hover:bg-slate-50">
                      <TableCell />
                      <TableCell colSpan={8}>
                        {sellers.length > 0 ? (
                          <div className="py-2">
                            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Seller account drill-down (revenue)</div>
                            <div className="space-y-1">
                              {sellers.map((s) => (
                                <div key={s.name} className="flex w-96 items-center justify-between text-sm">
                                  <span>{s.name}</span>
                                  <span className="font-medium">{fmtINR(s.revenue)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 text-sm text-slate-400">No seller-account-level revenue recorded. Marketplace revenue: {fmtINR(revenue(data, p.marketplace))}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                ];
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">How each marketplace row is computed</CardTitle></CardHeader>
        <CardContent className="font-mono text-xs text-slate-600">
          Profit = Revenue − Inventory Consumed (revenue-share) − Marketplace-specific Advertising − Marketplace-specific Expenses − Allocated Common Expenses ({data.settings.allocationMethod} method). TCS, Bank Receipts and Recoverables are excluded from Revenue.
        </CardContent>
      </Card>
    </div>
  );
}
