import test from 'node:test';
import assert from 'node:assert/strict';
import { DecisionService } from '../src/services/decision-service';

test('DecisionService: uses default endpoints and handles evaluateLoginRisk safely', async () => {
  const service = new DecisionService();
  const result = await service.evaluateLoginRisk({
    email: 'user@example.com',
    ip: '127.0.0.1',
    country: 'TW',
    userAgent: 'NodeWarden/2026',
    failedAttempts: 0,
  });

  assert.ok(typeof result.isSuspicious === 'boolean');
  assert.ok(typeof result.riskScore === 'number');
  assert.ok(['low', 'medium', 'high'].includes(result.riskLevel));
  assert.ok(['primary_clef', 'fallback_q4', 'typesafe_jev', 'local_fallback'].includes(result.provider));
});

test('DecisionService: graceful failover to Tier 4 fail-open when all endpoints are down', async () => {
  const allBrokenService = new DecisionService({
    CLEF_PRIMARY_URL: 'https://invalid-primary.invalid-domain-12345.com/v1/systemone',
    CLEF_FALLBACK_URL: 'https://invalid-q4.invalid-domain-12345.com/v1/systemone',
    TYPESAFE_API_URL: 'https://invalid-typesafe.invalid-domain-12345.com/v1/systemone',
  });

  const result = await allBrokenService.evaluateLoginRisk({
    email: 'user@example.com',
    ip: '127.0.0.1',
    failedAttempts: 0,
  });

  // Must fail open safely!
  assert.equal(result.isSuspicious, false, 'Must fail-open to false so user is not blocked');
  assert.equal(result.provider, 'local_fallback');
  assert.equal(result.riskLevel, 'low');
});

test('DecisionService: checkHealth reports structured node status', async () => {
  const service = new DecisionService();
  const health = await service.checkHealth();

  assert.ok(health.endpoints);
  assert.ok(health.endpoints.primary);
  assert.ok(health.endpoints.fallbackQ4);
  assert.ok(health.endpoints.typesafeJev);
  assert.ok(typeof health.overallHealthy === 'boolean');
});
