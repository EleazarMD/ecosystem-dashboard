/**
 * Test endpoint to verify direct Ollama connection from server-side
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing direct Ollama connection...');
    
    const ollamaUrl = 'http://localhost:11434';
    const systemPrompt = `You are the AI Homelab Dashboard Intelligence Agent. You provide comprehensive analytics, insights, and management capabilities across all dashboard resources.`;
    
    const testRequest = {
      model: 'gemma3:4b',
      prompt: `${systemPrompt}\n\nUser: Hello, this is a test. Please respond briefly.\n\nAssistant:`,
      stream: false
    };

    console.log(`Making request to: ${ollamaUrl}/api/generate`);
    console.log('Request payload:', JSON.stringify(testRequest, null, 2));

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      return res.status(response.status).json({
        success: false,
        error: `Ollama API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    const result = await response.json();
    console.log('Success! Ollama response received');
    
    return res.status(200).json({
      success: true,
      message: 'Ollama connection successful',
      response: result.response,
      model: result.model,
      processingTime: result.total_duration
    });

  } catch (error) {
    console.error('Ollama test failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
}
