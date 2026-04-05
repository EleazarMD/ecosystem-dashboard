/**
 * Maps Distance API
 * 
 * Calculates distance and duration between two locations.
 * Priority: Apple Maps > Google Maps > Estimation fallback
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDirections, isAppleMapsConfigured } from '@/lib/apple-maps';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface DistanceResponse {
  distanceMiles: number;
  durationMinutes: number;
  origin: string;
  destination: string;
  source: 'apple' | 'google' | 'estimated';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DistanceResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { origin, destination } = req.body;

  if (!destination) {
    return res.status(400).json({ error: 'Destination is required' });
  }

  // Try Apple Maps first (preferred)
  if (isAppleMapsConfigured()) {
    try {
      const originParam = origin === 'current' ? 'Houston, TX' : origin; // Fallback for current location
      const directions = await getDirections(originParam, destination);
      
      if (directions) {
        return res.status(200).json({
          distanceMiles: directions.distanceMiles,
          durationMinutes: directions.durationMinutes,
          origin: originParam,
          destination,
          source: 'apple',
        });
      }
    } catch (error) {
      console.error('[Maps] Apple Maps error:', error);
      // Fall through to Google Maps
    }
  }

  // Try Google Maps Distance Matrix API if key is available
  if (GOOGLE_MAPS_API_KEY && origin !== 'current') {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
      url.searchParams.set('origins', origin);
      url.searchParams.set('destinations', destination);
      url.searchParams.set('units', 'imperial');
      url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        const distanceMeters = element.distance.value;
        const durationSeconds = element.duration.value;

        return res.status(200).json({
          distanceMiles: Math.round(distanceMeters / 1609.34),
          durationMinutes: Math.round(durationSeconds / 60),
          origin,
          destination,
          source: 'google',
        });
      }
    } catch (error) {
      console.error('[Maps] Google API error:', error);
      // Fall through to estimation
    }
  }

  // Fallback: Estimate based on location keywords
  const destLower = destination.toLowerCase();
  let distanceMiles = 30;
  let durationMinutes = 45;

  // Common location patterns
  if (destLower.includes('home') || destLower.includes('house')) {
    distanceMiles = 0;
    durationMinutes = 0;
  } else if (destLower.includes('office') || destLower.includes('work') || destLower.includes('hq')) {
    distanceMiles = 15;
    durationMinutes = 25;
  } else if (destLower.includes('airport') || destLower.includes('iah') || destLower.includes('hobby')) {
    distanceMiles = 35;
    durationMinutes = 45;
  } else if (destLower.includes('downtown') || destLower.includes('galleria')) {
    distanceMiles = 20;
    durationMinutes = 35;
  } else if (destLower.includes('hospital') || destLower.includes('medical')) {
    distanceMiles = 12;
    durationMinutes = 20;
  } else if (destLower.includes('school') || destLower.includes('university')) {
    distanceMiles = 8;
    durationMinutes = 15;
  } else if (destLower.includes('gym') || destLower.includes('fitness')) {
    distanceMiles = 5;
    durationMinutes = 10;
  } else if (destLower.includes('restaurant') || destLower.includes('cafe') || destLower.includes('coffee')) {
    distanceMiles = 6;
    durationMinutes = 12;
  } else if (destLower.includes('store') || destLower.includes('mall') || destLower.includes('shopping')) {
    distanceMiles = 10;
    durationMinutes = 18;
  } else if (destLower.includes('park') || destLower.includes('trail')) {
    distanceMiles = 8;
    durationMinutes = 15;
  } else if (destLower.includes('church') || destLower.includes('temple') || destLower.includes('mosque')) {
    distanceMiles = 7;
    durationMinutes = 12;
  } else if (destLower.includes('austin') || destLower.includes('san antonio') || destLower.includes('dallas')) {
    // Texas cities from Houston
    distanceMiles = 180;
    durationMinutes = 180;
  } else if (destLower.includes('galveston')) {
    distanceMiles = 55;
    durationMinutes = 65;
  }

  return res.status(200).json({
    distanceMiles,
    durationMinutes,
    origin: origin || 'current',
    destination,
    source: 'estimated',
  });
}
