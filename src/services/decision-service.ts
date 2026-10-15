import type { Env } from '../types';

export type SystemOneQuestionType = 'noul' | 'choice' | 'score';

export interface SystemOneNoulQuestion {
  type: 'noul';
  instructions?: string;
  criteria?: Record<string, string | null> | null;
}

export interface SystemOneChoiceQuestion {
  type: 'choice';
  instructions?: string;
  criteria: Record<string, string | null>;
}

export interface SystemOneScoreQuestion {
  type: 'score';
  instructions?: string;
  criteria: (string | Record<string, unknown>)[];
}

export type SystemOneQuestion = SystemOneNoulQuestion | SystemOneChoiceQuestion | SystemOneScoreQuestion;

export interface SystemOneNoulAnswer {
  type: 'noul';
  noul: number;
}

export interface SystemOneChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface SystemOneScoreAnswer {
  type: 'score';
  score: number;
  legend?: Record<string, unknown>;
  probabilities: Record<string, number>;
  confidence: number;
}

export type SystemOneAnswer = SystemOneNoulAnswer | SystemOneChoiceAnswer | SystemOneScoreAnswer;

export interface SystemOneResponse {
  model: string;
  answers: Record<string, SystemOneAnswer>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  latency_seconds?: number;
}

export type DecisionProvider = 'primary_clef' | 'fallback_q4' | 'typesafe_jev' | 'local_fallback';

export interface DecisionResult {
  success: boolean;
  provider: DecisionProvider;
  endpoint: string;
  model: string;
  latencyMs: number;
  answers: Record<string, SystemOneAnswer>;
  error?: string;
}

export interface LoginRiskAssessment {
  isSuspicious: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  provider: DecisionProvider;
  latencyMs: number;
}

export interface EndpointHealth {
  name: string;
  url: string;
  healthy: boolean;
  latencyMs: number;
  statusText?: string;
  error?: string;
}

export interface DecisionSystemHealth {
  overallHealthy: boolean;
  activeProvider: DecisionProvider;
  endpoints: {
    primary: EndpointHealth;
    fallbackQ4: EndpointHealth;
    typesafeJev: EndpointHealth;
  };
}

export type TriagePriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface VaultTriageItemInput {
  id: string;
  name: string;
  uri?: string;
  username?: string;
  exposedCount: number;
  reusedCount: number;
  weak: boolean;
}

export interface VaultTriageItemResult {
  id: string;
  priority: TriagePriority;
  badgeText: string;
  reason: string;
  recommendation: string;
  isPublicAsset: boolean;
  isPrivilegedAccount: boolean;
}

export interface VaultTriageResponse {
  success: boolean;
  provider: DecisionProvider;
  latencyMs: number;
  overallGrade: 'A+' | 'B' | 'CRITICAL';
  summary: string;
  items: VaultTriageItemResult[];
}

export interface DuplicateClusterInput {
  clusterId: string;
  type: 'password' | 'login-site' | 'smart';
  items: Array<{
    id: string;
    name: string;
    uri?: string;
    username?: string;
    revisionDate?: string;
    notes?: string;
  }>;
}

export interface DuplicateClusterResult {
  clusterId: string;
  clusterType: 'cross_boundary' | 'multi_identity' | 'stale_redundant';
  canonicalId: string;
  redundantIds: string[];
  insight: string;
  actionRecommendation: string;
}

export interface DuplicateClustersResponse {
  success: boolean;
  provider: DecisionProvider;
  latencyMs: number;
  clusters: DuplicateClusterResult[];
}

export function isInternalNetwork(uri?: string, name?: string): boolean {
  const target = `${uri || ''} ${name || ''}`.toLowerCase();
  if (/192\.168\./.test(target)) return true;
  if (/10\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(target)) return true;
  if (/172\.(1[6-9]|2\d|3[01])\./.test(target)) return true;
  if (/127\.0\.0\.1|localhost/.test(target)) return true;
  if (/區網|內網|lan|router|switch|nas|dlink|tplink|asuswrt|synology/.test(target)) return true;
  return false;
}

export function isPrivilegedAccount(username?: string): boolean {
  const u = (username || '').trim().toLowerCase();
  if (!u) return false;
  return /^(root|admin|administrator|sysadmin|master|manager|hinet)$/.test(u) || u.includes('admin');
}

