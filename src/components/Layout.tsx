import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard, TrendingUp, ReceiptIndianRupee, Boxes, FileUp, CopyX,
  Tags, Store, ClipboardList, Settings, LogOut, ShieldCheck, User, Cloud, HardDrive,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/income', label: 'Income', icon: TrendingUp },
  { to: '/expenses', label: 'Expenses', icon: ReceiptIndianRupee },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/import', label: 'Import Excel', icon: FileUp },
  { to: '/duplicates', label: 'Duplicates', icon: CopyX, adminOnly: true, badge: true },
  { to: '/categories', label: 'Categories', icon: Tags, adminOnly: true },
  { to: '/marketplace', label: 'Marketplace P&L', icon: Store },
  { to: '/postmortem', label: 'Post-Mortem', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
] as const;

export default function Layout() {
  const { role, logout, pendingDupCount, mode, syncError } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-slate-900 text-slate-200">
        <div className="border-b border-slate-700/60 px-5 py-5">
          <div className="text-lg font-bold tracking-tight text-white">Rakhi 2026 Project</div>
          <div className="mt-0.5 text-xs text-slate-400">DeoDap · Profit &amp; Loss Tracker</div>
          <div className="mt-2">
            {mode === 'shared' ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15" title="Connected to the shared Supabase database — the whole team sees the same data">
                <Cloud className="mr-1 h-3 w-3" /> Shared · team data
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-slate-700/60 text-slate-300 hover:bg-slate-700/60" title="Data is stored only in this browser">
                <HardDrive className="mr-1 h-3 w-3" /> Local only
              </Badge>
            )}
          </div>
          {syncError && (
            <div className="mt-2 rounded-md bg-red-500/15 px-2 py-1.5 text-[11px] leading-snug text-red-300">
              {syncError}
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            if ('adminOnly' in item && item.adminOnly && role !== 'admin') return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-amber-500/15 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && item.badge && pendingDupCount > 0 && (
                  <Badge className="bg-red-500/90 text-white hover:bg-red-500/90">{pendingDupCount}</Badge>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-slate-700/60 px-4 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm">
            {role === 'admin' ? (
              <>
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-amber-300">Admin · Nikul</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-sky-400" />
                <span className="font-medium text-sky-300">Team User</span>
              </>
            )}
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="ml-60 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
