/**
 * Family Location API
 * 
 * Provides endpoints for tracking family member locations.
 * In production, this would integrate with:
 * - Find My iPhone API
 * - Google Family Link
 * - Life360
 * - Home Assistant device tracking
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface FamilyMemberLocation {
  id: string;
  name: string;
  emoji?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    placeName?: string;
    updatedAt: string;
  } | null;
  isHome: boolean;
  isInVehicle: boolean;
  lastSeenAt: string;
  batteryLevel?: number;
  etaToVehicle?: number;
  distanceToVehicle?: number;
}

interface FamilyLocationResponse {
  success: boolean;
  members: FamilyMemberLocation[];
  homeLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vehicleLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
  timestamp: string;
}

// Demo family data - replace with real integrations
const DEMO_FAMILY: FamilyMemberLocation[] = [
  {
    id: 'spouse',
    name: 'Sarah',
    emoji: '👩',
    location: {
      latitude: 29.7604,
      longitude: -95.3698,
      placeName: 'Downtown Office',
      address: '123 Main St, Houston, TX',
      updatedAt: new Date().toISOString(),
    },
    isHome: false,
    isInVehicle: false,
    lastSeenAt: new Date().toISOString(),
    batteryLevel: 78,
    etaToVehicle: 12,
    distanceToVehicle: 5.2,
  },
  {
    id: 'child1',
    name: 'Emma',
    emoji: '👧',
    location: {
      latitude: 29.7504,
      longitude: -95.3598,
      placeName: 'School',
      address: '456 Oak Ave, Houston, TX',
      updatedAt: new Date().toISOString(),
    },
    isHome: false,
    isInVehicle: false,
    lastSeenAt: new Date().toISOString(),
    batteryLevel: 45,
    etaToVehicle: 18,
    distanceToVehicle: 8.1,
  },
  {
    id: 'child2',
    name: 'Jake',
    emoji: '👦',
    location: {
      latitude: 29.7704,
      longitude: -95.3798,
      placeName: 'Home',
      address: '789 Pine Ln, Houston, TX',
      updatedAt: new Date().toISOString(),
    },
    isHome: true,
    isInVehicle: false,
    lastSeenAt: new Date().toISOString(),
    batteryLevel: 92,
  },
];

// Home location (demo)
const HOME_LOCATION = {
  latitude: 29.7704,
  longitude: -95.3798,
  address: '789 Pine Ln, Houston, TX',
};

/**
 * Calculate distance between two points in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate ETA in minutes based on distance (assuming 30 mph average)
 */
function calculateETA(distanceMiles: number): number {
  return Math.round((distanceMiles / 30) * 60);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FamilyLocationResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` } as any);
  }

  try {
    // In production:
    // 1. Query Home Assistant for device tracker states
    // 2. Call Find My iPhone API (icloud.com)
    // 3. Query Life360 API
    // 4. Get vehicle location from Tesla Relay

    // For demo, calculate distances from vehicle if location provided
    let members = [...DEMO_FAMILY];
    let vehicleLocation = null;

    // Try to get actual vehicle location from Tesla Relay
    try {
      const teslaResponse = await fetch('http://localhost:18810/vehicles');
      if (teslaResponse.ok) {
        const vehicles = await teslaResponse.json();
        if (vehicles && vehicles.length > 0 && vehicles[0].latitude) {
          vehicleLocation = {
            latitude: vehicles[0].latitude,
            longitude: vehicles[0].longitude,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      console.log('[Family API] Tesla Relay not available, using demo location');
    }

    // Calculate distances and ETAs if we have vehicle location
    if (vehicleLocation) {
      members = members.map(member => {
        if (!member.location || member.isHome || member.isInVehicle) {
          return member;
        }

        const distance = calculateDistance(
          vehicleLocation.latitude,
          vehicleLocation.longitude,
          member.location.latitude,
          member.location.longitude
        );

        return {
          ...member,
          distanceToVehicle: Math.round(distance * 10) / 10,
          etaToVehicle: calculateETA(distance),
        };
      });
    }

    return res.status(200).json({
      success: true,
      members,
      homeLocation: HOME_LOCATION,
      vehicleLocation: vehicleLocation || undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Family API] Error:', error);
    return res.status(500).json({
      success: false,
      members: DEMO_FAMILY,
      homeLocation: HOME_LOCATION,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    } as any);
  }
}
