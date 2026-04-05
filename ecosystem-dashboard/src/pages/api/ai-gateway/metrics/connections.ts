/**
 * API endpoint for AI Gateway client connection metrics
 * Returns real-time status of downstream client connections
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface ClientConnection {
  id: string;
  client_id: string;
  ip_address: string;
  connected_at: string;
  requests_count: number;
  last_activity: string;
  user_agent?: string;
  auth_method: string;
  session_duration: number;
  bytes_sent: number;
  bytes_received: number;
}

// Fetch client connection data from AI Gateway
async function fetchClientConnections(): Promise<ClientConnection[]> {
  const aiGatewayUrl = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:8777';
  const apiKey = process.env.AI_GATEWAY_ADMIN_KEY || 'ai-gateway-api-key-2024';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${aiGatewayUrl}/admin/connections/active`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.connections || [];
  } catch (error) {
    console.error('Failed to fetch client connections:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const connections = await fetchClientConnections();
    
    // Calculate metrics
    const totalRequests = connections.reduce((sum, conn) => sum + conn.requests_count, 0);
    const totalBytesTransferred = connections.reduce((sum, conn) => sum + conn.bytes_sent + conn.bytes_received, 0);
    const avgSessionDuration = connections.length > 0 ? 
      connections.reduce((sum, conn) => sum + conn.session_duration, 0) / connections.length : 0;

    // Group by auth method
    const authMethods = connections.reduce((acc, conn) => {
      acc[conn.auth_method] = (acc[conn.auth_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      connections,
      metrics: {
        total_connections: connections.length,
        total_requests: totalRequests,
        total_bytes_transferred: totalBytesTransferred,
        avg_session_duration: Math.round(avgSessionDuration),
        auth_methods: authMethods,
        requests_per_connection: connections.length > 0 ? Math.round(totalRequests / connections.length) : 0
      }
    });
  } catch (error: any) {
    console.error('Connections metrics API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch connection metrics', 
      message: error.message 
    });
  }
}
