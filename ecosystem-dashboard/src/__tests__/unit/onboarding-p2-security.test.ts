/**
 * P2 Security Hardening — Regression Tests
 *
 * Covers:
 *   P2.7  — RLS helper (setRLSContext / withRLS)
 *   P2.8  — Atlas IDE device-pairing endpoint
 *   P2.10 — Rate limiter (checkRateLimit, getIP)
 *   P2.11 — CORS tightening on refresh endpoint
 */

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockRelease = jest.fn();
  const mockClient = {
    query: mockQuery,
    release: mockRelease,
  };
  // Use a plain function (not jest.fn) for Pool to avoid clearAllMocks
  // resetting its implementation. The returned object always references
  // mockQuery so tests can control it via mockQuery.mockResolvedValue.
  function MockPool() {
    return {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient),
      on: jest.fn(),
    };
  }
  return {
    Pool: MockPool,
    __mockQuery: mockQuery,
    __mockClient: mockClient,
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
// Imports
// ---------------------------------------------------------------------------

import { checkRateLimit, getIP, RATE_LIMITS } from '@/lib/platform/rate-limiter';

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
  method: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  socket?: { remoteAddress?: string };
}) {
  const state: MockState = { statusCode: 0, body: null, headers: {} };
  const req = {
    method: input.method,
    headers: input.headers || {},
    body: input.body || {},
    query: input.query || {},
    socket: input.socket || { remoteAddress: '127.0.0.1' },
  };
  const res = {
    statusCode: 0,
    status: jest.fn(function (this: any, code: number) {
      state.statusCode = code;
      return this;
    }),
    json: jest.fn(function (this: any, body: any) {
      state.body = body;
      return this;
    }),
    end: jest.fn(),
    setHeader: jest.fn((name: string, value: string | string[]) => {
      state.headers[name] = value;
    }),
  };
  return { req, res, state };
}

function resetMocks() {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
}

// ---------------------------------------------------------------------------
// P2.10: Rate Limiter
// ---------------------------------------------------------------------------

