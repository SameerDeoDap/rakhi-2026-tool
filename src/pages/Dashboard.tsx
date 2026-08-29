import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { headline, marketplacePnL, categoryStockTable } from '@/lib/calc';
import { fmtINR, fmtPct } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';

const COLORS = ['#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#ef4444', '#64748b'];

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-xl font-bold ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-slate-900'}`}>
          {value}
        </div>
        {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data } = useApp();
  const h = useMemo(() => headline(data), [data]);
  const pnl = useMemo(() => marketplacePnL(data), [data]);
  const catStock = useMemo(() => categoryStockTable(data), [data]);

  const marginChart = pnl.filter((p) => p.revenue > 0).map((p) => ({
    name: p.marketplace, Revenue: Math.round(p.revenue), Profit: Math.round(p.profit),
  }));
  const stockPie = catStock.filter((c) => c.closing > 0).map((c) => ({ name: c.category, value: Math.round(c.closing) }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CEO Dashboard</h1>
          <p className="text-sm text-slate-500">Rakhi 2026 · consolidated profitability across all marketplaces</p>
        </div>
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${h.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {h.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          Net {h.netProfit >= 0 ? 'Profit' : 'Loss'}: {fmtINR(Math.abs(h.netProfit))} ({fmtPct(Math.abs(h.marginPct))})
        </div>
      </div>

      {/* KPI grid — spec §11 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <Kpi label="Total Sales" value={fmtINR(h.totalSales)} sub="excl. TCS & recoverables" />
        <Kpi label="Marketplace Income" value={fmtINR(h.marketplaceIncome)} />
        <Kpi label="Bank Receipts" value={fmtINR(h.bankReceipts)} sub="cash received, not revenue" />
        <Kpi label="Goods Cost (Purchases)" value={fmtINR(h.goodsCost)} />
        <Kpi label="Inventory Consumed" value={fmtINR(h.inventoryConsumed)} sub="opening + purchases − closing" />
        <Kpi label="Service Expenses" value={fmtINR(h.serviceExpenses)} />
        <Kpi label="Advertising Spend" value={fmtINR(h.adSpend)} sub={fmtPct(h.totalSales > 0 ? (h.adSpend / h.totalSales) * 100 : 0) + ' of sales'} />
        <Kpi label="HR / Manpower" value={fmtINR(h.hrCost)} />
        <Kpi label="Closing Stock Value" value={fmtINR(h.closingStock)} />
        <Kpi label="Unsold Stock" value={fmtPct(h.unsoldStockPct)} tone={h.unsoldStockPct > 30 ? 'bad' : undefined} sub={`sell-through ${fmtPct(h.sellThroughPct)}`} />
        <Kpi label="Gross Profit" value={fmtINR(h.grossProfit)} tone={h.grossProfit >= 0 ? 'good' : 'bad'} />
        <Kpi label="Net Profit / Loss" value={fmtINR(h.netProfit)} tone={h.netProfit >= 0 ? 'good' : 'bad'} />
        <Kpi label="Profit Margin" value={fmtPct(h.marginPct)} tone={h.marginPct >= 0 ? 'good' : 'bad'} />
        <Kpi label="TCS / Recoverables" value={fmtINR(h.tcsRecoverables)} sub="not counted as revenue" />
        <Kpi label="Outstanding Receivables" value={fmtINR(h.outstandingReceivables)} tone={h.outstandingReceivables > 0 ? 'bad' : undefined} />
        <Kpi label="Outstanding Payments" value={fmtINR(h.outstandingPayables)} tone={h.outstandingPayables > 0 ? 'bad' : undefined} />
      </div>

      {/* Profit formula — transparent per spec */}
      <Card className="border-amber-200 bg-amber-50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-amber-900">Profit formula (as implemented)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-xs text-amber-900">
          <div>Net Profit = Marketplace Sales Income (excl. TCS &amp; recoverables) − Inventory Consumed − Service Expenses − Advertising − HR/Manpower (incl. allocated common costs)</div>
          <div className="pt-1 text-sm font-semibold">
            {fmtINR(h.netProfit)} = {fmtINR(h.totalSales)} − {fmtINR(h.inventoryConsumed)} − {fmtINR(h.serviceExpenses)} − {fmtINR(h.adSpend)} − {fmtINR(h.hrCost)}
          </div>
          <div className="text-amber-700">
            Inventory Consumed = Opening ({fmtINR(h.openingStock)}) + Purchases ({fmtINR(h.goodsCost)}) − Closing ({fmtINR(h.closingStock)}) = {fmtINR(h.inventoryConsumed)}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Revenue vs Profit by Marketplace</CardTitle></CardHeader>
          <CardContent className="h-72">
            {marginChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginChart}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number | string) => fmtINR(Number(v))} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-slate-400">
                <span>No revenue data yet</span>
                <span className="text-xs">Add income entries or import from Excel to see this chart</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Closing Stock by Category (leftover)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {stockPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockPie} dataKey="value" nameKey="name" outerRadius={95} label={(p) => `${p.name}`}>
                    {stockPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number | string) => fmtINR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No closing stock recorded yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
