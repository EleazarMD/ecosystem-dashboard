import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Channel ID required' });
  }

  const accessToken = req.cookies.youtube_access_token;
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // First, get the subscription ID for this channel
    const subsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&forChannelId=${id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!subsRes.ok) {
      const errData = await subsRes.json().catch(() => ({}));
      console.error('[Unsubscribe] Find subscription failed:', subsRes.status, errData);
      // 403 usually means insufficient scope - need to re-auth
      if (subsRes.status === 403) {
        return res.status(403).json({ 
          error: 'Insufficient permissions. Please sign out and sign in again to grant write access.',
          needsReauth: true 
        });
      }
      return res.status(subsRes.status).json({ error: 'Failed to find subscription', details: errData });
    }

    const subsData = await subsRes.json();
    const subscription = subsData.items?.[0];
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found for this channel' });
    }

    // Delete the subscription
    const deleteRes = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?id=${subscription.id}`,
      { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` } 
      }
    );

    if (deleteRes.status === 204 || deleteRes.ok) {
      return res.status(200).json({ success: true });
    }

    const deleteErr = await deleteRes.json().catch(() => ({}));
    console.error('[Unsubscribe] Delete failed:', deleteRes.status, deleteErr);
    
    if (deleteRes.status === 403) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Please sign out and sign in again to grant write access.',
        needsReauth: true 
      });
    }
    
    return res.status(deleteRes.status).json({ error: 'Failed to unsubscribe', details: deleteErr });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
