import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, Role } from '@/lib/types';
import { SHARED_MODE, loadData, loadRemote, pushDiff, saveData, subscribeRemote, loadSession, saveSession } from '@/lib/db';
import type { SessionRole } from '@/lib/db';
import { scanDuplicates } from '@/lib/dupes';

export type DataMode = 'shared' | 'local';

interface AppContextValue {
  data: AppData;
  role: Role | null;
  login: (password: string) => boolean;
  logout: () => void;
  /** Mutate data; persists (local + Supabase write-through) and re-runs duplicate detection. */
  update: (fn: (d: AppData) => AppData, opts?: { skipDupeScan?: boolean }) => void;
  pendingDupCount: number;
  /** 'shared' = Supabase team dataset, 'local' = this browser only. */
  mode: DataMode;
  /** Non-empty when a shared-mode load/save failed (data is still safe locally). */
  syncError: string;
}

const AppContext = createContext<AppContextValue | null>(null);

const PASSWORDS: Record<string, Role> = {
  'Nikul@2026': 'admin',
  rakhi2026: 'user',
};

function LoadingScreen({ error }: { error: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-lg font-semibold text-red-400">Could not reach the shared database</div>
            <div className="mt-2 max-w-md text-sm text-slate-400">{error}</div>
            <div className="mt-3 text-xs text-slate-500">Check the Supabase URL/key and that schema.sql has been run, then refresh.</div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-white">Rakhi 2026 Project</div>
            <div className="mt-2 text-sm text-slate-400">Connecting to shared database…</div>
          </>
        )}
      </div>
    </div>
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Local mode keeps its synchronous boot; shared mode loads asynchronously.
  const [data, setData] = useState<AppData | null>(() => (SHARED_MODE ? null : loadData()));
  const [role, setRole] = useState<SessionRole>(() => loadSession());
  const [syncError, setSyncError] = useState('');
  const lastLocalWrite = useRef(0);

  // Shared mode: initial load
  useEffect(() => {
    if (!SHARED_MODE) return;
    let cancelled = false;
    loadRemote()
      .then((d) => {
        if (cancelled) return;
        saveData(d); // offline cache
        setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setSyncError(e instanceof Error ? e.message : 'Unknown connection error');
      });
    return () => { cancelled = true; };
  }, []);

  // Shared mode: live updates (debounced reload; never clobbers a just-made local edit)
  const loaded = data !== null;
  useEffect(() => {
    if (!SHARED_MODE || !loaded) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (Date.now() - lastLocalWrite.current < 1000) { reload(); return; } // own write still settling — re-check shortly
        loadRemote()
          .then((d) => { saveData(d); setData(d); })
          .catch(() => { /* transient network issue — next event retries */ });
      }, 400);
    };
    const unsubscribe = subscribeRemote(reload);
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [loaded]);

  const login = useCallback((password: string): boolean => {
    const r = PASSWORDS[password];
    if (r) {
      setRole(r);
      saveSession(r);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    saveSession(null);
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData, opts?: { skipDupeScan?: boolean }) => {
    setData((prev) => {
      if (!prev) return prev;
      let next = fn(prev);
      if (!opts?.skipDupeScan) next = scanDuplicates(next);
      saveData(next); // local cache in both modes
      if (SHARED_MODE) {
        lastLocalWrite.current = Date.now();
        pushDiff(prev, next).catch((e: unknown) => {
          console.error('Supabase write-through failed', e);
          setSyncError(`Save to shared database failed (${e instanceof Error ? e.message : 'unknown error'}). Your change is kept in this browser; refresh to resync.`);
        });
      }
      return next;
    });
  }, []);

  const pendingDupCount = useMemo(
    () => (data ? data.duplicates.filter((d) => d.status === 'pending').length : 0),
    [data],
  );

  const value = useMemo<AppContextValue | null>(() => {
    if (!data) return null;
    return {
      data, role, login, logout, update, pendingDupCount,
      mode: SHARED_MODE ? 'shared' : 'local',
      syncError,
    };
  }, [data, role, login, logout, update, pendingDupCount, syncError]);

  if (!value) return <LoadingScreen error={syncError} />;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