describe('P2.10: Rate Limiter', () => {
  // No beforeEach — use unique keys per test to avoid cross-test contamination

  it('allows requests within the limit', () => {
    const { checkRateLimit } = require('@/lib/platform/rate-limiter');
    const key = 'test:allow:' + Date.now();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60000)).toBe(true);
    }
  });

  it('blocks requests exceeding the limit', () => {
    const { checkRateLimit } = require('@/lib/platform/rate-limiter');
    const key = 'test:block:' + Date.now();
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60000);
    }
    // 6th request should be blocked
    expect(checkRateLimit(key, 5, 60000)).toBe(false);
  });

  it('resets after the window expires', () => {
    const { checkRateLimit } = require('@/lib/platform/rate-limiter');
    const key = 'test:reset:' + Date.now();
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 1); // 1ms window — expires almost immediately
    }
    expect(checkRateLimit(key, 3, 1)).toBe(false);
    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(key, 3, 100)).toBe(true);
        resolve();
      }, 10);
    });
  });

  it('RATE_LIMITS has correct configurations', () => {
    expect(RATE_LIMITS.signup.maxRequests).toBe(5);
    expect(RATE_LIMITS.mobileLogin.maxRequests).toBe(10);
    expect(RATE_LIMITS.refresh.maxRequests).toBe(30);
    expect(RATE_LIMITS.devicePairing.maxRequests).toBe(5);
  });

  it('getIP extracts from x-forwarded-for', () => {
    const ip = getIP({
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    });
    expect(ip).toBe('203.0.113.5');
  });

  it('getIP falls back to socket.remoteAddress', () => {
    const ip = getIP({
      headers: {},
      socket: { remoteAddress: '192.168.1.1' },
    });
    expect(ip).toBe('192.168.1.1');
  });

  it('getIP returns unknown when no IP available', () => {
    const ip = getIP({ headers: {} });
    expect(ip).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// P2.11: CORS tightening on refresh endpoint
// ---------------------------------------------------------------------------

describe('P2.11: CORS tightening on refresh', () => {
  beforeEach(() => resetMocks());

  it('sets Access-Control-Allow-Origin for allowed localhost origin in dev', async () => {
    const { default: handler } = await import('@/pages/api/auth/refresh');
    const { req, res, state } = createMockReqRes({
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    });

    await handler(req as any, res as any);

    expect(state.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    expect(state.headers['Vary']).toBe('Origin');
  });

  it('does NOT set wildcard Access-Control-Allow-Origin', async () => {
    const { default: handler } = await import('@/pages/api/auth/refresh');
    const { req, res, state } = createMockReqRes({
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example.com' },
    });

    // Set NODE_ENV to production to test the strict path
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';
    try {
      await handler(req as any, res as any);
      // In production with non-allowed origin, no CORS headers should be set
      expect(state.headers['Access-Control-Allow-Origin']).toBeUndefined();
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  it('sets CORS headers for ALLOWED_ORIGINS env entry', async () => {
    const originalAllowed = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://dashboard.example.com';
    try {
      const { default: handler } = await import('@/pages/api/auth/refresh');
      const { req, res, state } = createMockReqRes({
        method: 'OPTIONS',
        headers: { origin: 'https://app.example.com' },
      });

      await handler(req as any, res as any);

      expect(state.headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
      expect(state.headers['Vary']).toBe('Origin');
    } finally {
      process.env.ALLOWED_ORIGINS = originalAllowed;
    }
  });
});

// ---------------------------------------------------------------------------
// P2.8: Atlas IDE device-pairing endpoint
// ---------------------------------------------------------------------------

describe('P2.8: Device pairing endpoint', () => {
  // No beforeEach — set mock directly in each test

  it('rejects non-POST methods', async () => {
    const { default: handler } = await import('@/pages/api/auth/device-pairing');
    const { req, res, state } = createMockReqRes({ method: 'GET' });
    await handler(req as any, res as any);
    expect(state.statusCode).toBe(405);
  });

  it('rejects unknown action', async () => {
    const { default: handler } = await import('@/pages/api/auth/device-pairing');
    const { req, res, state } = createMockReqRes({
      method: 'POST',
      body: { action: 'invalid' },
    });
    await handler(req as any, res as any);
    expect(state.statusCode).toBe(400);
    expect(state.body.error).toMatch(/unknown action/i);
  });

  it('request action returns a pairing code', async () => {
    const { default: handler } = await import('@/pages/api/auth/device-pairing');
    const { req, res, state } = createMockReqRes({
      method: 'POST',
      body: { action: 'request' },
    });
    await handler(req as any, res as any);

    expect(state.statusCode).toBe(200);
    expect(state.body.pairingCode).toBeDefined();
    expect(state.body.pairingCode).toHaveLength(6);
    expect(state.body.expiresIn).toBe(300);
  });

  it('approve action requires authentication', async () => {
    const { default: handler } = await import('@/pages/api/auth/device-pairing');
    const { req, res, state } = createMockReqRes({
      method: 'POST',
      body: { action: 'approve', pairingCode: 'ABC123' },
    });
    await handler(req as any, res as any);
    expect(state.statusCode).toBe(401);
    expect(state.body.error).toMatch(/authentication required/i);
  });

  it('exchange action rejects unapproved code', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { default: handler } = await import('@/pages/api/auth/device-pairing');
    const { req, res, state } = createMockReqRes({
      method: 'POST',
      body: { action: 'exchange', pairingCode: 'UNAPPROVED' },
    });
    await handler(req as any, res as any);
    expect(state.statusCode).toBe(401);
    expect(state.body.error).toMatch(/not approved or expired/i);
  });

  it('status action returns 404 for unknown code', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { default: handler } = await import('@/pages/api/auth/device-pairing');
    const { req, res, state } = createMockReqRes({
      method: 'POST',
      body: { action: 'status', pairingCode: 'UNKNOWN' },
    });
    await handler(req as any, res as any);
    expect(state.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// P2.7: RLS helper
// ---------------------------------------------------------------------------

describe('P2.7: RLS helper', () => {
  beforeEach(() => resetMocks());

  it('setRLSContext sets app.current_user_id and bypass_rls', async () => {
    const { setRLSContext } = await import('@/lib/platform/rls-helper');
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await setRLSContext(client as any, 'user-uuid-123', false);

    expect(client.query).toHaveBeenCalledWith('SET LOCAL app.current_user_id = $1', ['user-uuid-123']);
    expect(client.query).toHaveBeenCalledWith("SET LOCAL app.bypass_rls = 'false'");
  });

  it('setRLSContext sets bypass_rls=true for platform admin', async () => {
    const { setRLSContext } = await import('@/lib/platform/rls-helper');
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await setRLSContext(client as any, 'admin-uuid', true);

    expect(client.query).toHaveBeenCalledWith("SET LOCAL app.bypass_rls = 'true'");
  });

  it('withRLS wraps function in BEGIN/COMMIT and releases client', async () => {
    const { withRLS } = await import('@/lib/platform/rls-helper');
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    const result = await withRLS(pool as any, 'user-1', false, async (client) => {
      return 'success';
    });

    expect(result).toBe('success');
    // Verify transaction lifecycle
    const calls = mockClient.query.mock.calls.map(c => c[0]);
    expect(calls).toContain('BEGIN');
    expect(calls).toContain('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('withRLS rolls back on error and rethrows', async () => {
    const { withRLS } = await import('@/lib/platform/rls-helper');
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    await expect(
      withRLS(pool as any, 'user-1', false, async () => {
        throw new Error('test error');
      })
    ).rejects.toThrow('test error');

    const calls = mockClient.query.mock.calls.map(c => c[0]);
    expect(calls).toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
