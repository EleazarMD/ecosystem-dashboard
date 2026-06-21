/**
 * DEPRECATED — kept as alias for legacy callers.
 * New code should call /api/cig/calendar/upcoming.
 * Internally forwards to the canonical CIG-backed route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import cigHandler from '../../cig/calendar/upcoming';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return cigHandler(req, res);
}
