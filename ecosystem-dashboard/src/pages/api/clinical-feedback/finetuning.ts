import type { NextApiRequest, NextApiResponse } from 'next';

const CLINICAL_KB_API = process.env.CLINICAL_KB_API_URL || 'http://127.0.0.1:8035';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getExamples(req, res);
      case 'POST':
        return await createExample(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('[Clinical Finetuning API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getExamples(req: NextApiRequest, res: NextApiResponse) {
  const { setting, status } = req.query;
  
  try {
    const params = new URLSearchParams();
    if (setting) params.set('setting', setting as string);
    if (status) params.set('status', status as string);
    
    const response = await fetch(`${CLINICAL_KB_API}/api/finetuning?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(data);
    }
    throw new Error('API request failed');
  } catch (error) {
    console.error('[Clinical Finetuning] Error:', error);
    return res.status(200).json({ examples: [], total: 0 });
  }
}

async function createExample(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(`${CLINICAL_KB_API}/api/finetuning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    
    if (response.ok) {
      const data = await response.json();
      return res.status(201).json(data);
    }
    throw new Error('API request failed');
  } catch (error) {
    console.error('[Clinical Finetuning] Error:', error);
    return res.status(500).json({ error: 'Failed to create example' });
  }
}
