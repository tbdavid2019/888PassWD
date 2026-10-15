import { useEffect, useMemo, useState } from 'preact/hooks';
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck, Sparkles, Trash2, Unplug } from 'lucide-preact';
import { Link } from 'wouter';
import ConfirmDialog from '@/components/ConfirmDialog';
import { maskSecret } from '@/components/vault/vault-page-helpers';
import {
  getPasswordSecurityState,
  readPasswordSecurityState,
  removeCipherFromSecurityAssessment,
  setSecurityTriageResults,
  startPasswordSecurityScan,
  subscribePasswordSecurityState,
  type SecurityTriageItemResult,
} from '@/lib/password-security-cache';
import type { DecisionExecutionResult } from '@/lib/api/admin';
import type { VaultTriageItemInput, VaultTriageResponse } from '@/lib/api/vault';
import { t } from '@/lib/i18n';
import type { Cipher } from '@/lib/types';

interface PasswordSecurityPageProps {
  ciphers: Cipher[];
  loading: boolean;
  onTriage?: (items: VaultTriageItemInput[]) => Promise<VaultTriageResponse>;
  onEvaluate?: (state: Record<string, unknown> | null, questions: Record<string, unknown>) => Promise<DecisionExecutionResult>;
  onDelete?: (cipher: Cipher) => Promise<void>;
  onNotify?: (type: 'success' | 'error' | 'warning', text: string) => void;
}

type PasswordSecurityFilter = 'all' | 'p0' | 'p1' | 'p2' | 'exposed' | 'reused' | 'weak';

function vaultFingerprint(ciphers: Cipher[]): string {
  return JSON.stringify(ciphers.map((cipher) => ({
    id: cipher.id,
    type: cipher.type,
    revisionDate: cipher.revisionDate || '',
    deletedDate: cipher.deletedDate || (cipher as { deletedAt?: string | null }).deletedAt || '',
  })));
}

