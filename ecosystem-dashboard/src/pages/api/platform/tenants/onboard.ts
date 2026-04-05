/**
 * Tenant Onboarding API
 * 
 * POST - Run complete tenant onboarding workflow
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  withPlatformAdmin,
  logAudit,
  AuthContext,
} from '@/lib/platform/auth-middleware';
import {
  getTenantOnboardingService,
  TenantSetupOptions,
} from '@/lib/platform/tenant-onboarding';
import { TenantTier } from '@/lib/platform/tenant-types';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const {
    name,
    slug,
    ownerEmail,
    tier = 'free',
    description,
    skipChromaDB,
    skipNeo4j,
    skipWorkspace,
  } = req.body;
  
  // Validation
  if (!name || !slug || !ownerEmail) {
    return res.status(400).json({
      success: false,
      error: 'name, slug, and ownerEmail are required',
    });
  }
  
  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({
      success: false,
      error: 'slug must be lowercase alphanumeric with hyphens only',
    });
  }
  
  // Validate tier
  const validTiers: TenantTier[] = ['free', 'basic', 'premium'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({
      success: false,
      error: `tier must be one of: ${validTiers.join(', ')}`,
    });
  }
  
  try {
    const onboardingService = getTenantOnboardingService();
    
    const options: TenantSetupOptions = {
      name,
      slug,
      ownerEmail,
      tier,
      description,
      skipChromaDB,
      skipNeo4j,
      skipWorkspace,
    };
    
    const result = await onboardingService.onboardTenant(options);
    
    // Log audit
    await logAudit('tenant:onboarded', ctx, {
      tenantId: result.tenantId,
      tenantSlug: result.tenantSlug,
      tier,
      steps: result.steps.map(s => ({ name: s.name, status: s.status })),
    }, 'tenant', result.tenantId);
    
    if (result.success) {
      return res.status(201).json({
        success: true,
        tenantId: result.tenantId,
        tenantSlug: result.tenantSlug,
        steps: result.steps,
        message: 'Tenant onboarding completed successfully',
      });
    } else {
      return res.status(500).json({
        success: false,
        tenantId: result.tenantId,
        tenantSlug: result.tenantSlug,
        steps: result.steps,
        error: result.error || 'Onboarding failed',
      });
    }
  } catch (error) {
    console.error('[Tenant Onboarding API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Onboarding failed',
    });
  }
}

export default withPlatformAdmin(handler);
