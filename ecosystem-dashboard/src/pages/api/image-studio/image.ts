import type { NextApiRequest, NextApiResponse } from 'next';

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';

/**
 * Proxy endpoint to serve images from ComfyUI
 * This is needed because the browser can't directly access localhost:8188
 * when accessing the dashboard via a different hostname
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, subfolder = '', type = 'output' } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required' });
  }

  try {
    const imageUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder as string)}&type=${encodeURIComponent(type as string)}`;
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch image from ComfyUI' 
      });
    }

    // Get the image buffer
    const buffer = await response.arrayBuffer();
    
    // Set appropriate headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Send the image
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('[Image Proxy] Error fetching image:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy image',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};
