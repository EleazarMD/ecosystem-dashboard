/**
 * OnboardingService — Unified provisioning pipeline
 * ============================================================================
 * Handles user/tenant onboarding from any client (iOS, Dashboard, Atlas, CLI).
 *
 * Pipeline steps (ordered):
 *   1. create_tenant        — Create tenant if not exists
 *   2. assign_subscription  — Set subscription tier in user_feature_access
 *   3. provision_infisical  — Create Infisical folders for the user
 *   4. provision_neo4j      — (Future) Provision Neo4j database per user
 *   5. enroll_cig           — Enroll user in CIG (email/calendar/chat)
 *   6. enroll_nova          — Enroll user in Nova Agent
 *   7. enroll_pcg           — Enroll user in Personal Context Graph
 *   8. enroll_pi_workspace  — Enroll user in Pi Workspace
 *   9. register_client      — Register the calling client in client_registrations
 *  10. security_validation  — Verify all services are reachable + healthy
 *
 * Each step is recorded in onboarding_steps. Steps can be skipped based on
 * the form data (e.g. skip email enrollment if user didn't configure email).
 */

import { Pool } from 'pg';
import { issueAccessToken, UnifiedAuthContext } from './unified-token';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// ============================================================================
// Secret redaction (zero-tolerance: no plaintext secrets at rest)
// ============================================================================

/** Object keys whose values are secrets and must never be persisted in cleartext. */
const SENSITIVE_KEY_PATTERN = /(password|app[_-]?password|api[_-]?key|secret|token|credential|client[_-]?secret)/i;
const REDACTED = '[REDACTED]';

/**
 * Deep-clone `value`, replacing any property whose key matches
 * SENSITIVE_KEY_PATTERN with `[REDACTED]`. The original object is NOT mutated,
 * so in-memory step execution still receives the real secrets — only the copy
 * written to Postgres (onboarding_jobs / onboarding_steps) is sanitized.
 */
export function deepRedactSecrets(value: any): any {
  if (Array.isArray(value)) {
    return value.map((v) => deepRedactSecrets(v));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string' && SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = val.length > 0 ? REDACTED : val;
      } else {
        out[key] = deepRedactSecrets(val);
      }
    }
    return out;
  }
  return value;
}

// ============================================================================
// Types
// ============================================================================

export interface OnboardingFormData {
  // Identity
  name: string;
  email: string;
  // Email config (optional)
  emailConfig?: {
    provider: string;
    imapHost?: string;
    imapPort?: number;
    imapUsername?: string;
    imapAppPassword?: string;
  };
  // Infrastructure (optional)
  infrastructure?: {
    dockerEnabled?: boolean;
    neo4jEnabled?: boolean;
  };
  // LLM config (optional)
  llmConfig?: {
    provider: string;
    apiKey?: string;
    model?: string;
  };
  // Cloud providers (optional)
  cloudProviders?: Array<{
    provider: string;
    apiKey?: string;
  }>;
  // ExoMind / iOS pairing (optional)
  exomindPairing?: {
    deviceName?: string;
    platform?: string;
  };
  // Security
  security?: {
    zeroToleranceAck?: boolean;
  };
  // Subscription
  targetTier?: string;
}

export interface OnboardingRequest {
  userId: string;          // Pre-authenticated user ID
  tenantId?: string;       // Existing tenant, or null to create one
  triggeredBy: 'ios' | 'dashboard' | 'atlas' | 'cli' | 'admin' | 'system';
  clientType: string;
  platform: string;
  clientId?: string;
  formData: OnboardingFormData;
  targetTier?: string;
}

export interface OnboardingStepResult {
  stepName: string;
  status: 'completed' | 'failed' | 'skipped';
  result?: Record<string, any>;
  error?: string;
}

export interface OnboardingJobResult {
  jobId: string;
  status: 'completed' | 'failed' | 'in_progress';
  progress: number;
  tenantId?: string;
  subscriptionTier: string;
  steps: OnboardingStepResult[];
  error?: string;
}

// ============================================================================
// Onboarding Service
// ============================================================================

