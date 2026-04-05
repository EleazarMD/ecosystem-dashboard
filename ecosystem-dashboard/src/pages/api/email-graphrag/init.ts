import type { NextApiRequest, NextApiResponse } from 'next';

const GRAPHRAG_URL = process.env.GRAPHRAG_URL || process.env.NEXT_PUBLIC_GRAPHRAG_URL || 'http://localhost:8780';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { folder = 'inbox', limit = '50', account } = req.query;
    
    let url = `${GRAPHRAG_URL}/email-platform/init?folder=${folder}&limit=${limit}`;
    if (account && account !== 'all') {
      url += `&account=${account}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[API] Email platform init error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch email data',
      emails: [],
      stats: {
        indexed_emails: { inbox: 0, sent: 0 },
        account_counts: { icloud: { inbox: 0, sent: 0 }, work: { inbox: 0, sent: 0 } },
        top_contacts: []
      }
    });
  }
}