const DEFAULT_PRIMARY_URL = 'https://clef.create360.ai/v1/systemone';
const DEFAULT_FALLBACK_Q4_URL = 'https://clef.aiurl.tw/v1/systemone';
const DEFAULT_TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_TYPESAFE_KEY = '***REMOVED***';

const REQUEST_TIMEOUT_MS = 2000;

export class DecisionService {
  private readonly primaryUrl: string;
  private readonly fallbackQ4Url: string;
  private readonly typesafeUrl: string;
  private readonly typesafeKey: string;

  constructor(private readonly env?: Partial<Env>) {
    this.primaryUrl = this.env?.CLEF_PRIMARY_URL?.trim() || DEFAULT_PRIMARY_URL;
    this.fallbackQ4Url = this.env?.CLEF_FALLBACK_URL?.trim() || DEFAULT_FALLBACK_Q4_URL;
    this.typesafeUrl = this.env?.TYPESAFE_API_URL?.trim() || DEFAULT_TYPESAFE_URL;
    this.typesafeKey = this.env?.TYPESAFE_API_KEY?.trim() || DEFAULT_TYPESAFE_KEY;
  }

  /**
   * Executes a System One decision query with 3-tier sequential failover:
   * 1. Primary Clef-Flash (self-hosted, sub-200ms)
   * 2. Fallback 2 Clef-Flash-Q4 (standby node)
   * 3. Fallback 3 TypeSafe Jev (official cloud service)
   * 4. Local Fallback (fail-open / safe degradation if all remote models fail)
   */
  async evaluate(
    state: Record<string, unknown> | null,
    questions: Record<string, SystemOneQuestion>,
    options?: { timeoutMs?: number }
  ): Promise<DecisionResult> {
    const timeout = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;

    // Tier 1: Primary Clef-Flash
    try {
      const res = await this.queryEndpoint(
        this.primaryUrl,
        'clef-flash',
        state,
        questions,
        undefined,
        timeout
      );
      return {
        success: true,
        provider: 'primary_clef',
        endpoint: this.primaryUrl,
        model: res.model,
        latencyMs: res.latencyMs,
        answers: res.data.answers,
      };
    } catch (err1) {
      console.warn('DecisionService: Primary Clef-Flash failed, falling over to Fallback Q4:', err1);
    }

    // Tier 2: Fallback 2 Clef-Flash-Q4
    try {
      const res = await this.queryEndpoint(
        this.fallbackQ4Url,
        'clef-flash',
        state,
        questions,
        undefined,
        timeout
      );
      return {
        success: true,
        provider: 'fallback_q4',
        endpoint: this.fallbackQ4Url,
        model: res.model,
        latencyMs: res.latencyMs,
        answers: res.data.answers,
      };
    } catch (err2) {
      console.warn('DecisionService: Fallback Q4 failed, falling over to TypeSafe Jev:', err2);
    }

    // Tier 3: Fallback 3 TypeSafe Jev (requires Bearer API key, model 'jev-latest')
    if (this.typesafeKey) {
      try {
        const res = await this.queryEndpoint(
          this.typesafeUrl,
          'jev-latest',
          state,
          questions,
          this.typesafeKey,
          timeout
        );
        return {
          success: true,
          provider: 'typesafe_jev',
          endpoint: this.typesafeUrl,
          model: res.model,
          latencyMs: res.latencyMs,
          answers: res.data.answers,
        };
      } catch (err3) {
        console.warn('DecisionService: TypeSafe Jev failed:', err3);
      }
    }

    // Tier 4: Local Graceful Degradation (Fail-open)
    // Guarantee that if all remote decision models fail, password manager operations continue normally!
    console.warn('DecisionService: All decision model backends unavailable. Operating in graceful fail-open mode.');
    const syntheticAnswers: Record<string, SystemOneAnswer> = {};
    for (const [key, q] of Object.entries(questions)) {
      if (q.type === 'noul') {
        syntheticAnswers[key] = { type: 'noul', noul: 0.0 };
      } else if (q.type === 'choice') {
        const firstOption = Object.keys(q.criteria)[0] || 'unknown';
        syntheticAnswers[key] = {
          type: 'choice',
          choice: firstOption,
          probabilities: { [firstOption]: 1.0 },
          confidence: 0.5,
        };
      } else if (q.type === 'score') {
        syntheticAnswers[key] = {
          type: 'score',
          score: 0.0,
          probabilities: { '0': 1.0 },
          confidence: 0.5,
        };
      }
    }

    return {
      success: false,
      provider: 'local_fallback',
      endpoint: 'local',
      model: 'fail-open-heuristic',
      latencyMs: 0,
      answers: syntheticAnswers,
      error: 'All decision model endpoints timed out or failed; fail-open applied.',
    };
  }

