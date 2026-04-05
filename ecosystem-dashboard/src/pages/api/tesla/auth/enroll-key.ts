/**
 * Tesla Virtual Key Enrollment
 * 
 * GET /api/tesla/auth/enroll-key
 * Generates a Tesla mobile app deep link for virtual key enrollment
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the registered domain from environment or use default
  const domain = process.env.TESLA_DOMAIN || 'nexus.hyperspaceanalytics.com';

  // Tesla virtual key enrollment link format
  const enrollmentUrl = `https://www.tesla.com/_ak/${domain}`;

  return res.status(200).json({
    enrollmentUrl,
    qrCodeData: enrollmentUrl,
    instructions: [
      '1. Open this link on your phone or scan the QR code',
      '2. The Tesla mobile app will open automatically',
      '3. Follow the prompts to add the virtual key to your vehicles',
      '4. Approve access for each vehicle (Black Panther, Ruby)',
      '5. Once approved, Nova and OpenClaw can send commands',
    ],
    domain,
  });
}
