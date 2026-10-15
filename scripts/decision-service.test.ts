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

test('DecisionService: evaluateVaultTriage prioritizes critical public asset breaches', async () => {
  const service = new DecisionService();
  const result = await service.evaluateVaultTriage([
    {
      id: 'c1',
      name: '中華電信hn',
      uri: 'https://tpass.gov.tw',
      username: '0908132111',
      exposedCount: 15,
      reusedCount: 3,
      weak: false,
    },
    {
      id: 'c2',
      name: '內網交換機',
      uri: 'http://192.168.100.1',
      username: 'root',
      exposedCount: 0,
      reusedCount: 3,
      weak: true,
    },
  ]);

  assert.equal(result.success, true);
  assert.ok(result.items.length === 2);
  const p0 = result.items.find((i) => i.id === 'c1');
  assert.ok(p0);
  assert.ok(['P0', 'P1'].includes(p0.priority));
  assert.equal(p0.isPublicAsset, true);
  assert.equal(result.overallGrade, 'CRITICAL');
});

test('DecisionService: evaluateDuplicateClusters detects cross-boundary and redundant items', async () => {
  const service = new DecisionService();
  const result = await service.evaluateDuplicateClusters([
    {
      clusterId: 'cluster-1',
      type: 'password',
      items: [
        { id: 'item-1', name: '雲端主機', uri: 'https://flow.aiurl.tw', revisionDate: '2026-10-15T00:00:00Z' },
        { id: 'item-2', name: '區網網關', uri: 'http://192.168.1.1', revisionDate: '2026-01-01T00:00:00Z' },
      ],
    },
  ]);

  assert.equal(result.success, true);
  assert.equal(result.clusters.length, 1);
  assert.equal(result.clusters[0].canonicalId, 'item-1');
  assert.deepEqual(result.clusters[0].redundantIds, ['item-2']);
  assert.equal(result.clusters[0].clusterType, 'cross_boundary');
});

