import { generateEcosystemState } from '../../pages/api/ide-memory/ecosystem-state';

describe('generateEcosystemState', () => {
  it('normalizes service map and computes summary/metrics', () => {
    const input = {
      kgStats: { documents: { count: 10 }, entities: { count: 20 }, relationships: { count: 30 } },
      healthStatus: {
        status: 'healthy',
        services: {
          kg: { status: 'healthy', response_time: 100, details: 'ok', endpoint: 'http://kg' },
          postgres: { status: 'degraded', response_time: 200 },
          neo4j: { status: 'unhealthy', response_time: 300 },
        },
      },
      recentActivity: [],
      entities: [],
    };

    const out = generateEcosystemState(input);

    // serviceHealth shape
    expect(Array.isArray(out.serviceHealth.services)).toBe(true);
    expect(out.serviceHealth.summary).toEqual({ total: 3, healthy: 1, degraded: 1, unhealthy: 1, unknown: 0 });

    // performanceMetrics shape
    expect(typeof out.performanceMetrics.responseTimeMetrics.avg_response_time).toBe('number');
    expect(typeof out.performanceMetrics.responseTimeMetrics.p95_response_time).toBe('number');
    expect(typeof out.performanceMetrics.throughputMetrics.requests_per_second).toBe('number');
    expect(typeof out.performanceMetrics.resourceUtilization.cpu_usage).toBe('number');

    // complianceStatus shape
    const pr = out.complianceStatus.portRegistryCompliance;
    expect(pr.total_services).toBe(3);
    expect(Array.isArray(pr.violations)).toBe(true);

    // overallHealth
    expect(out.overallHealth.score).toBeGreaterThan(0);
    expect(out.overallHealth.score).toBeLessThanOrEqual(1);
    expect(typeof out.overallHealth.status).toBe('string');
  });

  it('normalizes service array shape', () => {
    const input = {
      kgStats: {},
      healthStatus: {
        status: 'degraded',
        services: [
          { name: 'kg', status: 'healthy', response_time: 90 },
          { service: 'postgres', status: 'unknown' },
        ],
      },
      recentActivity: [],
      entities: [],
    };

    const out = generateEcosystemState(input);

    expect(out.serviceHealth.summary.total).toBe(2);
    expect(out.serviceHealth.services[0]).toHaveProperty('service');
    expect(out.serviceHealth.services[0]).toHaveProperty('status');
    expect(out.serviceHealth.services[0]).toHaveProperty('responseTime');
  });

  it('provides defaults when services missing', () => {
    const input = {
      kgStats: {},
      healthStatus: {
        status: 'healthy',
      },
      recentActivity: [],
      entities: [],
    };

    const out = generateEcosystemState(input);

    expect(out.serviceHealth.summary.total).toBeGreaterThan(0);
    expect(out.serviceHealth.services.some(s => s.service === 'knowledge_graph')).toBe(true);
  });
});