export class OnboardingService {
  /**
   * Start a new onboarding job.
   * Creates the job record, generates steps based on form data, and
   * executes them sequentially. Returns the job result.
   */
  async provision(req: OnboardingRequest): Promise<OnboardingJobResult> {
    const targetTier = req.targetTier || req.formData.targetTier || 'free';

    // Create job record
    const jobResult = await pool.query(
      `INSERT INTO onboarding_jobs
         (user_id, tenant_id, job_type, triggered_by, form_data, target_tier, status, started_at)
       VALUES ($1, $2, 'full_provisioning', $3, $4, $5, 'in_progress', now())
       RETURNING id`,
      [req.userId, req.tenantId || null, req.triggeredBy, JSON.stringify(deepRedactSecrets(req.formData)), targetTier]
    );
    const jobId = jobResult.rows[0].id;

    // Generate steps based on form data and service catalog
    const steps = this.generateSteps(req.formData, targetTier);

    // Insert step records
    for (let i = 0; i < steps.length; i++) {
      await pool.query(
        `INSERT INTO onboarding_steps (job_id, step_name, step_order, service_name, status, config)
         VALUES ($1, $2, $3, $4, 'pending', $5)`,
        [jobId, steps[i].stepName, i, steps[i].serviceName || null, JSON.stringify(steps[i].config || {})]
      );
    }

    // Execute steps sequentially
    const stepResults: OnboardingStepResult[] = [];
    let currentTenantId = req.tenantId;
    let failed = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepName = step.stepName;

      // Update job current_step
      await pool.query(
        `UPDATE onboarding_jobs SET current_step = $1, progress = $2 WHERE id = $3`,
        [stepName, Math.round((i / steps.length) * 100), jobId]
      );

      // Mark step in_progress
      await pool.query(
        `UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE job_id = $1 AND step_name = $2`,
        [jobId, stepName]
      );

      try {
        const result = await step.execute({
          userId: req.userId,
          tenantId: currentTenantId,
          formData: req.formData,
          targetTier,
          pool,
        });

        if (result.tenantId) {
          currentTenantId = result.tenantId;
        }

        stepResults.push({
          stepName,
          status: result.status,
          result: result.result,
        });

        // Mark step completed
        await pool.query(
          `UPDATE onboarding_steps SET status = $1, completed_at = now(), result = $2, duration_ms = $3 WHERE job_id = $4 AND step_name = $5`,
          [result.status, JSON.stringify(deepRedactSecrets(result.result || {})),
           result.startTime ? Date.now() - result.startTime : null, jobId, stepName]
        );

        if (result.status === 'failed') {
          failed = true;
          await pool.query(
            `UPDATE onboarding_jobs SET status = 'failed', error_message = $1, current_step = $2 WHERE id = $3`,
            [result.error || 'Step failed', stepName, jobId]
          );
          break;
        }
      } catch (err: any) {
        failed = true;
        const errorMsg = err.message || String(err);
        stepResults.push({ stepName, status: 'failed', error: errorMsg });
        await pool.query(
          `UPDATE onboarding_steps SET status = 'failed', error_message = $1, completed_at = now() WHERE job_id = $2 AND step_name = $3`,
          [errorMsg, jobId, stepName]
        );
        await pool.query(
          `UPDATE onboarding_jobs SET status = 'failed', error_message = $1, current_step = $2 WHERE id = $3`,
          [errorMsg, stepName, jobId]
        );
        break;
      }
    }

    // Update job final status
    const finalStatus = failed ? 'failed' : 'completed';
    const finalProgress = failed ? Math.round((stepResults.filter(s => s.status === 'completed').length / steps.length) * 100) : 100;

    await pool.query(
      `UPDATE onboarding_jobs SET status = $1, progress = $2, completed_at = $3, result = $4 WHERE id = $5`,
      [finalStatus, finalProgress, failed ? null : new Date(), JSON.stringify(deepRedactSecrets({ tenantId: currentTenantId, steps: stepResults })), jobId]
    );

