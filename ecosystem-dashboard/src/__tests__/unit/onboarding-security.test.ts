/**
 * Regression tests for the onboarding/auth security hardening pass.
 *
 * Covers:
 *   1. resolveGrantableTier / isPrivilegedTier / isValidTier (pure unit)
 *   2. deepRedactSecrets (pure unit)
 *   3. IDOR — handleGetStatus scoped by user (mocked DB)
 *   4. Tenant-spoofing guard — handleProvision rejects non-member tenantId
 *   5. Tier escalation — handleProvision rejects admin tier from non-admin
 *   6. Tier escalation — signup rejects admin tier
 *   7. Refresh revocation — rejects inactive client
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock pg before any imports that use it
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      end: jest.fn(),
    })),
    __mockQuery: mockQuery, // exported for test access
  };
});

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => null),
}));

jest.mock('@/pages/api/auth/[...nextauth]', () => ({
  authOptions: {},
}));

jest.mock('@/lib/platform/unified-token', () => ({
  verifyToken: jest.fn(),
  verifyTokenWithRevocation: jest.fn(),
  decodeToken: jest.fn(),
  issueAccessToken: jest.fn(() => 'mock-access-token'),
  issueRefreshToken: jest.fn(() => 'mock-refresh-token'),
  TokenRevokedError: class TokenRevokedError extends Error {
    jti: string;
    constructor(jti: string) {
      super('Token has been revoked');
      this.name = 'TokenRevokedError';
      this.jti = jti;
    }
  },
  DEFAULT_ISSUER_CONFIG: { accessTokenTTL: 3600, refreshTokenTTL: 2592000 },
  UnifiedTokenPayload: {},
}));

jest.mock('@/lib/platform/onboarding-service', () => {
  const actual = jest.requireActual('@/lib/platform/onboarding-service');
  return {
    ...actual,
    getOnboardingService: jest.fn(() => ({
      provision: jest.fn(),
      getJobStatus: jest.fn(),
      getServiceCatalog: jest.fn(),
    })),
  };
});

jest.mock('@/lib/platform/approval-client', () => ({
  needsProvisioningApproval: jest.fn(() => false),
  requestProvisioningApproval: jest.fn(),
  checkApproval: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('mock-hash'),
  compare: jest.fn().mockResolvedValue(true),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { resolveGrantableTier, isPrivilegedTier, isValidTier } from '@/lib/subscription-tiers';
import { deepRedactSecrets } from '@/lib/platform/onboarding-service';
import { verifyToken, verifyTokenWithRevocation } from '@/lib/platform/unified-token';

// Re-import the mock modules to access __mockQuery
const pgModule = require('pg');
const mockQuery = pgModule.__mockQuery as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockState = {
  statusCode: number;
  body: any;
  headers: Record<string, string | string[]>;
};

function createMockReqRes(input: {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
}): { req: NextApiRequest; res: NextApiResponse; state: MockState } {
  const req = {
    method: input.method || 'GET',
    body: input.body || {},
    headers: input.headers || {},
    query: input.query || {},
  } as unknown as NextApiRequest;

  const state: MockState = {
    statusCode: 200,
    body: null,
    headers: {},
  };

  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn().mockImplementation((statusCode: number) => {
    state.statusCode = statusCode;
    return res as NextApiResponse;
  });
  res.json = jest.fn().mockImplementation((body: any) => {
    state.body = body;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn().mockImplementation((name: string, value: string | string[]) => {
    state.headers[name] = value;
    return res as NextApiResponse;
  });
  res.end = jest.fn().mockImplementation(() => res as NextApiResponse);

  return { req, res: res as NextApiResponse, state };
}

// ---------------------------------------------------------------------------
// 1. Tier Authority Helpers (pure unit)
// ---------------------------------------------------------------------------

describe('resolveGrantableTier', () => {
  it('defaults to free when no tier requested', () => {
    const result = resolveGrantableTier(undefined, false);
    expect(result.tier).toBe('free');
    expect(result.allowed).toBe(true);
  });

  it('allows standard tiers for non-admin callers', () => {
    for (const tier of ['free', 'basic', 'pro', 'family', 'enterprise']) {
      const result = resolveGrantableTier(tier, false);
      expect(result.tier).toBe(tier);
      expect(result.allowed).toBe(true);
    }
  });

  it('rejects admin tier for non-admin callers', () => {
    const result = resolveGrantableTier('admin', false);
    expect(result.tier).toBe('free');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('platform-admin');
  });

  it('allows admin tier for platform-admin callers', () => {
    const result = resolveGrantableTier('admin', true);
    expect(result.tier).toBe('admin');
    expect(result.allowed).toBe(true);
  });

  it('defaults unknown tiers to free (allowed)', () => {
    const result = resolveGrantableTier('superuser', false);
    expect(result.tier).toBe('free');
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Unknown tier');
  });
});

describe('isPrivilegedTier', () => {
  it('returns true for admin', () => {
    expect(isPrivilegedTier('admin')).toBe(true);
  });

  it('returns false for non-admin tiers', () => {
    for (const tier of ['free', 'basic', 'pro', 'family', 'enterprise']) {
      expect(isPrivilegedTier(tier)).toBe(false);
    }
  });
});

describe('isValidTier', () => {
  it('returns true for all defined tiers', () => {
    for (const tier of ['free', 'basic', 'pro', 'family', 'enterprise', 'admin']) {
      expect(isValidTier(tier)).toBe(true);
    }
  });

  it('returns false for unknown tiers', () => {
    expect(isValidTier('superuser')).toBe(false);
    expect(isValidTier('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. deepRedactSecrets (pure unit)
// ---------------------------------------------------------------------------

describe('deepRedactSecrets', () => {
  it('redacts password keys', () => {
    const input = { password: 'hunter2', name: 'Alice' };
    const out = deepRedactSecrets(input);
    expect(out.password).toBe('[REDACTED]');
    expect(out.name).toBe('Alice');
  });

  it('redacts api keys in various naming conventions', () => {
    const input = {
      apiKey: 'sk-123',
      api_key: 'sk-456',
      'api-key': 'sk-789',
    };
    const out = deepRedactSecrets(input);
    expect(out.apiKey).toBe('[REDACTED]');
    expect(out.api_key).toBe('[REDACTED]');
    expect(out['api-key']).toBe('[REDACTED]');
  });

  it('redacts nested secrets in objects', () => {
    const input = {
      emailConfig: {
        provider: 'icloud',
        imapAppPassword: 'secret-pass',
      },
      name: 'Bob',
    };
    const out = deepRedactSecrets(input);
    expect(out.emailConfig.imapAppPassword).toBe('[REDACTED]');
    expect(out.emailConfig.provider).toBe('icloud');
    expect(out.name).toBe('Bob');
  });

  it('redacts secrets in arrays of objects', () => {
    const input = {
      cloudProviders: [
        { name: 'aws', apiKey: 'AKIA123' },
        { name: 'gcp', apiKey: 'GCP456' },
      ],
    };
    const out = deepRedactSecrets(input);
    expect(out.cloudProviders[0].apiKey).toBe('[REDACTED]');
    expect(out.cloudProviders[1].apiKey).toBe('[REDACTED]');
    expect(out.cloudProviders[0].name).toBe('aws');
  });

  it('redacts llmConfig.apiKey', () => {
    const input = {
      llmConfig: { provider: 'openai', apiKey: 'sk-abc' },
    };
    const out = deepRedactSecrets(input);
    expect(out.llmConfig.apiKey).toBe('[REDACTED]');
    expect(out.llmConfig.provider).toBe('openai');
  });

  it('does NOT mutate the original object', () => {
    const input = { password: 'hunter2', nested: { apiKey: 'sk-1' } };
    deepRedactSecrets(input);
    expect(input.password).toBe('hunter2');
    expect(input.nested.apiKey).toBe('sk-1');
  });

  it('preserves empty string secrets as empty (does not redact)', () => {
    const input = { password: '', name: 'Alice' };
    const out = deepRedactSecrets(input);
    expect(out.password).toBe('');
  });

  it('handles non-string sensitive values (e.g. numbers, booleans)', () => {
    const input = { tokenCount: 42, isActive: true, secret: true };
    const out = deepRedactSecrets(input);
    // Non-string values are not redacted — only string values at sensitive keys
    expect(out.tokenCount).toBe(42);
    expect(out.isActive).toBe(true);
  });

  it('handles null and undefined input', () => {
    expect(deepRedactSecrets(null)).toBe(null);
    expect(deepRedactSecrets(undefined)).toBe(undefined);
  });

  it('handles primitive (non-object) input', () => {
    expect(deepRedactSecrets('hello')).toBe('hello');
    expect(deepRedactSecrets(42)).toBe(42);
  });

  it('redacts client_secret and credential keys', () => {
    const input = {
      client_secret: 'cs-123',
      credential: 'my-cred',
    };
    const out = deepRedactSecrets(input);
    expect(out.client_secret).toBe('[REDACTED]');
    expect(out.credential).toBe('[REDACTED]');
  });
});

// ---------------------------------------------------------------------------
// 3. IDOR — Job status scoped by user
// ---------------------------------------------------------------------------

describe('IDOR: GET /api/onboarding?action=status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when job belongs to another user', async () => {
    // Import handler dynamically so mocks are in place
    const { default: handler } = await import('@/pages/api/onboarding/index');

    // Mock: no NextAuth session, but a valid JWT (verifyTokenWithRevocation returns payload)
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({
      type: 'access',
      userId: 'user-b-id',
      clientType: 'dashboard',
      platform: 'web',
    });

    // Mock DB: user exists, but job belongs to different user (getJobStatus returns null)
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-b-id', platform_role: 'user' }] }) // user lookup
      .mockResolvedValue({ rows: [] }); // job not found for this user

    const { req, res, state } = createMockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
      query: { action: 'status', jobId: 'job-from-user-a' },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(404);
    expect(state.body.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Tenant-spoofing guard
// ---------------------------------------------------------------------------

describe('Tenant spoof: POST /api/onboarding (provision)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when tenantId is not owned by caller', async () => {
    const { default: handler } = await import('@/pages/api/onboarding/index');

    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({
      type: 'access',
      userId: 'user-a-id',
      clientType: 'dashboard',
      platform: 'web',
    });

    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ platform_role: 'user' }] }) // user role lookup
      .mockResolvedValueOnce({ rows: [] }); // tenant membership check — not a member

    const { req, res, state } = createMockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        formData: { name: 'Alice', email: 'alice@example.com' },
        tenantId: 'tenant-b-uuid',
        targetTier: 'free',
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body.error).toMatch(/not a member/i);
  });
});

// ---------------------------------------------------------------------------
// 5. Tier escalation — provision
// ---------------------------------------------------------------------------

describe('Tier escalation: POST /api/onboarding (provision) with admin tier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when non-admin requests admin tier', async () => {
    const { default: handler } = await import('@/pages/api/onboarding/index');

    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({
      type: 'access',
      userId: 'user-a-id',
      clientType: 'dashboard',
      platform: 'web',
    });

    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce({ rows: [{ platform_role: 'user' }] }); // not platform-admin

    const { req, res, state } = createMockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        formData: { name: 'Alice', email: 'alice@example.com' },
        targetTier: 'admin',
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body.error).toMatch(/insufficient authority/i);
  });
});

// ---------------------------------------------------------------------------
// 6. Tier escalation — signup
// ---------------------------------------------------------------------------

describe('Tier escalation: POST /api/auth/signup with admin tier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when signup requests admin tier', async () => {
    const { default: handler } = await import('@/pages/api/auth/signup');

    // Mock DB: user doesn't exist yet (first query), then we expect the
    // handler to reject before reaching the INSERT.
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // SELECT existing user — none
      .mockResolvedValueOnce({ rows: [{ id: 'new-user-id', email: 'mallory@evil.com', name: 'Mallory' }] }) // INSERT user
      .mockResolvedValueOnce({ rows: [{ id: 'new-tenant-id', slug: 'mallory' }] }) // INSERT tenant
      .mockResolvedValueOnce({ rows: [] }); // INSERT tenant_membership

    const { req, res, state } = createMockReqRes({
      method: 'POST',
      body: {
        name: 'Mallory',
        email: 'mallory@evil.com',
        password: 'password123',
        targetTier: 'admin',
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body.error).toMatch(/insufficient authority/i);
  });
});

// ---------------------------------------------------------------------------
// 7. Refresh revocation — inactive client
// ---------------------------------------------------------------------------

describe('Refresh revocation: POST /api/auth/refresh with inactive client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when client registration is inactive', async () => {
    const { default: handler } = await import('@/pages/api/auth/refresh');

    (verifyToken as jest.Mock).mockReturnValue({
      type: 'refresh',
      userId: 'user-a-id',
      clientId: 'Hyperspace-iOS',
      clientType: 'ios',
      platform: 'ios',
    });

    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'user-a-id', email: 'a@b.com', name: 'A', platform_role: 'user', account_type: 'standard', status: 'active' }],
      }) // user exists and is active
      .mockResolvedValueOnce({ rows: [] }); // client_registrations — no active row

    const { req, res, state } = createMockReqRes({
      method: 'POST',
      body: { refreshToken: 'valid-refresh-token' },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(401);
    expect(state.body.error).toMatch(/client revoked/i);
  });
});