function formatCheckedAt(value: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export default function PasswordSecurityPage(props: PasswordSecurityPageProps) {
  const fingerprint = vaultFingerprint(props.ciphers);
  const [securityState, setSecurityState] = useState(() => getPasswordSecurityState(fingerprint));
  const [filter, setFilter] = useState<PasswordSecurityFilter>('all');
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Set<string>>(() => new Set());
  const [triageLoading, setTriageLoading] = useState(false);
  const [pendingDeleteCipher, setPendingDeleteCipher] = useState<Cipher | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setSecurityState(getPasswordSecurityState(fingerprint));
    return subscribePasswordSecurityState(() => {
      const next = readPasswordSecurityState(fingerprint);
      if (next) setSecurityState({ ...next });
    });
  }, [fingerprint]);

  const { report, scannedAt, scanning, progress, scanError, triageMap, aiEvaluation } = securityState;

  const ciphersById = useMemo(() => new Map(props.ciphers.map((cipher) => [cipher.id, cipher])), [props.ciphers]);

  useEffect(() => {
    if (!report || !props.onTriage) return;
    if (triageMap && Object.keys(triageMap).length > 0 && aiEvaluation) return;
    let active = true;
    setTriageLoading(true);
    void (async () => {
      try {
        const triageInputs: VaultTriageItemInput[] = report.items.map((item) => {
          const cipher = ciphersById.get(item.cipherId);
          return {
            id: item.cipherId,
            name: String(cipher?.decName || cipher?.name || ''),
            uri: cipher?.login?.uris?.[0]?.uri || undefined,
            username: cipher?.login?.decUsername || cipher?.login?.username || undefined,
            exposedCount: item.exposedCount || 0,
            reusedCount: item.reusedCount || 1,
            weak: item.weak,
          };
        });

        if (!props.onTriage) return;
        const result = await props.onTriage(triageInputs);
        if (!active) return;
        const triageItems: SecurityTriageItemResult[] = result.items.map((item) => ({
          id: item.id,
          priority: item.priority,
          reason: item.reason,
          recommendation: item.recommendation,
          badgeText: item.badgeText,
          isPublicAsset: item.isPublicAsset,
          isPrivilegedAccount: item.isPrivilegedAccount,
          assetType: item.isPublicAsset ? '公網資產' : '內部資產',
        }));
        setSecurityTriageResults(triageItems, {
          riskGrade: result.overallGrade,
          recommendation: result.summary,
          provider: result.provider === 'primary_clef' ? 'Clef-Flash (邊緣決策模型)' : result.provider === 'typesafe_jev' ? 'TypeSafe Jev' : result.provider,
          latencyMs: result.latencyMs,
        });
      } catch (err) {
        console.warn('Triage evaluation failed:', err);
      } finally {
        if (active) setTriageLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [report, props.onTriage, ciphersById, triageMap, aiEvaluation]);

  const eligibleCount = useMemo(
    () => props.ciphers.filter((cipher) => Number(cipher.type) === 1 && !cipher.deletedDate && !(cipher as { deletedAt?: string | null }).deletedAt && !!cipher.login?.decPassword).length,
    [props.ciphers],
  );

  const p0Count = useMemo(() => Object.values(triageMap || {}).filter((t) => t.priority === 'P0').length, [triageMap]);
  const p1Count = useMemo(() => Object.values(triageMap || {}).filter((t) => t.priority === 'P1').length, [triageMap]);
  const p2Count = useMemo(() => Object.values(triageMap || {}).filter((t) => t.priority === 'P2').length, [triageMap]);

  const filteredItems = useMemo(() => {
    if (!report) return [];
    let items = [...report.items];
    const priorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    items.sort((a, b) => {
      const pA = triageMap?.[a.cipherId]?.priority || (a.exposedCount ? 'P0' : a.reusedCount > 1 ? 'P1' : 'P2');
      const pB = triageMap?.[b.cipherId]?.priority || (b.exposedCount ? 'P0' : b.reusedCount > 1 ? 'P1' : 'P2');
      return (priorityRank[pA] ?? 3) - (priorityRank[pB] ?? 3);
    });

    if (filter === 'p0') return items.filter((item) => triageMap?.[item.cipherId]?.priority === 'P0');
    if (filter === 'p1') return items.filter((item) => triageMap?.[item.cipherId]?.priority === 'P1');
    if (filter === 'p2') return items.filter((item) => triageMap?.[item.cipherId]?.priority === 'P2');
    if (filter === 'exposed') return items.filter((item) => (item.exposedCount || 0) > 0);
    if (filter === 'reused') return items.filter((item) => item.reusedCount > 1);
    if (filter === 'weak') return items.filter((item) => item.weak);
    return items;
  }, [filter, report, triageMap]);

  const allPasswordsVisible = !!report?.items.length && report.items.every((item) => revealedPasswordIds.has(item.cipherId));

  const togglePasswordVisibility = (cipherId: string) => {
    setRevealedPasswordIds((current) => {
      const next = new Set(current);
      if (next.has(cipherId)) next.delete(cipherId);
      else next.add(cipherId);
      return next;
    });
  };

  const toggleAllPasswordVisibility = () => {
    if (!report) return;
    setRevealedPasswordIds(allPasswordsVisible ? new Set() : new Set(report.items.map((item) => item.cipherId)));
  };

  const scan = () => {
    setRevealedPasswordIds(new Set());
    setFilter('all');
    startPasswordSecurityScan(fingerprint, props.ciphers);
  };

  return (
    <section className="password-security-page" aria-label={t('txt_password_security')}>
      <div className="password-security-intro card">
        <div className="password-security-intro-icon"><ShieldCheck size={22} /></div>
        <div>
          <h2>{t('txt_password_security')}</h2>
          <p>{t('txt_password_security_privacy')}</p>
          {scannedAt && <p className="password-security-checked-at">{t('txt_password_security_last_checked', { value: formatCheckedAt(scannedAt) })}</p>}
        </div>
        <div className="password-security-intro-actions">
          {report && (
            <button type="button" className="btn btn-secondary password-security-toggle-all" onClick={toggleAllPasswordVisibility}>
              {allPasswordsVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              {allPasswordsVisible ? t('txt_password_security_hide_all') : t('txt_password_security_show_all')}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary password-security-scan"
            disabled={props.loading || scanning || !eligibleCount}
            onClick={scan}
          >
            {scanning ? <RefreshCw size={16} className="spin" /> : <ScanSearch size={16} />}
            {scanning
              ? `${t('txt_checking_password_security')} (${progress.checked}/${progress.total})`
              : report
              ? t('txt_recheck_password_security')
              : t('txt_check_password_security')}
          </button>
        </div>
      </div>

      {!report && !scanning && (
        <div className="password-security-empty card">
          <ScanSearch size={32} />
          <strong>{eligibleCount ? t('txt_password_security_ready') : t('txt_password_security_no_login')}</strong>
          <span>{eligibleCount ? t('txt_password_security_manual') : t('txt_password_security_no_login_help')}</span>
        </div>
      )}

      {(scanning || report) && (
        <div className="password-security-summary" aria-live="polite">
          <SecurityMetric icon={<ShieldAlert size={18} />} tone="danger" label={t('txt_exposed_passwords')} value={report?.exposedCount ?? 0} active={filter === 'exposed'} disabled={!report} onClick={() => setFilter('exposed')} />
          <SecurityMetric icon={<AlertTriangle size={18} />} tone="warning" label={t('txt_reused_passwords')} value={report?.reusedCount ?? 0} active={filter === 'reused'} disabled={!report} onClick={() => setFilter('reused')} />
          <SecurityMetric icon={<AlertTriangle size={18} />} tone="warning" label={t('txt_weak_passwords')} value={report?.weakCount ?? 0} active={filter === 'weak'} disabled={!report} onClick={() => setFilter('weak')} />
          <SecurityMetric icon={<CheckCircle2 size={18} />} tone="primary" label={t('txt_passwords_checked')} value={`${scanning ? progress.checked : report?.checkedCount || 0} / ${scanning ? progress.total : report?.eligibleCount || 0}`} active={filter === 'all'} disabled={!report} onClick={() => setFilter('all')} />
        </div>
      )}

      {report && aiEvaluation && (
        <div className="card mb-3 p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
              <strong className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                AI 邊緣安全風險評級
              </strong>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                aiEvaluation.riskGrade === 'CRITICAL'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : aiEvaluation.riskGrade === 'B'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                等級 {aiEvaluation.riskGrade}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {aiEvaluation.provider} ({aiEvaluation.latencyMs}ms)
            </span>
          </div>
          <p className="text-[13px] text-slate-700 dark:text-slate-300 m-0 leading-relaxed">
            {aiEvaluation.recommendation}
          </p>
        </div>
      )}

      {scanError && <div className="password-security-notice warning card" role="alert"><Unplug size={16} />{t('txt_password_security_check_failed')}</div>}

      {report && (
        <section className="password-security-results card">
          {report.unavailableCount > 0 && (
            <div className="password-security-notice warning"><Unplug size={16} />{t('txt_password_security_unavailable', { count: report.unavailableCount })}</div>
          )}

          {/* AI Priority Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-500 mr-1">AI 處置分級:</span>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
              }`}
              onClick={() => setFilter('all')}
            >
              全部 ({report.items.length})
            </button>
            {p0Count > 0 && (
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  filter === 'p0'
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:text-red-300'
                }`}
                onClick={() => setFilter('p0')}
              >
                🚨 P0 緊急 ({p0Count})
              </button>
            )}
            {p1Count > 0 && (
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filter === 'p1'
                    ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 dark:text-amber-300'
                }`}
                onClick={() => setFilter('p1')}
              >
                ⚠️ P1 高危 ({p1Count})
              </button>
            )}
            {p2Count > 0 && (
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  filter === 'p2'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 dark:text-blue-300'
                }`}
                onClick={() => setFilter('p2')}
              >
                🛡️ P2 建議 ({p2Count})
              </button>
            )}
            {triageLoading && (
              <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                <RefreshCw size={12} className="spin" /> Clef 分析中...
              </span>
            )}
          </div>

          {!report.items.length ? (
            <div className="password-security-empty compact"><CheckCircle2 size={25} /><strong>{t('txt_no_password_risks')}</strong></div>
          ) : !filteredItems.length ? (
            <div className="password-security-empty compact"><CheckCircle2 size={25} /><strong>{t('txt_no_password_risks_in_filter')}</strong></div>
          ) : (
            <div className="password-security-list">
              {filteredItems.map((item) => {
                const cipher = ciphersById.get(item.cipherId);
                const name = String(cipher?.decName || cipher?.name || '');
                const password = String(cipher?.login?.decPassword || '');
                const passwordVisible = revealedPasswordIds.has(item.cipherId);
                const triage = triageMap?.[item.cipherId];

                return (
                  <article className="password-security-item" key={item.cipherId}>
                    <div className="password-security-item-main">
                      <div className="password-security-item-header">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <strong>{name || t('txt_no_name')}</strong>
                          {triage?.priority === 'P0' && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                              🚨 P0 緊急
                            </span>
                          )}
                          {triage?.priority === 'P1' && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                              ⚠️ P1 高危
                            </span>
                          )}
                          {triage?.priority === 'P2' && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                              🛡️ P2 建議
                            </span>
                          )}
                        </div>
                        <div className="password-security-badges">
                          {item.exposedCount === null && <span className="risk-badge muted">{t('txt_password_security_not_checked')}</span>}
                          {(item.exposedCount || 0) > 0 && <span className="risk-badge danger">{t('txt_password_security_exposed_short', { count: item.exposedCount || 0 })}</span>}
                          {item.weak && <span className="risk-badge weak">{t('txt_password_security_weak_short')}</span>}
                          {item.reusedCount > 1 && <span className="risk-badge reused">{t('txt_password_security_reused_short')}</span>}
                        </div>
                      </div>
                      {triage && (
                        <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-snug">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{triage.reason}</span> • <span className="text-slate-500 dark:text-slate-400">{triage.recommendation}</span>
                        </div>
                      )}
                      <span className="password-security-password">{passwordVisible ? password : maskSecret(password)}</span>
                    </div>
                    <div className="password-security-item-actions">
                      <button type="button" className="btn btn-secondary small" onClick={() => togglePasswordVisibility(item.cipherId)}>
                        {passwordVisible ? <EyeOff size={14} className="btn-icon" /> : <Eye size={14} className="btn-icon" />}
                        {passwordVisible ? t('txt_hide') : t('txt_reveal')}
                      </button>
                      <Link href={`/vault?cipher=${encodeURIComponent(item.cipherId)}`} className="btn btn-secondary small password-security-open">
                        <ExternalLink size={14} className="btn-icon" />{t('txt_password_security_jump')}
                      </Link>
                      {props.onDelete && cipher && (
                        <button
                          type="button"
                          className="btn btn-secondary small text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          onClick={() => setPendingDeleteCipher(cipher)}
                          title={t('txt_delete')}
                        >
                          <Trash2 size={14} className="btn-icon" />
                          {t('txt_delete')}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={!!pendingDeleteCipher}
        title={t('txt_delete_item')}
        message={t('txt_are_you_sure_you_want_to_delete_this_item')}
        danger
        confirmDisabled={deleteBusy}
        cancelDisabled={deleteBusy}
        onConfirm={async () => {
          if (!pendingDeleteCipher || !props.onDelete) return;
          setDeleteBusy(true);
          try {
            await props.onDelete(pendingDeleteCipher);
            removeCipherFromSecurityAssessment(pendingDeleteCipher.id);
            props.onNotify?.('success', t('txt_item_deleted'));
            setPendingDeleteCipher(null);
          } catch (err) {
            props.onNotify?.('error', String(err));
          } finally {
            setDeleteBusy(false);
          }
        }}
        onCancel={() => setPendingDeleteCipher(null)}
      />
    </section>
  );
}

function SecurityMetric(props: { icon: preact.ComponentChildren; tone: 'danger' | 'warning' | 'primary'; label: string; value: string | number; active: boolean; disabled: boolean; onClick: () => void }) {
  return <button type="button" className={`password-security-metric ${props.tone}`} aria-pressed={props.active} disabled={props.disabled} onClick={props.onClick}><span>{props.icon}</span><div><strong>{props.value}</strong><small>{props.label}</small></div></button>;
}