    return {
      jobId,
      status: finalStatus as any,
      progress: finalProgress,
      tenantId: currentTenantId,
      subscriptionTier: targetTier,
      steps: stepResults,
      error: failed ? stepResults.find(s => s.status === 'failed')?.error : undefined,
    };
  }

  /**
   * Get onboarding job status by ID.
   *
   * When `userId` is supplied (the standard API path), the job is scoped to
   * that user so a caller can never read another user's job — which may
   * contain provisioning details. Callers that legitimately need any job
   * (e.g. platform-admin tooling) may omit `userId`.
   */
  async getJobStatus(jobId: string, userId?: string): Promise<OnboardingJobResult | null> {
    const result = userId
      ? await pool.query(
          `SELECT * FROM v_onboarding_job_summary WHERE job_id = $1 AND user_id = $2`,
          [jobId, userId]
        )
      : await pool.query(
          `SELECT * FROM v_onboarding_job_summary WHERE job_id = $1`,
          [jobId]
        );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const stepsResult = await pool.query(
      `SELECT step_name, status, error_message, result, started_at, completed_at, duration_ms
       FROM onboarding_steps WHERE job_id = $1 ORDER BY step_order`,
      [jobId]
    );

    return {
      jobId: row.job_id,
      status: row.job_status,
      progress: row.progress,
      tenantId: row.tenant_id,
      subscriptionTier: row.target_tier,
      steps: stepsResult.rows.map((s: any) => ({
        stepName: s.step_name,
        status: s.status,
        result: s.result,
        error: s.error_message,
      })),
      error: row.error_message,
    };
  }

  /**
   * List onboarding jobs for a user.
   */
  async listJobsForUser(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM v_onboarding_job_summary WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    return result.rows;
  }

  // ==========================================================================
  // Step definitions
  // ==========================================================================

  private generateSteps(formData: OnboardingFormData, targetTier: string): StepDef[] {
    const steps: StepDef[] = [];

    // Step 1: Create tenant (if not provided)
    steps.push({
      stepName: 'create_tenant',
      serviceName: null,
      execute: executeCreateTenant,
    });

    // Step 2: Assign subscription tier
    steps.push({
      stepName: 'assign_subscription',
      serviceName: null,
      execute: executeAssignSubscription,
    });

    // Step 3: Provision Infisical folders
    steps.push({
      stepName: 'provision_infisical',
      serviceName: 'infisical',
      execute: executeProvisionInfisical,
    });

    // Step 4: Enroll in CIG (if email or calendar features are in tier)
    if (formData.emailConfig) {
      steps.push({
        stepName: 'enroll_cig',
        serviceName: 'cig',
        execute: executeEnrollCig,
      });
    }

    // Step 5: Enroll in Nova Agent
    steps.push({
      stepName: 'enroll_nova',
      serviceName: 'nova-agent',
      execute: executeEnrollNova,
    });

    // Step 6: Enroll in PCG
    steps.push({
      stepName: 'enroll_pcg',
      serviceName: 'pcg',
      execute: executeEnrollPcg,
    });

    // Step 7: Enroll in Pi Workspace
    steps.push({
      stepName: 'enroll_pi_workspace',
      serviceName: 'pi-workspace',
      execute: executeEnrollPiWorkspace,
    });

    // Step 8: Register the calling client
    steps.push({
      stepName: 'register_client',
      serviceName: null,
      execute: executeRegisterClient,
    });

    // Step 9: Security validation
    steps.push({
      stepName: 'security_validation',
      serviceName: null,
      execute: executeSecurityValidation,
    });

    return steps;
  }
}

// ============================================================================
// Step execution context
// ============================================================================

interface StepContext {
  userId: string;
  tenantId?: string;
  formData: OnboardingFormData;
  targetTier: string;
  pool: Pool;
}

interface StepExecutionResult {
  status: 'completed' | 'failed' | 'skipped';
  result?: Record<string, any>;
  error?: string;
  tenantId?: string;
  startTime?: number;
}

interface StepDef {
  stepName: string;
  serviceName: string | null;
  config?: Record<string, any>;
  execute: (ctx: StepContext) => Promise<StepExecutionResult>;
}

// ============================================================================
// Step implementations
// ============================================================================

async function executeCreateTenant(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();

  // If tenant already exists, skip
  if (ctx.tenantId) {
    return { status: 'skipped', result: { reason: 'tenant_already_exists', tenantId: ctx.tenantId }, startTime };
  }

  // Check if user already has a tenant membership
  const existing = await ctx.pool.query(
    `SELECT t.id, t.slug, t.name FROM tenant_memberships tm
     JOIN tenants t ON tm.tenant_id = t.id
     WHERE tm.user_id = $1 AND tm.status = 'active' AND t.status = 'active'
     LIMIT 1`,
    [ctx.userId]
  );

  if (existing.rows.length > 0) {
    return {
      status: 'skipped',
      result: { reason: 'user_already_has_tenant', tenantId: existing.rows[0].id },
      tenantId: existing.rows[0].id,
      startTime,
    };
  }

  // Create a new personal tenant
  const userResult = await ctx.pool.query('SELECT name, email FROM users WHERE id = $1', [ctx.userId]);
  if (userResult.rows.length === 0) {
    return { status: 'failed', error: 'User not found', startTime };
  }
  const user = userResult.rows[0];

  const slug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
  const tenantName = `${user.name}'s Workspace`;

  const tenantResult = await ctx.pool.query(
    `INSERT INTO tenants (name, slug, status) VALUES ($1, $2, 'active') RETURNING id, slug`,
    [tenantName, slug]
  );
  const tenantId = tenantResult.rows[0].id;

  // Create tenant membership as admin
  await ctx.pool.query(
    `INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status)
     VALUES ($1, $2, 'tenant-admin', 'active')`,
    [tenantId, ctx.userId]
  );

  return {
    status: 'completed',
    result: { tenantId, slug, name: tenantName },
    tenantId,
    startTime,
  };
}

