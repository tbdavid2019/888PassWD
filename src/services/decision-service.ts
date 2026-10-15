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

const DEFAULT_PRIMARY_URL = 'https://clef.create360.ai/v1/systemone';
const DEFAULT_FALLBACK_Q4_URL = 'https://clef.aiurl.tw/v1/systemone';
const DEFAULT_TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_TYPESAFE_KEY = 'apikey_259d4143052cecd4163b1c9f0a242ce8261_dbb3e525dc222cbf9ffed9a63213f95ee18822f0bccda8b3baaff5461008ae55';

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
}
