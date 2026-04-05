/**
 * Utility to normalize capabilities from various formats to a string array
 * Handles: string[], object with boolean values, null, undefined
 */
export function normalizeCapabilities(capabilities: unknown): string[] {
  if (!capabilities) {
    return [];
  }
  
  if (Array.isArray(capabilities)) {
    return capabilities.map(c => String(c));
  }
  
  if (typeof capabilities === 'object' && capabilities !== null) {
    return Object.keys(capabilities);
  }
  
  return [];
}

/**
 * Get the count of capabilities regardless of format
 */
export function getCapabilitiesCount(capabilities: unknown): number {
  return normalizeCapabilities(capabilities).length;
}
