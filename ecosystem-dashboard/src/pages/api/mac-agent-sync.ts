import type { NextApiRequest, NextApiResponse } from 'next';

const MAC_AGENT_URL = process.env.MAC_AGENT_URL || 'http://100.105.113.118:8781';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log(`[mac-agent-sync] Calling Mac Agent at ${MAC_AGENT_URL}/sync`);
    console.log(`[mac-agent-sync] Request body:`, { days: 7, force: true, sent_limit: 50, inbox_limit: 50 });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${MAC_AGENT_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        days: 7,
        force: true,
        sent_limit: 50,
        inbox_limit: 50,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log(`[mac-agent-sync] Mac Agent responded with status ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[mac-agent-sync] Mac Agent error: ${errorText}`);
      throw new Error(`Mac Agent returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[mac-agent-sync] Sync response:`, data);
    res.status(200).json(data);
  } catch (error) {
    console.error('[mac-agent-sync] Error:', error);
    res.status(500).json({ 
      error: 'Failed to sync with Mac Agent',
      details: error instanceof Error ? error.message : 'Unknown error',
      macAgentUrl: MAC_AGENT_URL
    });
  }
}
