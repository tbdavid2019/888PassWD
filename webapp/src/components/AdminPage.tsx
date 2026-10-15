import { useCallback, useEffect, useState } from 'preact/hooks';
import { Activity, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clipboard, Cpu, Plus, RefreshCw, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-preact';
import { copyTextToClipboard } from '@/lib/clipboard';
import LoadingState from '@/components/LoadingState';
import type { AdminInvite, AdminUser } from '@/lib/types';
import type { DecisionSystemHealth } from '@/lib/api/admin';
import { t } from '@/lib/i18n';

interface AdminPageProps {
  currentUserId: string;
  users: AdminUser[];
  invites: AdminInvite[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onCreateInvite: (hours: number) => Promise<void>;
  onDeleteInvalidInvites: () => Promise<void>;
  onDeleteAllInvites: () => Promise<void>;
  onToggleUserStatus: (userId: string, currentStatus: 'active' | 'banned') => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onDeleteInvite: (code: string) => Promise<void>;
  onLoadDecisionStatus?: () => Promise<DecisionSystemHealth>;
}

export default function AdminPage(props: AdminPageProps) {
  const [inviteHours, setInviteHours] = useState(168);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const formatExpiresAt = (x?: string) => (x ? new Date(x).toLocaleString() : t('txt_dash'));
  const totalPages = Math.max(1, Math.ceil(props.invites.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedInvites = props.invites.slice((safePage - 1) * pageSize, safePage * pageSize);

  const roleText = (role: string) => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'admin') return t('txt_role_admin');
    if (normalized === 'user') return t('txt_role_user');
    return role || '-';
  };

  const statusText = (status: string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active') return t('txt_status_active');
    if (normalized === 'banned') return t('txt_status_banned');
    if (normalized === 'inactive') return t('txt_status_inactive');
    return status || '-';
  };

  const normalizeToggleableStatus = (status: string): 'active' | 'banned' | null => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active' || normalized === 'banned') return normalized;
    return null;
  };

  const [decisionHealth, setDecisionHealth] = useState<DecisionSystemHealth | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  const fetchDecisionStatus = useCallback(async () => {
    if (!props.onLoadDecisionStatus) return;
    setDecisionLoading(true);
    try {
      const data = await props.onLoadDecisionStatus();
      setDecisionHealth(data);
    } catch (err) {
      console.warn('Failed to load decision model status:', err);
    } finally {
      setDecisionLoading(false);
    }
  }, [props.onLoadDecisionStatus]);

  useEffect(() => {
    void fetchDecisionStatus();
  }, [fetchDecisionStatus]);

  return (
    <div className="stack">
      {!!props.error && (
        <div className="local-error">
          <span>{props.error}</span>
          <button type="button" className="btn btn-secondary small" onClick={props.onRefresh}>
            <RefreshCw size={14} className="btn-icon" />
            {t('txt_refresh')}
          </button>
        </div>
      )}

      {/* === AI 邊緣決策模型 (Clef / Jev) 4-Tier 容錯鏈面板 === */}
      <section className="card">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-blue-500" />
            <h3 className="m-0 font-bold">AI 邊緣決策模型（Clef / Jev）架構</h3>
            <span className="decision-node-badge fallback">4-Tier 容錯鏈</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary small"
            disabled={decisionLoading}
            onClick={() => void fetchDecisionStatus()}
          >
            <RefreshCw size={14} className={`btn-icon ${decisionLoading ? 'animate-spin' : ''}`} />
            {t('txt_refresh')}
          </button>
        </div>

        <div className="text-[13px] text-slate-600 dark:text-slate-400 mt-1 mb-2">
          採用非自回歸 System One 模型（單次前向傳播，零 Token 生成等待，零幻覺），在登入與 2FA 驗證時進行邊緣即時風險判定與零信任風控防禦。
        </div>

        <div className="decision-nodes-grid">
          {/* Node 1: Primary Clef-Flash */}
          <div className={`decision-node-item ${decisionHealth?.activeProvider === 'primary_clef' ? 'active-tier' : ''}`}>
            <div>
              <div className="decision-node-head">
                <span className="decision-node-title">
                  <Activity size={15} className="text-emerald-500" />
                  Primary: Clef-Flash
                </span>
                <span className={`decision-node-badge ${decisionHealth?.endpoints?.primary?.healthy ? 'online' : 'offline'}`}>
                  {decisionHealth?.endpoints?.primary?.healthy ? (
                    <><CheckCircle2 size={11} /> 在線 ({decisionHealth.endpoints.primary.latencyMs}ms)</>
                  ) : (
                    <><AlertCircle size={11} /> 備援中</>
                  )}
                </span>
              </div>
              <div className="decision-node-url">https://clef.create360.ai/v1/systemone</div>
              <div className="decision-node-desc">
                自建邊緣推論節點（極速 &lt;200ms、免外部 Token 費用），承擔日常 99% 以上即時登入風控決策。
              </div>
            </div>
          </div>

          {/* Node 2: Fallback 2 Clef-Flash-Q4 */}
          <div className={`decision-node-item ${decisionHealth?.activeProvider === 'fallback_q4' ? 'active-tier' : ''}`}>
            <div>
              <div className="decision-node-head">
                <span className="decision-node-title">
                  <ShieldCheck size={15} className="text-blue-500" />
                  Fallback 2: Clef-Flash-Q4
                </span>
                <span className={`decision-node-badge ${decisionHealth?.endpoints?.fallbackQ4?.healthy ? 'online' : 'fallback'}`}>
                  {decisionHealth?.endpoints?.fallbackQ4?.healthy ? (
                    <><CheckCircle2 size={11} /> 在線 ({decisionHealth.endpoints.fallbackQ4.latencyMs}ms)</>
                  ) : (
                    <><AlertCircle size={11} /> 待命/離線</>
                  )}
                </span>
              </div>
              <div className="decision-node-url">https://clef.aiurl.tw/v1/systemone</div>
              <div className="decision-node-desc">
                自建備援推理節點（Q4 量化模型），當主節點連線中斷或維護時自動無縫接手。
              </div>
            </div>
          </div>

          {/* Node 3: Fallback 3 TypeSafe Jev */}
          <div className={`decision-node-item ${decisionHealth?.activeProvider === 'typesafe_jev' ? 'active-tier' : ''}`}>
            <div>
              <div className="decision-node-head">
                <span className="decision-node-title">
                  <ShieldCheck size={15} className="text-indigo-500" />
                  Fallback 3: TypeSafe Jev
                </span>
                <span className={`decision-node-badge ${decisionHealth?.endpoints?.typesafeJev?.healthy ? 'online' : 'offline'}`}>
                  {decisionHealth?.endpoints?.typesafeJev?.healthy ? (
                    <><CheckCircle2 size={11} /> 官方在線 ({decisionHealth.endpoints.typesafeJev.latencyMs}ms)</>
                  ) : (
                    <><AlertCircle size={11} /> 未連線</>
                  )}
                </span>
              </div>
              <div className="decision-node-url">https://api.typesafe.ai/v1/systemone (jev-latest)</div>
              <div className="decision-node-desc">
                TypeSafe 官方 Jev 雲端兜底服務（專屬 API Key 認證），確保自建基礎設施異常時仍具備商業級推理能力。
              </div>
            </div>
          </div>

          {/* Node 4: Fallback 4 Safe Fail-Open */}
          <div className={`decision-node-item ${decisionHealth?.activeProvider === 'local_fallback' ? 'active-tier' : ''}`}>
            <div>
              <div className="decision-node-head">
                <span className="decision-node-title">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Fallback 4: 本地安全降級放行
                </span>
                <span className="decision-node-badge online">
                  <CheckCircle2 size={11} /> 永不中斷
                </span>
              </div>
              <div className="decision-node-url">local://fail-open-safe-heuristic</div>
              <div className="decision-node-desc">
                當前述三層決策節點皆逾時或斷網時，自動切換至安全放行模式，密碼庫所有核心功能保證正常運作。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h3>{t('txt_users')}</h3>
          <button type="button" className="btn btn-secondary small" disabled={props.loading} onClick={props.onRefresh}>
            <RefreshCw size={14} className="btn-icon" /> {t('txt_refresh')}
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{t('txt_email')}</th>
              <th>{t('txt_name')}</th>
              <th>{t('txt_role')}</th>
              <th>{t('txt_status')}</th>
              <th>{t('txt_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {props.users.map((user) => {
              const toggleableStatus = normalizeToggleableStatus(user.status);
              return (
                <tr key={user.id}>
                <td data-label={t('txt_email')}>{user.email}</td>
                <td data-label={t('txt_name')}>{user.name || t('txt_dash')}</td>
                <td data-label={t('txt_role')}>{roleText(user.role)}</td>
                <td data-label={t('txt_status')}>{statusText(user.status)}</td>
                <td data-label={t('txt_actions')}>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={user.id === props.currentUserId || !toggleableStatus}
                      onClick={() => {
                        if (!toggleableStatus) return;
                        void props.onToggleUserStatus(user.id, toggleableStatus);
                      }}
                    >
                      {user.status === 'active' ? <UserX size={14} className="btn-icon" /> : <UserCheck size={14} className="btn-icon" />}
                      {user.status === 'active' ? t('txt_ban') : t('txt_unban')}
                    </button>
                    {user.role !== 'admin' && (
                      <button type="button" className="btn btn-danger" onClick={() => void props.onDeleteUser(user.id)}>
                        <Trash2 size={14} className="btn-icon" />
                        {t('txt_delete')}
                      </button>
                    )}
                  </div>
                </td>
                </tr>
              );
            })}
            {props.loading && !props.users.length && (
              <tr>
                <td colSpan={5}>
                  <LoadingState lines={4} compact />
                </td>
              </tr>
            )}
            {!props.loading && !props.users.length && (
              <tr>
                <td colSpan={5}>
                  <div className="empty empty-comfortable">{t('txt_no_users_found')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card admin-invites-card">
        <div className="section-head admin-invites-head">
          <h3>{t('txt_invites')}</h3>
          <div className="actions admin-invites-head-actions">
            <button type="button" className="btn btn-secondary small" disabled={props.loading} onClick={props.onRefresh}>
              <RefreshCw size={14} className="btn-icon" /> {t('txt_refresh')}
            </button>
            <button type="button" className="btn btn-danger small" onClick={() => void props.onDeleteInvalidInvites()}>
              <Trash2 size={14} className="btn-icon" /> {t('txt_delete_invalid')}
            </button>
            <button type="button" className="btn btn-danger small" onClick={() => void props.onDeleteAllInvites()}>
              <Trash2 size={14} className="btn-icon" /> {t('txt_delete_all')}
            </button>
          </div>
        </div>
        <div className="invite-toolbar">
          <div className="invite-create-group">
            <label className="field invite-hours-field">
              <span>{t('txt_invite_validity_hours')}</span>
              <input
                className="input small"
                type="number"
                value={inviteHours}
                min={1}
                max={720}
                onInput={(e) => setInviteHours(Number((e.currentTarget as HTMLInputElement).value || 168))}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={() => void props.onCreateInvite(inviteHours)}>
              <Plus size={14} className="btn-icon" />
              {t('txt_create_timed_invite')}
            </button>
          </div>
        </div>
        <table className="table invite-table">
          <thead>
            <tr>
              <th>{t('txt_code')}</th>
              <th>{t('txt_status')}</th>
              <th>{t('txt_expires_at')}</th>
              <th className="invite-actions-head">{t('txt_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedInvites.map((invite) => (
              <tr key={invite.code}>
                <td data-label={t('txt_code')}>{invite.code}</td>
                <td data-label={t('txt_status')}>{statusText(invite.status)}</td>
                <td data-label={t('txt_expires_at')}>{formatExpiresAt(invite.expiresAt)}</td>
                <td data-label={t('txt_actions')}>
                  <div className="actions invite-row-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void copyTextToClipboard(invite.inviteLink || '', { successMessage: t('txt_link_copied') })}
                    >
                      <Clipboard size={14} className="btn-icon" /> {t('txt_copy_link')}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => void props.onDeleteInvite(invite.code)}>
                      <Trash2 size={14} className="btn-icon" /> {t('txt_delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {props.loading && !props.invites.length && (
              <tr>
                <td colSpan={4}>
                  <LoadingState lines={4} compact />
                </td>
              </tr>
            )}
            {!props.loading && !props.invites.length && (
              <tr>
                <td colSpan={4}>
                  <div className="empty empty-comfortable">{t('txt_no_invites_found')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="actions admin-pagination invite-pagination">
          <button type="button" className="btn btn-secondary small" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={14} className="btn-icon" />
            {t('txt_prev')}
          </button>
          <span className="muted-inline">{safePage} / {totalPages}</span>
          <button type="button" className="btn btn-secondary small" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            {t('txt_next')}
            <ChevronRight size={14} className="btn-icon" />
          </button>
        </div>
      </section>
    </div>
  );
}