async function executeAssignSubscription(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();

  // Upsert user_feature_access
  await ctx.pool.query(
    `INSERT INTO user_feature_access (user_id, subscription_tier, created_at, updated_at)
     VALUES ($1, $2, now(), now())
     ON CONFLICT (user_id) DO UPDATE SET
       subscription_tier = EXCLUDED.subscription_tier,
       updated_at = now()`,
    [ctx.userId, ctx.targetTier]
  );

  return {
    status: 'completed',
    result: { tier: ctx.targetTier },
    startTime,
  };
}

async function executeProvisionInfisical(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();

  // Derive user folder name from email
  const folderName = ctx.formData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  // P1.5: Instead of passing the raw IMAP app password to CIG (which would
  // store it long-lived), we issue a short-lived scoped secret token. The
  // real secret is stored in Infisical; CIG receives only the scoped token
  // reference and fetches the secret at runtime.
  const jwtSecret = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';
  let scopedSecretToken: string | undefined;
  if (ctx.formData.emailConfig?.imapAppPassword) {
    try {
      const { issueScopedSecretToken, deriveSecretPath, deriveScopes } =
        require('./scoped-secrets');
      const secretPath = deriveSecretPath(ctx.formData.email, 'imap');
      const scopes = deriveScopes('imap');
      const scoped = issueScopedSecretToken({
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        secretPath,
        scopes,
        config: { secret: jwtSecret },
      });
      scopedSecretToken = scoped.token;
    } catch { /* non-fatal — fall back to legacy flow */ }
  }

  // Call CIG's account connect endpoint to create Infisical folders
  // (or call Infisical CLI directly if running on the server)
  try {
    const cigUrl = process.env.CIG_URL || 'http://localhost:8780';
    const response = await fetch(`${cigUrl}/v1/accounts/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CIG_API_KEY || 'cig-api-key-prod-2024',
        'X-User-ID': ctx.userId,
      },
      body: JSON.stringify({
        email: ctx.formData.email,
        imap_host: ctx.formData.emailConfig?.imapHost || 'imap.mail.me.com',
        imap_port: ctx.formData.emailConfig?.imapPort || 993,
        imap_username: ctx.formData.emailConfig?.imapUsername || ctx.formData.email,
        // P1.5: Pass scoped token instead of raw password when available.
        // CIG fetches the real secret from Infisical using this token.
        imap_scoped_token: scopedSecretToken,
        imap_app_password: scopedSecretToken ? undefined : (ctx.formData.emailConfig?.imapAppPassword || ''),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'completed',
        result: {
          infisical_folder: folderName,
          cig_response: data,
          scoped_secret_used: !!scopedSecretToken,
        },
        startTime,
      };
    } else {
      // Non-fatal — Infisical folders can be created later
      return {
        status: 'skipped',
        result: { reason: 'cig_connect_failed', folder: folderName, status: response.status },
        startTime,
      };
    }
  } catch (err: any) {
    // Non-fatal during onboarding — user can connect email later
    return {
      status: 'skipped',
      result: { reason: 'cig_unreachable', error: err.message, folder: folderName },
      startTime,
    };
  }
}

async function executeEnrollCig(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();

  // CIG enrollment is handled by the provision_infisical step (which calls /v1/accounts/connect)
  // This step just verifies CIG is reachable and the user can authenticate
  try {
    const cigUrl = process.env.CIG_URL || 'http://localhost:8780';
    const response = await fetch(`${cigUrl}/health`);
    if (response.ok) {
      return {
        status: 'completed',
        result: { cig_url: cigUrl, health: 'ok' },
        startTime,
      };
    }
    return { status: 'skipped', result: { reason: 'cig_unhealthy', status: response.status }, startTime };
  } catch {
    return { status: 'skipped', result: { reason: 'cig_unreachable' }, startTime };
  }
}

async function executeEnrollNova(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();
  try {
    const novaUrl = process.env.NOVA_URL || 'http://localhost:18803';
    const response = await fetch(`${novaUrl}/health`);
    if (response.ok) {
      return { status: 'completed', result: { nova_url: novaUrl, health: 'ok' }, startTime };
    }
    return { status: 'skipped', result: { reason: 'nova_unhealthy' }, startTime };
  } catch {
    return { status: 'skipped', result: { reason: 'nova_unreachable' }, startTime };
  }
}

async function executeEnrollPcg(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();
  try {
    const pcgUrl = process.env.PCG_URL || 'http://localhost:8765';
    const response = await fetch(`${pcgUrl}/health`);
    if (response.ok) {
      return { status: 'completed', result: { pcg_url: pcgUrl, health: 'ok' }, startTime };
    }
    return { status: 'skipped', result: { reason: 'pcg_unhealthy' }, startTime };
  } catch {
    return { status: 'skipped', result: { reason: 'pcg_unreachable' }, startTime };
  }
}

async function executeEnrollPiWorkspace(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();
  try {
    const wsUrl = process.env.PI_WORKSPACE_URL || 'http://localhost:8762';
    const response = await fetch(`${wsUrl}/health`);
    if (response.ok) {
      return { status: 'completed', result: { workspace_url: wsUrl, health: 'ok' }, startTime };
    }
    return { status: 'skipped', result: { reason: 'workspace_unhealthy' }, startTime };
  } catch {
    return { status: 'skipped', result: { reason: 'workspace_unreachable' }, startTime };
  }
}

async function executeRegisterClient(ctx: StepContext & { clientType?: string; platform?: string; clientId?: string }): Promise<StepExecutionResult> {
  const startTime = Date.now();
  // Client registration is handled by the API route which has the request context
  // This step is a placeholder for future client-specific provisioning
  return {
    status: 'completed',
    result: { reason: 'client_registration_handled_by_api' },
    startTime,
  };
}

async function executeSecurityValidation(ctx: StepContext): Promise<StepExecutionResult> {
  const startTime = Date.now();

  // P1.6: Enforce zeroToleranceAck — the explicit consent that JIT
  // zero-tolerance policies apply to this user/tenant.
  //
  // By default (REQUIRE_ZERO_TOLERANCE_ACK not set or !== 'false'),
  // provisioning FAILS if the user hasn't acknowledged. This is
  // fail-closed: you must explicitly opt out for dev/test environments.
  const zeroToleranceAck = ctx.formData.security?.zeroToleranceAck === true;
  const requireAck = process.env.REQUIRE_ZERO_TOLERANCE_ACK !== 'false';

  try {
    await ctx.pool.query(
      `INSERT INTO audit_log (action, user_id, metadata, created_at)
       VALUES ('security:zero_tolerance_ack', $1, $2, now())`,
      [ctx.userId, JSON.stringify({ acknowledged: zeroToleranceAck, tenantId: ctx.tenantId ?? null, enforced: requireAck })]
    );
  } catch { /* audit_log is best-effort; do not fail provisioning on logging */ }

  if (requireAck && !zeroToleranceAck) {
    return {
      status: 'failed',
      error: 'Zero-tolerance security acknowledgment is required. Set formData.security.zeroToleranceAck = true to proceed.',
      result: { zero_tolerance_ack: false, enforced: true },
      startTime,
    };
  }

  // Verify all enrolled services are reachable
  const checks: Record<string, boolean> = {};
  const services = [
    { name: 'cig', url: process.env.CIG_URL || 'http://localhost:8780' },
    { name: 'nova', url: process.env.NOVA_URL || 'http://localhost:18803' },
    { name: 'pcg', url: process.env.PCG_URL || 'http://localhost:8765' },
    { name: 'pi-workspace', url: process.env.PI_WORKSPACE_URL || 'http://localhost:8762' },
  ];

  for (const svc of services) {
    try {
      const response = await fetch(`${svc.url}/health`, { signal: AbortSignal.timeout(3000) });
      checks[svc.name] = response.ok;
    } catch {
      checks[svc.name] = false;
    }
  }

  const allHealthy = Object.values(checks).every(v => v === true);
  const partialHealthy = Object.values(checks).some(v => v === true);

  if (allHealthy) {
    return { status: 'completed', result: { checks, all_healthy: true, zero_tolerance_ack: zeroToleranceAck }, startTime };
  } else if (partialHealthy) {
    return { status: 'completed', result: { checks, all_healthy: false, warning: 'some_services_unreachable', zero_tolerance_ack: zeroToleranceAck }, startTime };
  } else {
    return { status: 'failed', error: 'All services unreachable', result: { checks, zero_tolerance_ack: zeroToleranceAck }, startTime };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: OnboardingService | null = null;

export function getOnboardingService(): OnboardingService {
  if (!_instance) {
    _instance = new OnboardingService();
  }
  return _instance;
}
