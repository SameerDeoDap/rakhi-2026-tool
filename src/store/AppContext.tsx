import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, Role } from '@/lib/types';
import { loadData, saveData, loadSession, saveSession } from '@/lib/db';
import type { SessionRole } from '@/lib/db';
import { scanDuplicates } from '@/lib/dupes';

interface AppContextValue {
  data: AppData;
  role: Role | null;
  login: (password: string) => boolean;
  logout: () => void;
  /** Mutate data; persists to storage and re-runs duplicate detection. */
  update: (fn: (d: AppData) => AppData, opts?: { skipDupeScan?: boolean }) => void;
  pendingDupCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const PASSWORDS: Record<string, Role> = {
  'Nikul@2026': 'admin',
  rakhi2026: 'user',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const [role, setRole] = useState<SessionRole>(() => loadSession());

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
      let next = fn(prev);
      if (!opts?.skipDupeScan) next = scanDuplicates(next);
      saveData(next);
      return next;
    });
  }, []);

  const pendingDupCount = useMemo(
    () => data.duplicates.filter((d) => d.status === 'pending').length,
    [data.duplicates],
  );

  const value = useMemo(
    () => ({ data, role, login, logout, update, pendingDupCount }),
    [data, role, login, logout, update, pendingDupCount],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
