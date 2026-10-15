import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Globe,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-preact';
import type { DecisionExecutionResult, DecisionSystemHealth } from '@/lib/api/admin';
import { t } from '@/lib/i18n';

interface DecisionCenterPageProps {
  onLoadStatus: () => Promise<DecisionSystemHealth>;
  onEvaluate: (state: Record<string, unknown> | null, questions: Record<string, unknown>) => Promise<DecisionExecutionResult>;
  onNotify?: (msg: string) => void;
}

export default function DecisionCenterPage(props: DecisionCenterPageProps) {
  const [health, setHealth] = useState<DecisionSystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'phishing'>('login');

  // Login Sandbox State
  const [loginIp, setLoginIp] = useState('1.1.1.1');
  const [loginCountry, setLoginCountry] = useState('TW');
  const [loginUserAgent, setLoginUserAgent] = useState('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  const [loginFailedCount, setLoginFailedCount] = useState(0);
  const [evaluatingLogin, setEvaluatingLogin] = useState(false);
  const [loginResult, setLoginResult] = useState<DecisionExecutionResult | null>(null);

  // Phishing Sandbox State
  const [targetDomain, setTargetDomain] = useState('paypa1.com');
  const [legitDomain, setLegitDomain] = useState('paypal.com');
  const [evaluatingPhishing, setEvaluatingPhishing] = useState(false);
  const [phishingResult, setPhishingResult] = useState<DecisionExecutionResult | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const data = await props.onLoadStatus();
      setHealth(data);
    } catch (err) {
      console.warn('Failed to load decision status:', err);
    } finally {
      setLoadingHealth(false);
    }
  }, [props.onLoadStatus]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Run Login Risk Evaluation
  const handleEvaluateLogin = async () => {
    setEvaluatingLogin(true);
    try {
      const state = {
        client_ip: loginIp,
        country: loginCountry,
        user_agent: loginUserAgent,
        failed_attempts_count: loginFailedCount,
        email_domain: 'example.com',
      };
      const questions = {
        is_suspicious: {
          type: 'noul',
          instructions: 'Is this login attempt suspicious, anomalous, or indicative of credential stuffing, account takeover, or automated abuse?',
        },
        risk_level: {
          type: 'choice',
          instructions: 'What is the risk level of this login attempt?',
          criteria: {
            low: 'Normal, legitimate user login attempt with no abnormal signals.',
            medium: 'Slightly anomalous login context, unexpected region or header discrepancy.',
            high: 'High anomaly, brute-force indicators, or automated malicious credential stuffing.',
          },
        },
      };

      const res = await props.onEvaluate(state, questions);
      setLoginResult(res);
    } catch (err: unknown) {
      props.onNotify?.(err instanceof Error ? err.message : '推論失敗');
    } finally {
      setEvaluatingLogin(false);
    }
  };

  // Run Phishing Evaluation
  const handleEvaluatePhishing = async () => {
    setEvaluatingPhishing(true);
    try {
      const state = {
        target_domain: targetDomain,
        known_legitimate_domains: [legitDomain],
      };
      const questions = {
        is_phishing: {
          type: 'noul',
          instructions: `Is '${targetDomain}' a phishing, typosquatting, or punycode impersonation attack of '${legitDomain}'?`,
        },
        action: {
          type: 'choice',
          instructions: 'Recommended action for the password manager autofill engine:',
          criteria: {
            allow: 'Safe to autofill credentials',
            warn_subdomain: 'Prompt user with domain warning before autofill',
            block_phishing: 'Block autofill and trigger critical phishing warning',
          },
        },
      };

      const res = await props.onEvaluate(state, questions);
      setPhishingResult(res);
    } catch (err: unknown) {
      props.onNotify?.(err instanceof Error ? err.message : '偵測失敗');
    } finally {
      setEvaluatingPhishing(false);
    }
  };

  return (
    <div className="stack">
      {/* 頁面標題列 */}
      <section className="card">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Cpu size={22} className="text-blue-500" />
            <div>
              <h2 className="text-lg font-bold m-0 flex items-center gap-2">
                AI 邊緣決策中心
                <span className="decision-node-badge fallback">4-Tier 容錯鏈</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                基於非自回歸 System One 模型（單次前向傳播，零 Token 等待），提供亞 200ms 的自適應風控門禁與仿冒偵測。
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary small"
            disabled={loadingHealth}
            onClick={() => void fetchStatus()}
          >
            <RefreshCw size={14} className={`btn-icon ${loadingHealth ? 'animate-spin' : ''}`} />
            {t('txt_refresh')}
          </button>
        </div>

        {/* 4-Tier 容錯鏈基礎設施看板 */}
        <div className="decision-nodes-grid">
          {/* Node 1: Primary Clef-Flash */}
          <div className={`decision-node-item ${health?.activeProvider === 'primary_clef' ? 'active-tier' : ''}`}>
            <div>
              <div className="decision-node-head">
                <span className="decision-node-title">
                  <Activity size={15} className="text-emerald-500" />
                  Primary: Clef-Flash
                </span>
                <span className={`decision-node-badge ${health?.endpoints?.primary?.healthy ? 'online' : 'offline'}`}>
                  {health?.endpoints?.primary?.healthy ? (
                    <><CheckCircle2 size={11} /> 在線 ({health.endpoints.primary.latencyMs}ms)</>
                  ) : (
                    <><AlertCircle size={11} /> 備援中</>
                  )}
                </span>
              </div>
              <div className="decision-node-url">https://clef.create360.ai/v1/systemone</div>
              <div className="decision-node-desc">
                自建邊緣推論節點（極速 &lt;200ms、免外部 Token 費用），承擔 99% 以上即時登入風控。
              </div>
            </div>
          </div>

          {/* Node 2: Fallback 2 Clef-Flash-Q4 */}
          <div className={`decision-node-item ${health?.activeProvider === 'fallback_q4' ? 'active-tier' : ''}`}>
            <div>
              <div className="decision-node-head">
                <span className="decision-node-title">
                  <ShieldCheck size={15} className="text-blue-500" />
                  Fallback 2: Clef-Flash-Q4
                </span>
                <span className={`decision-node-badge ${health?.endpoints?.fallbackQ4?.healthy ? 'online' : 'fallback'}`}>
                  {health?.endpoints?.fallbackQ4?.healthy ? (
                    <><CheckCircle2 size={11} /> 在線 ({health.endpoints.fallbackQ4.latencyMs}ms)</>
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
          <div className={`decision-node-item ${health?.activeProvider === 'typesafe_jev' ? 'active-tier' : ''}`}>
            <div>
              <div className="decision-node-head">
                <span className="decision-node-title">
                  <ShieldCheck size={15} className="text-indigo-500" />
                  Fallback 3: TypeSafe Jev
                </span>
                <span className={`decision-node-badge ${health?.endpoints?.typesafeJev?.healthy ? 'online' : 'offline'}`}>
                  {health?.endpoints?.typesafeJev?.healthy ? (
                    <><CheckCircle2 size={11} /> 官方在線 ({health.endpoints.typesafeJev.latencyMs}ms)</>
                  ) : (
                    <><AlertCircle size={11} /> 未連線</>
                  )}
                </span>
              </div>
              <div className="decision-node-url">https://api.typesafe.ai/v1/systemone (jev-latest)</div>
              <div className="decision-node-desc">
                TypeSafe 官方 Jev 雲端兜底服務（專屬 API Key 認證），確保商業級高可用性。
              </div>
            </div>
          </div>

          {/* Node 4: Fallback 4 Safe Fail-Open */}
          <div className={`decision-node-item ${health?.activeProvider === 'local_fallback' ? 'active-tier' : ''}`}>
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

      {/* 互動式決策測試沙盒 (Interactive Decision Sandbox) */}
      <section className="card">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="m-0 font-bold">即時決策推論實驗室</h3>
          </div>
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              className={`btn btn-secondary small ${activeTab === 'login' ? '!bg-white dark:!bg-slate-700 !shadow-sm font-semibold' : '!border-transparent'}`}
              onClick={() => setActiveTab('login')}
            >
              登入風控判定
            </button>
            <button
              type="button"
              className={`btn btn-secondary small ${activeTab === 'phishing' ? '!bg-white dark:!bg-slate-700 !shadow-sm font-semibold' : '!border-transparent'}`}
              onClick={() => setActiveTab('phishing')}
            >
              釣魚網址偵測
            </button>
          </div>
        </div>

        {/* Tab 1: 登入風控判定 */}
        {activeTab === 'login' && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs text-slate-500">測試情境範本快速載入：</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary small"
                  onClick={() => {
                    setLoginIp('1.1.1.1');
                    setLoginCountry('TW');
                    setLoginUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
                    setLoginFailedCount(0);
                  }}
                >
                  載入合法登入情境
                </button>
                <button
                  type="button"
                  className="btn btn-secondary small text-red-600 dark:text-red-400"
                  onClick={() => {
                    setLoginIp('194.26.29.112');
                    setLoginCountry('RU');
                    setLoginUserAgent('python-requests/2.28.1 (Automated Bot)');
                    setLoginFailedCount(14);
                  }}
                >
                  載入惡意攻擊情境
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <label className="field">
                <span>客戶端 IP</span>
                <input className="input" value={loginIp} onInput={(e) => setLoginIp(e.currentTarget.value)} />
              </label>
              <label className="field">
                <span>地理位置 / 國家代碼</span>
                <input className="input" value={loginCountry} onInput={(e) => setLoginCountry(e.currentTarget.value)} />
              </label>
              <label className="field md:col-span-2">
                <span>User-Agent (客戶端瀏覽器指紋)</span>
                <input className="input" value={loginUserAgent} onInput={(e) => setLoginUserAgent(e.currentTarget.value)} />
              </label>
              <label className="field">
                <span>短時間失敗次數</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={loginFailedCount}
                  onInput={(e) => setLoginFailedCount(Number(e.currentTarget.value || 0))}
                />
              </label>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={evaluatingLogin}
              onClick={() => void handleEvaluateLogin()}
            >
              <Play size={14} className={`btn-icon ${evaluatingLogin ? 'animate-pulse' : ''}`} />
              {evaluatingLogin ? '推論計算中...' : '執行 Clef / Jev 風控評估'}
            </button>

            {/* 結果展示 */}
            {loginResult && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <Terminal size={15} />
                    推論結果報告
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      {loginResult.provider} ({loginResult.latencyMs}ms)
                    </span>
                    <span className={`decision-node-badge ${loginResult.answers?.is_suspicious?.noul > 0.65 ? 'offline' : 'online'}`}>
                      {loginResult.answers?.is_suspicious?.noul > 0.65 ? '🚨 判定高風險 (攔截/Step-up)' : '✅ 正常信任連線'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    <div className="text-xs text-slate-500">異常機率 (noul)</div>
                    <div className="text-xl font-bold font-mono mt-0.5">
                      {((loginResult.answers?.is_suspicious?.noul ?? 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    <div className="text-xs text-slate-500">風險等級 (choice)</div>
                    <div className="text-xl font-bold capitalize mt-0.5">
                      {loginResult.answers?.risk_level?.choice || 'low'}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    <div className="text-xs text-slate-500">建議動作</div>
                    <div className="text-sm font-semibold mt-1">
                      {loginResult.answers?.is_suspicious?.noul > 0.65 ? '強制 2FA 挑戰 (Step-up)' : '允許正常登入'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 釣魚網址偵測 */}
        {activeTab === 'phishing' && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs text-slate-500">測試情境快速載入：</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary small"
                  onClick={() => {
                    setTargetDomain('paypal.com');
                    setLegitDomain('paypal.com');
                  }}
                >
                  合法官網
                </button>
                <button
                  type="button"
                  className="btn btn-secondary small text-red-600 dark:text-red-400"
                  onClick={() => {
                    setTargetDomain('paypa1.com');
                    setLegitDomain('paypal.com');
                  }}
                >
                  同形字仿冒 (paypa1)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary small text-amber-600 dark:text-amber-400"
                  onClick={() => {
                    setTargetDomain('apple-id.secure-login.xyz');
                    setLegitDomain('apple.com');
                  }}
                >
                  子網域偽裝
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <label className="field">
                <span>目標存取網址 / 域名 (Target Domain)</span>
                <input className="input" value={targetDomain} onInput={(e) => setTargetDomain(e.currentTarget.value)} />
              </label>
              <label className="field">
                <span>庫存正版網址 (Known Domain)</span>
                <input className="input" value={legitDomain} onInput={(e) => setLegitDomain(e.currentTarget.value)} />
              </label>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={evaluatingPhishing}
              onClick={() => void handleEvaluatePhishing()}
            >
              <Globe size={14} className={`btn-icon ${evaluatingPhishing ? 'animate-pulse' : ''}`} />
              {evaluatingPhishing ? '分析比對中...' : '偵測仿冒釣魚威脅'}
            </button>

            {/* 釣魚結果展示 */}
            {phishingResult && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <ShieldAlert size={15} className="text-red-500" />
                    釣魚比對報告
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      {phishingResult.provider} ({phishingResult.latencyMs}ms)
                    </span>
                    <span className={`decision-node-badge ${phishingResult.answers?.is_phishing?.noul > 0.5 ? 'offline' : 'online'}`}>
                      {phishingResult.answers?.is_phishing?.noul > 0.5 ? '⚠️ 疑似釣魚仿冒' : '✅ 正常域名'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    <div className="text-xs text-slate-500">仿冒機率 (noul)</div>
                    <div className="text-xl font-bold font-mono mt-0.5">
                      {((phishingResult.answers?.is_phishing?.noul ?? 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    <div className="text-xs text-slate-500">自動填入建議 (choice)</div>
                    <div className="text-base font-bold capitalize mt-1">
                      {phishingResult.answers?.action?.choice || 'allow'}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    <div className="text-xs text-slate-500">防禦判定</div>
                    <div className="text-sm font-semibold mt-1">
                      {phishingResult.answers?.is_phishing?.noul > 0.5 ? '立即阻斷自動填入' : '安全，可填入密碼'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