  /**
   * Evaluates login risk for adaptive 2FA and brute-force mitigation.
   */
  async evaluateLoginRisk(context: {
    ip?: string | null;
    country?: string | null;
    userAgent?: string | null;
    email: string;
    failedAttempts: number;
    has2FA?: boolean;
    isRemembered2fa?: boolean;
  }): Promise<LoginRiskAssessment> {
    try {
      const state = {
        client_ip: context.ip || 'unknown',
        country: context.country || 'unknown',
        user_agent: context.userAgent || 'unknown',
        failed_attempts_count: context.failedAttempts,
        email_domain: context.email.split('@')[1] || '',
        is_remembered_2fa: Boolean(context.isRemembered2fa),
      };

      const questions: Record<string, SystemOneQuestion> = {
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

      const result = await this.evaluate(state, questions);
      const isSuspiciousAnswer = result.answers.is_suspicious as SystemOneNoulAnswer | undefined;
      const riskLevelAnswer = result.answers.risk_level as SystemOneChoiceAnswer | undefined;

      const riskScore = isSuspiciousAnswer?.noul ?? 0.0;
      const riskLevel = (riskLevelAnswer?.choice as 'low' | 'medium' | 'high') || (riskScore > 0.65 ? 'high' : riskScore > 0.35 ? 'medium' : 'low');
      const isSuspicious = riskScore >= 0.70 || riskLevel === 'high';

      return {
        isSuspicious,
        riskScore,
        riskLevel,
        provider: result.provider,
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      console.warn('DecisionService.evaluateLoginRisk caught error, defaulting to safe allow:', error);
      return {
        isSuspicious: false,
        riskScore: 0.0,
        riskLevel: 'low',
        provider: 'local_fallback',
        latencyMs: 0,
      };
    }
  }

  /**
   * Health check across all three decision endpoints.
   */
  async checkHealth(): Promise<DecisionSystemHealth> {
    const testState = { ping: true, timestamp: Date.now() };
    const testQuestions: Record<string, SystemOneQuestion> = {
      alive: {
        type: 'noul',
        instructions: 'Is this service alive and processing decisions?',
      },
    };

    const [primary, fallbackQ4, typesafeJev] = await Promise.all([
      this.probeEndpoint('Clef-Flash (Primary)', this.primaryUrl, 'clef-flash', testState, testQuestions, undefined),
      this.probeEndpoint('Clef-Flash-Q4 (Fallback 2)', this.fallbackQ4Url, 'clef-flash', testState, testQuestions, undefined),
      this.probeEndpoint('TypeSafe Jev (Fallback 3)', this.typesafeUrl, 'jev-latest', testState, testQuestions, this.typesafeKey),
    ]);

    let activeProvider: DecisionProvider = 'local_fallback';
    if (primary.healthy) activeProvider = 'primary_clef';
    else if (fallbackQ4.healthy) activeProvider = 'fallback_q4';
    else if (typesafeJev.healthy) activeProvider = 'typesafe_jev';

    return {
      overallHealthy: primary.healthy || fallbackQ4.healthy || typesafeJev.healthy,
      activeProvider,
      endpoints: {
        primary,
        fallbackQ4,
        typesafeJev,
      },
    };
  }

  private async probeEndpoint(
    name: string,
    url: string,
    model: string,
    state: Record<string, unknown>,
    questions: Record<string, SystemOneQuestion>,
    apiKey?: string
  ): Promise<EndpointHealth> {
    const start = Date.now();
    try {
      const res = await this.queryEndpoint(url, model, state, questions, apiKey, 3000);
      const latencyMs = Date.now() - start;
      return {
        name,
        url,
        healthy: Boolean(res.data.answers.alive),
        latencyMs,
        statusText: `Online (${latencyMs}ms)`,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      return {
        name,
        url,
        healthy: false,
        latencyMs,
        statusText: 'Unavailable',
        error: message,
      };
    }
  }

  private async queryEndpoint(
    url: string,
    model: string,
    state: Record<string, unknown> | null,
    questions: Record<string, SystemOneQuestion>,
    apiKey?: string,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<{ data: SystemOneResponse; latencyMs: number; model: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const payload = {
      model,
      state: state || {},
      questions,
    };

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('Decision request timed out'), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 150)}`);
      }

      const data = (await res.json()) as SystemOneResponse;
      const latencyMs = Date.now() - startTime;
      return { data, latencyMs, model: data.model || model };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Evaluates individual vault security items, classifying remediation priority (P0/P1/P2/P3).
   * Runs non-autoregressive decision model in parallel for top compromised items, with deterministic fallback.
   */
  async evaluateVaultTriage(items: VaultTriageItemInput[]): Promise<VaultTriageResponse> {
    const startTime = Date.now();
    if (!items || items.length === 0) {
      return {
        success: true,
        provider: 'local_fallback',
        latencyMs: 0,
        overallGrade: 'A+',
        summary: '密碼庫安全狀態優良，未發現已知洩漏或弱密碼。',
        items: [],
      };
    }

    // Identify candidate items needing triage (exposed, reused, or weak)
    const compromised = items.filter((i) => i.exposedCount > 0 || i.reusedCount > 1 || i.weak);
    const targetItems = compromised.slice(0, 20); // Top 20 items to query Clef in one shot

    let remoteProvider: DecisionProvider = 'local_fallback';
    let remoteAnswers: Record<string, SystemOneAnswer> = {};

    if (targetItems.length > 0) {
      try {
        const questions: Record<string, SystemOneQuestion> = {};
        for (const item of targetItems) {
          questions[`item_${item.id}`] = {
            type: 'choice',
            instructions: `Remediation priority for vault credential "${item.name}" (uri: ${item.uri || 'none'}, user: ${item.username || 'none'}, leaked_count: ${item.exposedCount}, reused_count: ${item.reusedCount}, weak_complexity: ${item.weak}):`,
            criteria: {
              P0: 'Urgent: Public-facing asset with exposed/leaked password',
              P1: 'High: Privileged root/admin account or widespread reuse',
              P2: 'Moderate: Internal LAN or weak complexity password',
              P3: 'Low: Normal low-risk asset',
            },
          };
        }
        const state = {
          total_compromised: compromised.length,
          evaluated_count: targetItems.length,
        };
        const evalRes = await this.evaluate(state, questions);
        remoteProvider = evalRes.provider;
        remoteAnswers = evalRes.answers;
      } catch (err) {
        console.warn('DecisionService.evaluateVaultTriage remote failed, using heuristic:', err);
      }
    }

    const itemResults: VaultTriageItemResult[] = items.map((item) => {
      const isInternal = isInternalNetwork(item.uri, item.name);
      const isPriv = isPrivilegedAccount(item.username);
      const answer = remoteAnswers[`item_${item.id}`] as SystemOneChoiceAnswer | undefined;
      let priority: TriagePriority = (answer?.choice as TriagePriority) || 'P3';

      // If remote model was not queried or returned P3 for obviously compromised items, apply heuristic
      if (!answer) {
        if (item.exposedCount > 0 && !isInternal) priority = 'P0';
        else if (item.exposedCount > 0 && isInternal) priority = 'P1';
        else if (isPriv && (item.reusedCount > 1 || item.weak)) priority = 'P1';
        else if (item.reusedCount > 1) priority = isInternal ? 'P2' : 'P1';
        else if (item.weak) priority = 'P2';
        else priority = 'P3';
      }

      let badgeText = 'P3 良好';
      let reason = '未發現明顯安全風險';
      let recommendation = '維持現有安全策略即可';

      if (priority === 'P0') {
        badgeText = 'P0 緊急';
        reason = '關鍵公網資產密碼已外洩，面臨撞庫攻擊急迫風險';
        recommendation = '請立即更換為獨立高強度密碼並啟用 2FA';
      } else if (priority === 'P1') {
        badgeText = 'P1 高危';
        reason = isPriv ? '特權管理帳號 (admin/root) 存在複用或弱密碼' : `跨 ${item.reusedCount} 個項目複用密碼`;
        recommendation = '管理員帳號應具備最高強度專屬獨立密碼';
      } else if (priority === 'P2') {
        badgeText = 'P2 建議';
        reason = item.weak ? '密碼複雜度不足' : '內部設備密碼複用';
        recommendation = '建議使用內建產生器升級至 16 位以上隨機密碼';
      }

      return {
        id: item.id,
        priority,
        badgeText,
        reason,
        recommendation,
        isPublicAsset: !isInternal,
        isPrivilegedAccount: isPriv,
      };
    });

    // Sort items: P0 first, then P1, then P2, then P3
    const priorityWeight: Record<TriagePriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    itemResults.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);

    const p0Count = itemResults.filter((i) => i.priority === 'P0').length;
    const p1Count = itemResults.filter((i) => i.priority === 'P1').length;
    const overallGrade = p0Count > 0 ? 'CRITICAL' : p1Count > 0 ? 'B' : 'A+';

    const summary = p0Count > 0
      ? `偵測到 ${p0Count} 筆公網帳號密碼外洩，面臨撞庫攻擊急迫風險，建議立即優先更換！`
      : p1Count > 0
      ? `發現 ${p1Count} 筆特權帳號或廣泛複用密碼，建議為不同主機設定專屬獨立密碼。`
      : '密碼庫整體安全健康度優良，未發現已知洩漏風險。';

    return {
      success: true,
      provider: remoteProvider,
      latencyMs: Date.now() - startTime,
      overallGrade,
      summary,
      items: itemResults,
    };
  }

  /**
   * Evaluates duplicate & similar credential clusters, determining canonical items and redundant cleanup candidates.
   */
  async evaluateDuplicateClusters(clusters: DuplicateClusterInput[]): Promise<DuplicateClustersResponse> {
    const startTime = Date.now();
    if (!clusters || clusters.length === 0) {
      return {
        success: true,
        provider: 'local_fallback',
        latencyMs: 0,
        clusters: [],
      };
    }

    const clusterResults: DuplicateClusterResult[] = [];

    for (const cluster of clusters) {
      if (!cluster.items || cluster.items.length === 0) continue;

      // Sort items by revisionDate descending (newest first)
      const sorted = [...cluster.items].sort((a, b) => {
        const timeA = a.revisionDate ? new Date(a.revisionDate).getTime() : 0;
        const timeB = b.revisionDate ? new Date(b.revisionDate).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        // If same date, prefer item with username and URI
        const scoreA = (a.username ? 1 : 0) + (a.uri ? 1 : 0);
        const scoreB = (b.username ? 1 : 0) + (b.uri ? 1 : 0);
        return scoreB - scoreA;
      });

      const canonicalId = sorted[0].id;
      const redundantIds = sorted.slice(1).map((i) => i.id);

      // Check if cluster spans internal and public networks
      const hasInternal = cluster.items.some((i) => isInternalNetwork(i.uri, i.name));
      const hasPublic = cluster.items.some((i) => !isInternalNetwork(i.uri, i.name));
      const hasMultipleUsernames = new Set(cluster.items.map((i) => i.username || '').filter(Boolean)).size > 1;

      let clusterType: DuplicateClusterResult['clusterType'] = 'stale_redundant';
      let insight = '💡 歷史冗餘：發現多筆內容相近之登入記錄';
      let actionRecommendation = '建議保留最新編輯之有效版本，清理其餘歷史舊檔';

      if (hasInternal && hasPublic && (cluster.type === 'password' || cluster.type === 'smart')) {
        clusterType = 'cross_boundary';
        insight = '🚨 高危跨網混用：相同密碼同時用於公網服務與內部設備';
        actionRecommendation = '強烈建議將內外網密碼分離，避免公網遭撞庫時連鎖入侵內網';
      } else if (hasMultipleUsernames) {
        clusterType = 'multi_identity';
        insight = '🔄 同主身分多帳號：同一設備/網域包含多個管理或測試身分';
        actionRecommendation = '建議確認各身分權限，保留最新活躍項目並整合冗餘帳號';
      }

      clusterResults.push({
        clusterId: cluster.clusterId,
        clusterType,
        canonicalId,
        redundantIds,
        insight,
        actionRecommendation,
      });
    }

    return {
      success: true,
      provider: 'local_fallback',
      latencyMs: Date.now() - startTime,
      clusters: clusterResults,
    };
  }
}
