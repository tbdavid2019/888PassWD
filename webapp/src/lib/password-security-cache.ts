import { inspectVaultPasswordSecurity, type PasswordSecurityReport } from '@/lib/password-security';
import type { Cipher } from '@/lib/types';

export interface SecurityTriageItemResult {
  id: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  reason: string;
  recommendation: string;
  assetType?: string;
  badgeText?: string;
  isPublicAsset?: boolean;
  isPrivilegedAccount?: boolean;
}

export interface SecurityAiEvaluation {
  riskGrade: 'A+' | 'B' | 'CRITICAL';
  recommendation: string;
  provider: string;
  latencyMs: number;
}

export interface PasswordSecurityState {
  fingerprint: string;
  report: PasswordSecurityReport | null;
  scannedAt: number | null;
  scanning: boolean;
  progress: { checked: number; total: number };
  scanError: boolean;
  triageMap: Record<string, SecurityTriageItemResult>;
  aiEvaluation: SecurityAiEvaluation | null;
}

type InternalPasswordSecurityState = PasswordSecurityState & { controller: AbortController | null };

const STORAGE_KEY = 'nodewarden_security_assessment_v1';

function loadPersistedState(): {
  report: PasswordSecurityReport | null;
  scannedAt: number | null;
  triageMap: Record<string, SecurityTriageItemResult>;
  aiEvaluation: SecurityAiEvaluation | null;
} | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        report: parsed.report || null,
        scannedAt: typeof parsed.scannedAt === 'number' ? parsed.scannedAt : null,
        triageMap: parsed.triageMap && typeof parsed.triageMap === 'object' ? parsed.triageMap : {},
        aiEvaluation: parsed.aiEvaluation || null,
      };
    }
  } catch (err) {
    console.warn('Failed to load persisted security assessment:', err);
  }
  return null;
}

function savePersistedState(s: PasswordSecurityState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const toSave = {
      report: s.report,
      scannedAt: s.scannedAt,
      triageMap: s.triageMap,
      aiEvaluation: s.aiEvaluation,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Failed to persist security assessment:', err);
  }
}

const initialPersisted = loadPersistedState();

let state: InternalPasswordSecurityState = {
  fingerprint: '',
  report: initialPersisted?.report || null,
  scannedAt: initialPersisted?.scannedAt || null,
  scanning: false,
  progress: { checked: 0, total: 0 },
  scanError: false,
  controller: null,
  triageMap: initialPersisted?.triageMap || {},
  aiEvaluation: initialPersisted?.aiEvaluation || null,
};

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function ensurePasswordSecurityState(fingerprint: string): InternalPasswordSecurityState {
  state.fingerprint = fingerprint;
  return state;
}

export function getPasswordSecurityState(fingerprint: string): PasswordSecurityState {
  return ensurePasswordSecurityState(fingerprint);
}

export function readPasswordSecurityState(fingerprint?: string): PasswordSecurityState | null {
  return state;
}

export function subscribePasswordSecurityState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSecurityTriageResults(
  triageItems: SecurityTriageItemResult[],
  aiEvaluation: SecurityAiEvaluation,
): void {
  const map: Record<string, SecurityTriageItemResult> = { ...state.triageMap };
  for (const item of triageItems) {
    map[item.id] = item;
  }
  state = {
    ...state,
    triageMap: map,
    aiEvaluation,
  };
  savePersistedState(state);
  notify();
}

export function removeCipherFromSecurityAssessment(cipherId: string): void {
  const nextTriageMap = { ...state.triageMap };
  delete nextTriageMap[cipherId];

  let nextReport = state.report;
  if (nextReport) {
    const deletedItem = nextReport.items.find((i) => i.cipherId === cipherId);
    const nextItems = nextReport.items.filter((i) => i.cipherId !== cipherId);
    nextReport = {
      ...nextReport,
      items: nextItems,
      exposedCount: Math.max(0, nextReport.exposedCount - (deletedItem && (deletedItem.exposedCount || 0) > 0 ? 1 : 0)),
      weakCount: Math.max(0, nextReport.weakCount - (deletedItem?.weak ? 1 : 0)),
      reusedCount: Math.max(0, nextReport.reusedCount - (deletedItem && deletedItem.reusedCount > 1 ? 1 : 0)),
      checkedCount: Math.max(0, nextReport.checkedCount - 1),
      eligibleCount: Math.max(0, nextReport.eligibleCount - 1),
    };
  }

  state = {
    ...state,
    report: nextReport,
    triageMap: nextTriageMap,
  };
  savePersistedState(state);
  notify();
}

export function getSecurityPriorityMap(): Map<string, 'P0' | 'P1' | 'P2' | 'P3'> {
  const map = new Map<string, 'P0' | 'P1' | 'P2' | 'P3'>();
  if (state.triageMap) {
    for (const [id, item] of Object.entries(state.triageMap)) {
      if (item && item.priority) {
        map.set(id, item.priority);
      }
    }
  }
  if (state.report?.items) {
    for (const item of state.report.items) {
      if (!map.has(item.cipherId)) {
        if ((item.exposedCount || 0) > 0) map.set(item.cipherId, 'P0');
        else if (item.reusedCount > 1) map.set(item.cipherId, 'P1');
        else if (item.weak) map.set(item.cipherId, 'P2');
      }
    }
  }
  return map;
}

export function getSecurityRiskCounts(): { p0: number; p1: number; p2: number; total: number } {
  const priorities = getSecurityPriorityMap();
  let p0 = 0;
  let p1 = 0;
  let p2 = 0;
  for (const prio of priorities.values()) {
    if (prio === 'P0') p0++;
    else if (prio === 'P1') p1++;
    else if (prio === 'P2') p2++;
  }
  return { p0, p1, p2, total: p0 + p1 + p2 };
}

export function startPasswordSecurityScan(fingerprint: string, ciphers: Cipher[]): void {
  const current = ensurePasswordSecurityState(fingerprint);
  current.controller?.abort();
  const controller = new AbortController();
  const total = ciphers.filter((cipher) => Number(cipher.type) === 1 && !cipher.deletedDate && !(cipher as { deletedAt?: string | null }).deletedAt && !!cipher.login?.decPassword).length;
  state = { ...current, scanning: true, progress: { checked: 0, total }, scanError: false, controller };
  notify();

  void (async () => {
    try {
      const report = await inspectVaultPasswordSecurity(ciphers, (checked, total) => {
        if (controller.signal.aborted || state?.controller !== controller) return;
        state = { ...state, progress: { checked, total } };
        notify();
      }, fetch, controller.signal);
      if (controller.signal.aborted || state?.controller !== controller) return;
      state = { ...state, report, scannedAt: Date.now() };
      savePersistedState(state);
    } catch (error) {
      if (controller.signal.aborted || (error as { name?: string } | null)?.name === 'AbortError') return;
      if (state?.controller === controller) state = { ...state, scanError: true };
    } finally {
      if (state?.controller === controller) state = { ...state, controller: null, scanning: false };
      notify();
    }
  })();
}

export function clearPasswordSecurityCache(): void {
  state?.controller?.abort();
  state = {
    fingerprint: '',
    report: null,
    scannedAt: null,
    scanning: false,
    progress: { checked: 0, total: 0 },
    scanError: false,
    controller: null,
    triageMap: {},
    aiEvaluation: null,
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  notify();
}
