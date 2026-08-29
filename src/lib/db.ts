import type { AppData } from './types';
import { buildSeed } from './seed';

/**
 * Data layer — all reads/writes go through this module.
 * Currently backed by localStorage; swap these functions for API calls
 * to move to a backend without touching the UI.
 */

const STORAGE_KEY = 'rakhi2026.data.v2'; // v2: starts empty (no demo dataset)
const SESSION_KEY = 'rakhi2026.session';

export function emptyData(): AppData {
  return buildSeed(); // structure only, zero transactions
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = emptyData();
      saveData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.version) throw new Error('bad data');
    return parsed;
  } catch {
    const fresh = emptyData();
    saveData(fresh);
    return fresh;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportJSON(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rakhi-2026-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportJSON(text: string): AppData {
  const parsed = JSON.parse(text) as AppData;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.income) || !Array.isArray(parsed.goods)) {
    throw new Error('Not a valid Rakhi 2026 data file');
  }
  return { ...parsed, version: 1 };
}

// ─── Session (role) ───────────────────────────────────────────────────────────
export type SessionRole = 'admin' | 'user' | null;

export function loadSession(): SessionRole {
  const v = localStorage.getItem(SESSION_KEY);
  return v === 'admin' || v === 'user' ? v : null;
}

export function saveSession(role: SessionRole): void {
  if (role) localStorage.setItem(SESSION_KEY, role);
  else localStorage.removeItem(SESSION_KEY);
}
