/**
 * Multimodal PDF Upload API Route
 * Proxies PDF uploads to the NVIDIA RAG Blueprint Ingestor Server
 * Supports multimodal extraction: text, tables, charts, OCR
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import http from 'http';

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const INGESTOR_URL = process.env.INGESTOR_URL || 'http://localhost:8082';

// Ensure collection exists before upload
async function ensureCollection(collectionName: string): Promise<void> {
  try {
    // Check if collection exists
    const collectionsRes = await fetch(`${INGESTOR_URL}/collections`);
    if (collectionsRes.ok) {
      const data = await collectionsRes.json();
      const exists = data.collections?.some((c: any) => c.collection_name === collectionName);
      if (exists) {
        console.log(`[Multimodal Upload] Collection ${collectionName} already exists`);
        return;
      }
    }
    
    // Create collection with correct embedding dimension (1024 for nv-embedqa-e5-v5)
    console.log(`[Multimodal Upload] Creating collection ${collectionName}`);
    const createRes = await fetch(`${INGESTOR_URL}/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_name: collectionName,
        embedding_dimension: 1024,
        metadata_schema: [
          { name: 'workspace_id', type: 'string' },
          { name: 'filename', type: 'string' },
          { name: 'upload_time', type: 'string' },
        ],
      }),
    });
    
    if (!createRes.ok) {
      const error = await createRes.text();
      console.error(`[Multimodal Upload] Failed to create collection: ${error}`);
    } else {
      console.log(`[Multimodal Upload] Collection ${collectionName} created`);
    }
  } catch (error) {
    console.error('[Multimodal Upload] Error ensuring collection:', error);
  }
}

interface IngestionData {
  collection_name: string;
  blocking: boolean;
  split_options: {
    chunk_size: number;
    chunk_overlap: number;
  };
  custom_metadata: Array<{ key: string; value: string }>;
  generate_summary: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 200 * 1024 * 1024, // 200MB for multimodal processing
    });

    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const workspaceId = fields.workspace_id?.[0] || 'default';
    const filename = file.originalFilename || 'document.pdf';
    // Use blocking mode for more reliable ingestion of large documents
    const blocking = true;
    // Sanitize collection name - Milvus only allows letters, numbers, underscores
    const sanitizedWorkspaceId = workspaceId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const collectionName = `workspace_${sanitizedWorkspaceId}`;

    // Ensure collection exists before upload
    await ensureCollection(collectionName);

    // Read file content into buffer
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Build ingestion data
    const ingestionData: IngestionData = {
      collection_name: collectionName,
      blocking: blocking,
      split_options: {
        chunk_size: 512,
        chunk_overlap: 150,
      },
      custom_metadata: [],
      generate_summary: false,
    };

    console.log(`[Multimodal Upload] Uploading ${filename} to ${INGESTOR_URL}/documents, collection: ${collectionName}`);

    // Build multipart form data manually (matching curl format exactly)
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    const CRLF = '\r\n';
    
    // Build body parts
    const parts: Buffer[] = [];
    
    // Part 1: documents file
    parts.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="documents"; filename="${filename}"${CRLF}` +
      `Content-Type: application/pdf${CRLF}${CRLF}`
    ));
    parts.push(fileBuffer);
    parts.push(Buffer.from(CRLF));
    
    // Part 2: data JSON
    parts.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="data"${CRLF}${CRLF}` +
      JSON.stringify(ingestionData) + CRLF
    ));
    
    // End boundary
    parts.push(Buffer.from(`--${boundary}--${CRLF}`));
    
    const body = Buffer.concat(parts);
    
    // Clean up temp file
    try { fs.unlinkSync(file.filepath); } catch {}

    // Make HTTP request
    const url = new URL(`${INGESTOR_URL}/documents`);
    const result = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: 300000,
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode || 500, data: JSON.parse(data) });
          } catch {
            resolve({ status: response.statusCode || 500, data: { error: data } });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(body);
      req.end();
    });

    console.log(`[Multimodal Upload] Response status: ${result.status}`);
    console.log(`[Multimodal Upload] Response data:`, JSON.stringify(result.data).substring(0, 500));

    if (result.status !== 200) {
      console.error('[Multimodal Upload] Ingestor error:', result.data);
      return res.status(result.status).json({ 
        error: 'Failed to process document',
        details: result.data 
      });
    }

    // Check for failures in the response (Blueprint returns 200 even on failure)
    const responseData = result.data;
    const hasFailedDocs = responseData?.failed_documents?.length > 0;
    const hasSuccessDocs = responseData?.documents?.length > 0;
    const messageIndicatesFailure = responseData?.message?.toLowerCase().includes('failed');
    
    if (hasFailedDocs && !hasSuccessDocs) {
      const failedDoc = responseData.failed_documents[0];
      console.error('[Multimodal Upload] Document ingestion failed:', failedDoc);
      return res.status(422).json({
        error: 'Document ingestion failed',
        message: failedDoc?.error_message || responseData.message || 'Ingestion did not complete successfully',
        details: responseData,
      });
    }

    if (messageIndicatesFailure && !hasSuccessDocs) {
      console.error('[Multimodal Upload] Ingestion failed:', responseData.message);
      return res.status(422).json({
        error: 'Document ingestion failed',
        message: responseData.message,
        details: responseData,
      });
    }

    // Return success with task info
    return res.status(200).json({
      success: true,
      message: responseData.message || 'Document ingestion started',
      filename: filename,
      workspace_id: workspaceId,
      collection_name: ingestionData.collection_name,
      task: responseData,
    });

  } catch (error: any) {
    console.error('[Multimodal Upload] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
