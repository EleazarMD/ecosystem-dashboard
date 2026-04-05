/**
 * Apple Maps Server API Client
 * 
 * Uses MapKit JS / Apple Maps Server API for directions, geocoding, and search.
 * Requires: Team ID, Key ID, and .p8 private key from Apple Developer account.
 */

import jwt from 'jsonwebtoken';

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || 'WPS3DGH7NS';
const APPLE_KEY_ID = process.env.APPLE_MAPS_KEY_ID || '6WGZ56V5S2';
const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';

const MAPS_API_BASE = 'https://maps-api.apple.com/v1';

// Token cache (access token valid for 30 minutes, we refresh at 25)
let cachedAccessToken: string | null = null;
let accessTokenExpiry: number = 0;
let cachedPrivateKey: string | null = null;

/**
 * Fetch Apple Maps private key from AI Inferencing
 */
async function getPrivateKey(): Promise<string> {
  if (cachedPrivateKey) return cachedPrivateKey;
  
  try {
    const response = await fetch(`${AI_INFERENCING_URL}/api/v1/keys/nova-agent/apple-maps-key`);
    if (response.ok) {
      const data = await response.json();
      cachedPrivateKey = data.apiKey;
      return cachedPrivateKey!;
    }
  } catch (error) {
    console.error('[AppleMaps] Failed to fetch private key:', error);
  }
  
  throw new Error('APPLE_MAPS_PRIVATE_KEY not configured in AI Inferencing');
}

/**
 * Generate a JWT auth token (used to exchange for access token)
 */
function generateAuthToken(privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + 1800, // 30 minutes
  };
  
  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: APPLE_KEY_ID,
      typ: 'JWT',
    },
  });
}

/**
 * Exchange auth token for access token via Apple's token endpoint
 */
async function exchangeForAccessToken(authToken: string): Promise<string> {
  const response = await fetch('https://maps-api.apple.com/v1/token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }
  
  const data = await response.json();
  return data.accessToken;
}

/**
 * Get a valid Apple Maps access token (handles caching and refresh)
 */
export async function generateAppleMapsToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Return cached access token if still valid (with 5 min buffer)
  if (cachedAccessToken && accessTokenExpiry > now + 300) {
    return cachedAccessToken;
  }
  
  const privateKey = await getPrivateKey();
  const authToken = generateAuthToken(privateKey);
  const accessToken = await exchangeForAccessToken(authToken);
  
  cachedAccessToken = accessToken;
  accessTokenExpiry = now + 1800; // 30 minutes
  
  return accessToken;
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
} | null> {
  const token = await generateAppleMapsToken();
  
  const url = new URL(`${MAPS_API_BASE}/geocode`);
  url.searchParams.set('q', address);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    console.error('[AppleMaps] Geocode failed:', response.status, await response.text());
    return null;
  }
  
  const data = await response.json();
  const result = data.results?.[0];
  
  if (!result) return null;
  
  return {
    latitude: result.coordinate.latitude,
    longitude: result.coordinate.longitude,
    formattedAddress: result.formattedAddressLines?.join(', ') || address,
  };
}

/**
 * Get directions between two points
 */
export async function getDirections(
  origin: { latitude: number; longitude: number } | string,
  destination: { latitude: number; longitude: number } | string
): Promise<{
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
  steps: Array<{ instruction: string; distanceMeters: number }>;
} | null> {
  const token = await generateAppleMapsToken();
  
  // Geocode string addresses if needed
  let originCoords = typeof origin === 'string' ? await geocodeAddress(origin) : origin;
  let destCoords = typeof destination === 'string' ? await geocodeAddress(destination) : destination;
  
  if (!originCoords || !destCoords) {
    console.error('[AppleMaps] Could not geocode origin or destination');
    return null;
  }
  
  const url = new URL(`${MAPS_API_BASE}/directions`);
  url.searchParams.set('origin', `${originCoords.latitude},${originCoords.longitude}`);
  url.searchParams.set('destination', `${destCoords.latitude},${destCoords.longitude}`);
  url.searchParams.set('transportType', 'Automobile');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    console.error('[AppleMaps] Directions failed:', response.status, await response.text());
    return null;
  }
  
  const data = await response.json();
  const route = data.routes?.[0];
  
  if (!route) return null;
  
  const distanceMeters = route.distanceMeters || 0;
  const durationSeconds = route.expectedTravelTimeSeconds || 0;
  
  return {
    distanceMeters,
    distanceMiles: Math.round(distanceMeters / 1609.34),
    durationSeconds,
    durationMinutes: Math.round(durationSeconds / 60),
    steps: route.steps?.map((step: any) => ({
      instruction: step.instructions || '',
      distanceMeters: step.distanceMeters || 0,
    })) || [],
  };
}

/**
 * Search for places near a location
 */
export async function searchPlaces(
  query: string,
  near?: { latitude: number; longitude: number }
): Promise<Array<{
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
}>> {
  const token = await generateAppleMapsToken();
  
  const url = new URL(`${MAPS_API_BASE}/search`);
  url.searchParams.set('q', query);
  if (near) {
    url.searchParams.set('searchLocation', `${near.latitude},${near.longitude}`);
  }
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    console.error('[AppleMaps] Search failed:', response.status);
    return [];
  }
  
  const data = await response.json();
  
  return (data.results || []).map((place: any) => ({
    name: place.name || '',
    address: place.formattedAddressLines?.join(', ') || '',
    latitude: place.coordinate?.latitude || 0,
    longitude: place.coordinate?.longitude || 0,
    category: place.poiCategory || '',
  }));
}

/**
 * Check if Apple Maps is configured
 */
export function isAppleMapsConfigured(): boolean {
  // We have Team ID and Key ID hardcoded, just need to check if we can potentially fetch the key
  return !!(APPLE_TEAM_ID && APPLE_KEY_ID);
}
