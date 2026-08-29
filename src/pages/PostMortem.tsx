import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { postMortem, headline } from '@/lib/calc';
import { fmtINR, fmtPct } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, IndianRupee, TrendingDown, ShoppingCart, Trophy, Lightbulb, AlertTriangle, Info } from 'lucide-react';

const sevIcon = {
  critical: <AlertTriangle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  positive: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  info: <Info className="h-5 w-5 text-sky-500" />,
} as const;

const sevBadge = {
  critical: <Badge variant="destructive">Critical</Badge>,
  warning: <Badge className="bg-amber-500 text-white hover:bg-amber-500">Warning</Badge>,
  positive: <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">Positive</Badge>,
  info: <Badge variant="secondary">Info</Badge>,
} as const;

function ListCard({ title, icon, items, empty, color }: { title: string; icon: React.ReactNode; items: string[]; empty: string; color: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-base ${color}`}>{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            {items.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PostMortem() {
  const { data } = useApp();
  const pm = useMemo(() => postMortem(data), [data]);
  const h = useMemo(() => headline(data), [data]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rakhi 2026 Post-Mortem</h1>
        <p className="text-sm text-slate-500">Auto-generated from live data. Findings update as entries are added or corrected.</p>
      </div>

      {/* Verdict strip */}
      <Card className={`shadow-sm ${h.netProfit >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <div className={`text-lg font-bold ${h.netProfit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              Final result: {h.netProfit >= 0 ? 'PROFIT' : 'LOSS'} of {fmtINR(Math.abs(h.netProfit))} ({fmtPct(Math.abs(h.marginPct))} margin)
            </div>
            <div className="text-sm text-slate-600">
              Revenue {fmtINR(h.totalSales)} · Inventory consumed {fmtINR(h.inventoryConsumed)} · Unsold stock {fmtPct(h.unsoldStockPct)} · Best marketplace: <b>{pm.bestMarketplace}</b>
            </div>
          </div>
          <Trophy className={`h-10 w-10 ${h.netProfit >= 0 ? 'text-emerald-500' : 'text-red-400'}`} />
        </CardContent>
      </Card>

      {/* Auto findings */}
      <div>
        <h2 className="mb-2 text-lg font-semibold text-slate-800">Auto-detected findings ({pm.findings.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {pm.findings.map((f, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                {sevIcon[f.severity]}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{f.title}</span>
                    {sevBadge[f.severity]}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{f.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {pm.findings.length === 0 && <p className="text-sm text-slate-400">Not enough data yet to generate findings.</p>}
        </div>
      </div>

      {/* Answers */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ListCard title="What worked" icon={<CheckCircle2 className="h-5 w-5" />} items={pm.whatWorked} empty="Nothing clearly positive detected yet." color="text-emerald-700" />
        <ListCard title="What didn't work" icon={<XCircle className="h-5 w-5" />} items={pm.whatDidnt} empty="No major failures detected." color="text-red-700" />
        <ListCard title="Where we lost money" icon={<IndianRupee className="h-5 w-5" />} items={pm.lostMoney} empty="No loss pockets detected." color="text-red-700" />
        <ListCard title="Where we overspent" icon={<TrendingDown className="h-5 w-5" />} items={pm.overspent} empty="Spend levels look within thresholds." color="text-amber-700" />
        <ListCard title="Where we over-purchased stock" icon={<ShoppingCart className="h-5 w-5" />} items={pm.overPurchased} empty="No over-purchasing detected." color="text-amber-700" />
        <ListCard title="Rakhi 2027 recommendations" icon={<Lightbulb className="h-5 w-5" />} items={pm.recommendations} empty="Add more data to generate recommendations." color="text-sky-700" />
      </div>
    </div>
  );
}
