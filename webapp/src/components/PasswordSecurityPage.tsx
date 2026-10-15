import { useEffect, useMemo, useState } from 'preact/hooks';
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck, Sparkles, Unplug } from 'lucide-preact';
import { Link } from 'wouter';
import { maskSecret } from '@/components/vault/vault-page-helpers';
import { getPasswordSecurityState, readPasswordSecurityState, startPasswordSecurityScan, subscribePasswordSecurityState } from '@/lib/password-security-cache';
import type { DecisionExecutionResult } from '@/lib/api/admin';
import { t } from '@/lib/i18n';
import type { Cipher } from '@/lib/types';

interface PasswordSecurityPageProps {
  ciphers: Cipher[];
  loading: boolean;
  onEvaluate?: (state: Record<string, unknown> | null, questions: Record<string, unknown>) => Promise<DecisionExecutionResult>;
}

type PasswordSecurityFilter = 'exposed' | 'reused' | 'weak' | 'all';

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
  useEffect(() => {
    setSecurityState(getPasswordSecurityState(fingerprint));
    setFilter('all');
    setRevealedPasswordIds(new Set());
    return subscribePasswordSecurityState(() => {
      const next = readPasswordSecurityState(fingerprint);
      if (next) setSecurityState(next);
    });
  }, [fingerprint]);

  const { report, scannedAt, scanning, progress, scanError } = securityState;

  const [aiEvaluation, setAiEvaluation] = useState<{
    riskGrade: 'A+' | 'B' | 'CRITICAL';
    recommendation: string;
    provider: string;
    latencyMs: number;
  } | null>(null);

  useEffect(() => {
    if (!report || !props.onEvaluate) return;
    let active = true;
    void (async () => {
      try {
        const state = {
          exposed_passwords_count: report.exposedCount,
          reused_passwords_count: report.reusedCount,
          weak_passwords_count: report.weakCount,
          total_checked_count: report.checkedCount,
        };
        const questions = {
          action_priority: {
            type: 'choice',
            instructions: 'What is the top priority action for this password vault user?',
            criteria: {
              rotate_breached: 'Urgent: Change leaked passwords immediately to prevent credential stuffing',
              eliminate_reuse: 'Replace duplicate passwords across accounts',
              strengthen: 'Upgrade short or weak passwords',
              maintain: 'Security hygiene is excellent, maintain existing policies',
            },
          },
        };
        const result = await props.onEvaluate(state, questions);
        if (!active) return;
        const actionChoice = result.answers?.action_priority?.choice;

        const grade = report.exposedCount > 0 ? 'CRITICAL' : report.reusedCount > 0 || report.weakCount > 0 ? 'B' : 'A+';
        const rec =
          actionChoice === 'rotate_breached'
            ? '偵測到外洩密碼！強烈建議優先更換已遭公佈的密碼，防止遭受自動化撞庫攻擊。'
            : actionChoice === 'eliminate_reuse'
            ? '發現重複使用密碼。建議為不同網站設定專屬獨立密碼，避免連鎖受駭。'
            : actionChoice === 'strengthen'
            ? '部分密碼強度不足，建議使用內建產生器升級為高強度隨機密碼。'
            : '密碼庫安全狀態優良，未發現已知洩漏風險。';

        setAiEvaluation({
          riskGrade: grade,
          recommendation: rec,
          provider: result.provider === 'primary_clef' ? 'Clef-Flash (邊緣模型)' : result.provider === 'typesafe_jev' ? 'TypeSafe Jev' : result.provider,
          latencyMs: result.latencyMs,
        });
      } catch {
        // fail silently
      }
    })();
    return () => {
      active = false;
    };
  }, [report, props.onEvaluate]);

  const eligibleCount = useMemo(
    () => props.ciphers.filter((cipher) => Number(cipher.type) === 1 && !cipher.deletedDate && !(cipher as { deletedAt?: string | null }).deletedAt && !!cipher.login?.decPassword).length,
    [props.ciphers],
  );
  const ciphersById = useMemo(() => new Map(props.ciphers.map((cipher) => [cipher.id, cipher])), [props.ciphers]);
  const filteredItems = useMemo(() => {
    if (!report || filter === 'all') return report?.items || [];
    if (filter === 'exposed') return report.items.filter((item) => (item.exposedCount || 0) > 0);
    if (filter === 'reused') return report.items.filter((item) => item.reusedCount > 1);
    return report.items.filter((item) => item.weak);
  }, [filter, report]);
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
          {report && <button type="button" className="btn btn-secondary password-security-toggle-all" onClick={toggleAllPasswordVisibility}>
            {allPasswordsVisible ? <EyeOff size={16} className="btn-icon" /> : <Eye size={16} className="btn-icon" />}
            {allPasswordsVisible ? t('txt_password_security_hide_all') : t('txt_password_security_show_all')}
          </button>}
          <button type="button" className="btn btn-primary password-security-scan" disabled={props.loading || scanning || eligibleCount === 0} onClick={scan}>
            {scanning ? <RefreshCw size={16} className="btn-icon spin" /> : <ScanSearch size={16} className="btn-icon" />}
            {scanning ? t('txt_checking_password_security') : report ? t('txt_recheck_password_security') : t('txt_check_password_security')}
          </button>
        </div>
      </div>

      {!report && !scanning && !props.loading && (
        <div className="password-security-empty card">
          <ShieldCheck size={26} aria-hidden="true" />
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
                return <article className="password-security-item" key={item.cipherId}>
                  <div className="password-security-item-main">
                    <div className="password-security-item-header">
                      <strong>{name || t('txt_no_name')}</strong>
                      <div className="password-security-badges">
                        {item.exposedCount === null && <span className="risk-badge muted">{t('txt_password_security_not_checked')}</span>}
                        {(item.exposedCount || 0) > 0 && <span className="risk-badge danger">{t('txt_password_security_exposed_short', { count: item.exposedCount || 0 })}</span>}
                        {item.weak && <span className="risk-badge weak">{t('txt_password_security_weak_short')}</span>}
                        {item.reusedCount > 1 && <span className="risk-badge reused">{t('txt_password_security_reused_short')}</span>}
                      </div>
                    </div>
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
                  </div>
                </article>;
              })}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function SecurityMetric(props: { icon: preact.ComponentChildren; tone: 'danger' | 'warning' | 'primary'; label: string; value: string | number; active: boolean; disabled: boolean; onClick: () => void }) {
  return <button type="button" className={`password-security-metric ${props.tone}`} aria-pressed={props.active} disabled={props.disabled} onClick={props.onClick}><span>{props.icon}</span><div><strong>{props.value}</strong><small>{props.label}</small></div></button>;
}
