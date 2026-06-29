/**
 * ServiceCatalog — Feature-to-service mapping
 * ============================================================================
 * Connects the FeatureFlag enum from subscription-tiers.ts to actual backend
 * services in the service_catalog DB table. This lets the onboarding wizard,
 * feature gate middleware, and agents know which service implements a given
 * feature and what endpoint to call.
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// ============================================================================
// Types
// ============================================================================

export interface ServiceCatalogEntry {
  id: string;
  serviceName: string;
  displayName: string;
  description: string;
  host: string;
  port: number;
  healthEndpoint: string;
  apiPrefix: string;
  serviceType: string;
  capabilities: any[];
  featureFlags: string[];
  dependencies: string[];
  authRequired: boolean;
  authMethods: string[];
  provisioningEnabled: boolean;
  provisioningOrder: number;
  provisioningConfig: Record<string, any>;
  status: string;
  lastHeartbeat: Date | null;
  version: string | null;
  metadata: Record<string, any>;
}

export interface FeatureServiceMapping {
  feature: string;
  services: ServiceCatalogEntry[];
}

// ============================================================================
// Service Catalog Client
// ============================================================================

export class ServiceCatalogClient {
  private cache: ServiceCatalogEntry[] | null = null;
  private cacheTime = 0;
  private readonly cacheTTL = 30_000; // 30 seconds

  /**
   * Get all active services from the catalog.
   */
  async getAllServices(): Promise<ServiceCatalogEntry[]> {
    if (this.cache && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cache;
    }

    const result = await pool.query(
      `SELECT * FROM service_catalog
       WHERE status IN ('active', 'registered')
       ORDER BY provisioning_order, service_name`
    );

    this.cache = result.rows.map(this.mapRow);
    this.cacheTime = Date.now();
    return this.cache;
  }

  /**
   * Get a single service by name.
   */
  async getService(serviceName: string): Promise<ServiceCatalogEntry | null> {
    const result = await pool.query(
      `SELECT * FROM service_catalog WHERE service_name = $1`,
      [serviceName]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Get all services that implement a given feature flag.
   */
  async getServicesForFeature(feature: string): Promise<ServiceCatalogEntry[]> {
    const services = await this.getAllServices();
    return services.filter(s => s.featureFlags.includes(feature));
  }

  /**
   * Get all feature-to-service mappings.
   */
  async getFeatureMappings(): Promise<FeatureServiceMapping[]> {
    const services = await this.getAllServices();
    const featureMap = new Map<string, ServiceCatalogEntry[]>();

    for (const svc of services) {
      for (const flag of svc.featureFlags) {
        if (!featureMap.has(flag)) {
          featureMap.set(flag, []);
        }
        featureMap.get(flag)!.push(svc);
      }
    }

    return Array.from(featureMap.entries()).map(([feature, services]) => ({
      feature,
      services,
    }));
  }

  /**
   * Get services that should be provisioned during onboarding, in order.
   */
  async getProvisioningServices(): Promise<ServiceCatalogEntry[]> {
    const services = await this.getAllServices();
    return services
      .filter(s => s.provisioningEnabled)
      .sort((a, b) => a.provisioningOrder - b.provisioningOrder);
  }

  /**
   * Get the dependency graph for a service.
   */
  async getDependencyGraph(serviceName: string): Promise<Record<string, string[]>> {
    const services = await this.getAllServices();
    const graph: Record<string, string[]> = {};

    const visit = (name: string, visited: Set<string>) => {
      if (visited.has(name)) return;
      visited.add(name);
      const svc = services.find(s => s.serviceName === name);
      if (svc) {
        graph[name] = svc.dependencies;
        for (const dep of svc.dependencies) {
          visit(dep, visited);
        }
      }
    };

    visit(serviceName, new Set());
    return graph;
  }

  /**
   * Register or update a service in the catalog.
   * Called by backend services on startup to self-register.
   */
  async registerService(entry: Partial<ServiceCatalogEntry> & { serviceName: string }): Promise<ServiceCatalogEntry> {
    const result = await pool.query(
      `INSERT INTO service_catalog
         (service_name, display_name, description, host, port, health_endpoint,
          api_prefix, service_type, capabilities, feature_flags, dependencies,
          auth_required, auth_methods, provisioning_enabled, provisioning_order,
          provisioning_config, status, version, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (service_name) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         description = EXCLUDED.description,
         host = EXCLUDED.host,
         port = EXCLUDED.port,
         health_endpoint = EXCLUDED.health_endpoint,
         api_prefix = EXCLUDED.api_prefix,
         service_type = EXCLUDED.service_type,
         capabilities = EXCLUDED.capabilities,
         feature_flags = EXCLUDED.feature_flags,
         dependencies = EXCLUDED.dependencies,
         auth_required = EXCLUDED.auth_required,
         auth_methods = EXCLUDED.auth_methods,
         provisioning_enabled = EXCLUDED.provisioning_enabled,
         provisioning_order = EXCLUDED.provisioning_order,
         provisioning_config = EXCLUDED.provisioning_config,
         status = EXCLUDED.status,
         version = EXCLUDED.version,
         metadata = EXCLUDED.metadata,
         last_heartbeat = now(),
         updated_at = now()
       RETURNING *`,
      [
        entry.serviceName,
        entry.displayName || entry.serviceName,
        entry.description || null,
        entry.host || 'localhost',
        entry.port,
        entry.healthEndpoint || '/health',
        entry.apiPrefix || '/v1',
        entry.serviceType || 'rest-api',
        JSON.stringify(entry.capabilities || []),
        JSON.stringify(entry.featureFlags || []),
        JSON.stringify(entry.dependencies || []),
        entry.authRequired ?? true,
        JSON.stringify(entry.authMethods || ['jwt']),
        entry.provisioningEnabled ?? false,
        entry.provisioningOrder ?? 100,
        JSON.stringify(entry.provisioningConfig || {}),
        entry.status || 'active',
        entry.version || null,
        JSON.stringify(entry.metadata || {}),
      ]
    );

    this.cache = null; // Invalidate cache
    return this.mapRow(result.rows[0]);
  }

  /**
   * Update a service's heartbeat and status.
   */
  async heartbeat(serviceName: string, status: string = 'active'): Promise<void> {
    await pool.query(
      `UPDATE service_catalog SET last_heartbeat = now(), status = $2, updated_at = now()
       WHERE service_name = $1`,
      [serviceName, status]
    );
    this.cache = null;
  }

  /**
   * Check if a user's subscription tier grants access to a feature.
   */
  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT subscription_tier, purchased_addons, admin_granted_features, admin_revoked_features
       FROM user_feature_access WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    const access = result.rows[0];

    // Check if feature is revoked
    if (access.admin_revoked_features?.includes(feature)) return false;

    // Check if feature is admin-granted
    if (access.admin_granted_features?.includes(feature)) return true;

    // Check tier-based features (uses the subscription-tiers.ts logic)
    const { getTierFeatures } = require('../subscription-tiers');
    const tierFeatures = getTierFeatures(access.subscription_tier);
    if (tierFeatures.includes(feature)) return true;

    // Check purchased add-ons
    const { getAddOnFeatures } = require('../subscription-tiers');
    for (const addonId of access.purchased_addons || []) {
      const addonFeatures = getAddOnFeatures(addonId);
      if (addonFeatures.includes(feature)) return true;
    }

    return false;
  }

  private mapRow(row: any): ServiceCatalogEntry {
    return {
      id: row.id,
      serviceName: row.service_name,
      displayName: row.display_name,
      description: row.description,
      host: row.host,
      port: row.port,
      healthEndpoint: row.health_endpoint,
      apiPrefix: row.api_prefix,
      serviceType: row.service_type,
      capabilities: row.capabilities || [],
      featureFlags: row.feature_flags || [],
      dependencies: row.dependencies || [],
      authRequired: row.auth_required,
      authMethods: row.auth_methods || ['jwt'],
      provisioningEnabled: row.provisioning_enabled,
      provisioningOrder: row.provisioning_order,
      provisioningConfig: row.provisioning_config || {},
      status: row.status,
      lastHeartbeat: row.last_heartbeat,
      version: row.version,
      metadata: row.metadata || {},
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: ServiceCatalogClient | null = null;

export function getServiceCatalog(): ServiceCatalogClient {
  if (!_instance) {
    _instance = new ServiceCatalogClient();
  }
  return _instance;
}
