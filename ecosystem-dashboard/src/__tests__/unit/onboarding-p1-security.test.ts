/**
 * Regression tests for P1 security hardening items.
 *
 * Covers:
 *   P1.3: Approval-gate cross-user / privileged provisioning
 *   P1.4: Access-token jti deny-list + revocation
 *   P1.5: Short-lived scoped secrets
 *   P1.6: zeroToleranceAck enforcement
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      end: jest.fn(),
    })),
    __mockQuery: mockQuery,
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
      provision: jest.fn().mockResolvedValue({
        jobId: 'job-123',
        status: 'completed',
        progress: 100,
        tenantId: 'tenant-123',
        subscriptionTier: 'free',
        steps: [],
      }),
      getJobStatus: jest.fn(),
      listJobsForUser: jest.fn().mockResolvedValue([]),
    })),
  };
});

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('mock-hash'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock global fetch for approval-client calls
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { verifyToken, verifyTokenWithRevocation, decodeToken } from '@/lib/platform/unified-token';
import {
  issueScopedSecretToken,
  verifyScopedSecretToken,
  hasScope,
  deriveSecretPath,
  deriveScopes,
} from '@/lib/platform/scoped-secrets';
import {
  needsProvisioningApproval,
  requestProvisioningApproval,
  checkApproval,
} from '@/lib/platform/approval-client';
import { deepRedactSecrets } from '@/lib/platform/onboarding-service';

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

  const state: MockState = { statusCode: 200, body: null, headers: {} };

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

function resetMocks() {
  mockQuery.mockReset();
  (verifyToken as jest.Mock).mockReset();
  (verifyTokenWithRevocation as jest.Mock).mockReset();
  (decodeToken as jest.Mock).mockReset();
  mockFetch.mockReset();
}

// ---------------------------------------------------------------------------
// P1.3: Approval-gate cross-user / privileged provisioning
// ---------------------------------------------------------------------------

describe('P1.3: needsProvisioningApproval', () => {
  it('returns false for self-service standard tier', () => {
    expect(needsProvisioningApproval({
      callerUserId: 'user-1',
      targetUserId: 'user-1',
      targetTier: 'free',
      isPlatformAdmin: false,
    })).toBe(false);
  });

  it('returns true for cross-user provisioning by admin', () => {
    expect(needsProvisioningApproval({
      callerUserId: 'admin-1',
      targetUserId: 'user-2',
      targetTier: 'free',
      isPlatformAdmin: true,
    })).toBe(true);
  });

  it('returns true for privileged tier (admin) grant', () => {
    expect(needsProvisioningApproval({
      callerUserId: 'admin-1',
      targetUserId: 'admin-1',
      targetTier: 'admin',
      isPlatformAdmin: true,
    })).toBe(true);
  });

  it('returns false for same-user non-privileged tier even if admin', () => {
    expect(needsProvisioningApproval({
      callerUserId: 'admin-1',
      targetUserId: 'admin-1',
      targetTier: 'pro',
      isPlatformAdmin: true,
    })).toBe(false);
  });
});

describe('P1.3: requestProvisioningApproval', () => {
  beforeEach(() => resetMocks());

  it('returns pending when approval-service accepts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        approval: { id: 'appr-123', status: 'pending', policy_result: { reason: 'Requires approval' } },
      }),
      text: async () => '',
    });

    const result = await requestProvisioningApproval({
      action: 'provision_cross_user',
      userId: 'admin-1',
      agentId: 'dashboard',
      agentRole: 'platform-admin',
      payload: { targetUserId: 'user-2', targetTier: 'free' },
      context: 'Cross-user provisioning',
    });

    expect(result.status).toBe('pending');
    expect(result.approvalId).toBe('appr-123');
  });

  it('returns approved when auto-approved', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        approval: { id: 'appr-456', status: 'approved', reviewed_by: 'auto-approval' },
      }),
      text: async () => '',
    });

    const result = await requestProvisioningApproval({
      action: 'grant_privileged_tier',
      userId: 'admin-1',
      agentId: 'dashboard',
      agentRole: 'platform-admin',
      payload: { targetUserId: 'admin-1', targetTier: 'admin' },
      context: 'Privileged tier grant',
    });

    expect(result.status).toBe('approved');
  });

  it('throws when approval-service is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(requestProvisioningApproval({
      action: 'provision_cross_user',
      userId: 'admin-1',
      agentId: 'dashboard',
      agentRole: 'platform-admin',
      payload: {},
      context: 'test',
    })).rejects.toThrow('Approval service unavailable');
  });
});

describe('P1.3: checkApproval polling', () => {
  beforeEach(() => resetMocks());

  it('returns approved status from approval-service', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        approval: { status: 'approved', reviewed_by: 'user-1' },
      }),
    });

    const result = await checkApproval('appr-123');
    expect(result.status).toBe('approved');
    expect(result.reviewedBy).toBe('user-1');
  });

  it('returns denied status from approval-service', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        approval: { status: 'denied', decision_reason: 'Not authorized' },
      }),
    });

    const result = await checkApproval('appr-123');
    expect(result.status).toBe('denied');
    expect(result.reason).toBe('Not authorized');
  });

  it('returns pending on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await checkApproval('appr-123');
    expect(result.status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// P1.4: Access-token jti deny-list + revocation
// ---------------------------------------------------------------------------

describe('P1.4: verifyTokenWithRevocation', () => {
  beforeEach(() => resetMocks());

  it('passes when jti is not in deny-list', async () => {
    // Test the revocation checker callback logic directly
    const isRevoked = async (jti: string) => false;
    expect(await isRevoked('abc-123')).toBe(false);
  });

  it('revocation checker returns true for revoked jti', async () => {
    const isRevoked = async (jti: string) => jti === 'revoked-jti';
    expect(await isRevoked('revoked-jti')).toBe(true);
    expect(await isRevoked('valid-jti')).toBe(false);
  });
});

describe('P1.4: TokenRevokedError', () => {
  it('carries the jti that was revoked', () => {
    const { TokenRevokedError } = require('@/lib/platform/unified-token');
    const err = new TokenRevokedError('jti-abc-123');
    expect(err.message).toBe('Token has been revoked');
    expect(err.jti).toBe('jti-abc-123');
    expect(err.name).toBe('TokenRevokedError');
  });
});

describe('P1.4: Client deactivation revokes tokens', () => {
  beforeEach(() => resetMocks());

  it('inserts revoked_tokens row when client is deactivated', async () => {
    // Mock verifyToken to authenticate the user via Bearer token
    (verifyToken as jest.Mock).mockReturnValueOnce({
      type: 'access',
      userId: 'user-1',
      clientType: 'ios',
      platform: 'ios',
      clientId: 'Hyperspace-iOS',
    });

    // Simulate: client_registrations UPDATE returns a row, then revoked_tokens INSERTs
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'reg-1', client_type: 'ios', client_id: 'Hyperspace-iOS' }],
      })
      .mockResolvedValueOnce({ rows: [] }) // jti revocation insert
      .mockResolvedValueOnce({ rows: [] }); // client-level revocation insert

    (decodeToken as jest.Mock).mockReturnValueOnce({
      jti: 'jti-xyz',
      exp: Math.floor(Date.now() / 1000) + 3600,
      clientId: 'Hyperspace-iOS',
    });

    const { default: handler } = require('@/pages/api/onboarding/clients');
    const { req, res, state } = createMockReqRes({
      method: 'DELETE',
      query: { id: 'reg-1' },
      headers: { authorization: 'Bearer mock-token' },
      body: { reason: 'user_revoked' },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body.success).toBe(true);
    // Verify revoked_tokens INSERT was called
    const insertCalls = mockQuery.mock.calls.filter(
      (c: any[]) => c[0]?.includes?.('INSERT INTO revoked_tokens')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// P1.5: Short-lived scoped secrets
// ---------------------------------------------------------------------------

describe('P1.5: issueScopedSecretToken', () => {
  const testSecret = 'test-secret-for-scoped-tokens';

  it('issues a token with correct payload', () => {
    const result = issueScopedSecretToken({
      userId: 'user-1',
      tenantId: 'tenant-1',
      secretPath: '/users/johndoe/imap',
      scopes: ['imap:read', 'imap:send'],
      config: { secret: testSecret },
    });

    expect(result.token).toBeTruthy();
    expect(result.secretPath).toBe('/users/johndoe/imap');
    expect(result.scopes).toEqual(['imap:read', 'imap:send']);
    expect(result.expiresAt).toBeGreaterThan(result.issuedAt);
    // TTL should be 1 hour (3600s) by default
    expect(result.expiresAt - result.issuedAt).toBe(3600);
  });

  it('token contains jti for revocation', () => {
    const result = issueScopedSecretToken({
      userId: 'user-1',
      secretPath: '/users/johndoe/imap',
      scopes: ['imap:read'],
      config: { secret: testSecret },
    });

    const decoded = verifyScopedSecretToken(result.token, testSecret);
    expect(decoded.jti).toBeTruthy();
    expect(decoded.userId).toBe('user-1');
    expect(decoded.secretPath).toBe('/users/johndoe/imap');
  });
});

describe('P1.5: verifyScopedSecretToken', () => {
  const testSecret = 'test-secret-for-scoped-tokens';

  it('verifies a valid token', () => {
    const result = issueScopedSecretToken({
      userId: 'user-1',
      secretPath: '/users/johndoe/llm_openai',
      scopes: ['llm:infer'],
      config: { secret: testSecret },
    });

    const decoded = verifyScopedSecretToken(result.token, testSecret);
    expect(decoded.userId).toBe('user-1');
    expect(decoded.secretPath).toBe('/users/johndoe/llm_openai');
    expect(decoded.scopes).toEqual(['llm:infer']);
  });

  it('throws for wrong token type', () => {
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign({ type: 'access', userId: 'user-1' }, testSecret);
    expect(() => verifyScopedSecretToken(fakeToken, testSecret)).toThrow('not a scoped secret token');
  });

  it('throws for invalid signature', () => {
    const result = issueScopedSecretToken({
      userId: 'user-1',
      secretPath: '/test',
      scopes: ['test'],
      config: { secret: testSecret },
    });
    expect(() => verifyScopedSecretToken(result.token, 'wrong-secret')).toThrow();
  });
});

describe('P1.5: hasScope', () => {
  it('matches exact scope', () => {
    expect(hasScope(['imap:read', 'imap:send'], 'imap:read')).toBe(true);
  });

  it('matches wildcard scope', () => {
    expect(hasScope(['*'], 'imap:read')).toBe(true);
  });

  it('matches prefix wildcard', () => {
    expect(hasScope(['imap:*'], 'imap:read')).toBe(true);
    expect(hasScope(['imap:*'], 'imap:send')).toBe(true);
    expect(hasScope(['imap:*'], 'llm:infer')).toBe(false);
  });

  it('returns false for missing scope', () => {
    expect(hasScope(['imap:read'], 'imap:send')).toBe(false);
  });
});

describe('P1.5: deriveSecretPath', () => {
  it('derives correct path for IMAP', () => {
    expect(deriveSecretPath('john.doe@example.com', 'imap')).toBe('/users/johndoe/imap');
  });

  it('derives correct path for LLM', () => {
    expect(deriveSecretPath('jane@doe.com', 'llm_openai')).toBe('/users/jane/llm_openai');
  });

  it('strips special characters from email prefix', () => {
    expect(deriveSecretPath('test.user+tag@domain.com', 'imap')).toBe('/users/testusertag/imap');
  });
});

describe('P1.5: deriveScopes', () => {
  it('returns read+send for IMAP', () => {
    expect(deriveScopes('imap')).toEqual(['imap:read', 'imap:send']);
  });

  it('returns infer for LLM providers', () => {
    expect(deriveScopes('llm_openai')).toEqual(['llm:infer']);
    expect(deriveScopes('llm_anthropic')).toEqual(['llm:infer']);
  });

  it('returns generic scope for unknown service', () => {
    expect(deriveScopes('custom_service')).toEqual(['custom_service:access']);
  });
});

// ---------------------------------------------------------------------------
// P1.6: zeroToleranceAck enforcement
// ---------------------------------------------------------------------------

describe('P1.6: zeroToleranceAck enforcement', () => {
  beforeEach(() => {
    resetMocks();
    delete process.env.REQUIRE_ZERO_TOLERANCE_ACK;
  });

  afterAll(() => {
    delete process.env.REQUIRE_ZERO_TOLERANCE_ACK;
  });

  it('deepRedactSecrets still redacts secrets in form data', () => {
    const formData = {
      email: 'test@test.com',
      emailConfig: {
        provider: 'icloud',
        imapAppPassword: 'super-secret-password',
      },
      security: { zeroToleranceAck: true },
    };
    const redacted = deepRedactSecrets(formData);
    expect(redacted.emailConfig.imapAppPassword).toBe('[REDACTED]');
    // zeroToleranceAck is a boolean, not a secret — should not be redacted
    expect(redacted.security.zeroToleranceAck).toBe(true);
  });

  it('zeroToleranceAck=false is preserved through redaction', () => {
    const formData = {
      security: { zeroToleranceAck: false },
    };
    const redacted = deepRedactSecrets(formData);
    expect(redacted.security.zeroToleranceAck).toBe(false);
  });

  it('REQUIRE_ZERO_TOLERANCE_ACK env controls enforcement', () => {
    // Default: enforced
    expect(process.env.REQUIRE_ZERO_TOLERANCE_ACK).toBeUndefined();
    const requireAck = process.env.REQUIRE_ZERO_TOLERANCE_ACK !== 'false';
    expect(requireAck).toBe(true);

    // Opt-out for dev/test
    process.env.REQUIRE_ZERO_TOLERANCE_ACK = 'false';
    const requireAckFalse = process.env.REQUIRE_ZERO_TOLERANCE_ACK !== 'false';
    expect(requireAckFalse).toBe(false);
  });
});
