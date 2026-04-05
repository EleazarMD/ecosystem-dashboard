/**
 * Image Upload API
 * 
 * Handles uploading images to the gallery (not AI-generated, user uploads)
 * Multi-tenant compliant
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = process.env.IMAGE_UPLOAD_DIR || '/tmp/image-studio-uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  try {
    // Get user's tenant_id for multi-tenant compliance
    const userResult = await pool.query(
      'SELECT tenant_id, account_type FROM users WHERE id = $1',
      [user.id]
    );
    const userData = userResult.rows[0];
    const tenantId = userData?.tenant_id || null;
    const isChildAccount = userData?.account_type === 'child';

    // Parse the multipart form data
    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filter: ({ mimetype }) => {
        // Only allow images
        return mimetype?.startsWith('image/') || false;
      },
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFile = files.image?.[0] || files.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Generate unique filename
    const ext = path.extname(uploadedFile.originalFilename || '.png');
    const uniqueFilename = `${uuidv4()}${ext}`;
    const finalPath = path.join(UPLOAD_DIR, uniqueFilename);

    // Move file to final location
    fs.renameSync(uploadedFile.filepath, finalPath);

    // Get file size
    const stats = fs.statSync(finalPath);

    // Create public URL path
    const publicPath = `/api/images/serve/${uniqueFilename}`;

    // Save to database
    const result = await pool.query(`
      INSERT INTO generated_images (
        user_id,
        tenant_id,
        prompt,
        model,
        width,
        height,
        filename,
        file_path,
        file_size_bytes,
        mime_type,
        source_service,
        visibility,
        is_child_generated,
        content_filter_applied,
        parent_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      user.id,
      tenantId,
      fields.description?.[0] || 'Uploaded image',
      'upload',
      0, // Width unknown for uploads
      0, // Height unknown for uploads
      uniqueFilename,
      publicPath,
      stats.size,
      uploadedFile.mimetype || 'image/png',
      'upload',
      fields.visibility?.[0] || 'private',
      isChildAccount,
      isChildAccount,
      !isChildAccount,
    ]);

    return res.status(201).json({
      success: true,
      image: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Image Upload API] Error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}
