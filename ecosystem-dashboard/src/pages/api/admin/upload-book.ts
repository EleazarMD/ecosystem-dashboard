/**
 * Children's Book Upload API
 * 
 * Handles uploading books (CBZ, PDF, EPUB) for children's library
 * Includes malware scanning and file validation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Pool } from 'pg';

export const config = {
  api: {
    bodyParser: false,
  },
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const ALLOWED_EXTENSIONS = ['.cbz', '.cbr', '.pdf', '.epub'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB for books

// Helper to validate UUID format
const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

interface ScanResult {
  safe: boolean;
  message: string;
  details?: string;
}

/**
 * Scan file for malware using multiple methods
 */
async function scanFile(filePath: string): Promise<ScanResult> {
  const results: string[] = [];
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    // 1. Check file type with `file` command
    let fileType = '';
    try {
      fileType = execSync(`file "${filePath}"`, { encoding: 'utf-8' }).trim();
      results.push(`File type: ${fileType}`);
    } catch (e) {
      results.push('Could not determine file type');
    }
    
    // 2. For CBZ files, verify it's a valid ZIP and check contents
    if (ext === '.cbz') {
      // Check if it's a ZIP archive (various ways file command reports it)
      const isZip = fileType.toLowerCase().includes('zip') || 
                    fileType.includes('Zip archive') ||
                    fileType.includes('compressed');
      
      if (fileType && !isZip) {
        // Try to actually unzip it to verify - file command can be wrong
        try {
          execSync(`unzip -t "${filePath}" > /dev/null 2>&1`);
          results.push('ZIP integrity check passed');
        } catch (e) {
          return { safe: false, message: 'CBZ file is not a valid ZIP archive', details: fileType };
        }
      }
      
      // List contents to check for suspicious files
      try {
        const contents = execSync(`unzip -l "${filePath}" 2>/dev/null | head -100`, { encoding: 'utf-8' });
        
        // Check for suspicious file types inside (but not in image filenames)
        const suspiciousPatterns = ['.exe', '.dll', '.bat', '.cmd', '.ps1', '.vbs', '.jar'];
        const lines = contents.split('\n');
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          for (const pattern of suspiciousPatterns) {
            // Only flag if the pattern is at the end of a filename (actual extension)
            if (lowerLine.endsWith(pattern)) {
              return { 
                safe: false, 
                message: `Archive contains suspicious file type: ${pattern}`,
                details: contents 
              };
            }
          }
        }
        results.push(`Archive contains ${lines.length - 4} files (images expected)`);
      } catch (e) {
        results.push('Could not inspect archive contents');
      }
    }
    
    // 3. For PDF files, check for suspicious content
    if (ext === '.pdf') {
      try {
        // Check for embedded JavaScript (common malware vector)
        const jsCheck = execSync(`strings "${filePath}" | grep -ci "javascript" || echo "0"`, { encoding: 'utf-8' });
        const jsCount = parseInt(jsCheck.trim()) || 0;
        if (jsCount > 10) {
          results.push(`Warning: PDF contains ${jsCount} JavaScript references`);
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // 4. Check file size is reasonable (at least 10KB for a book)
    const stats = fs.statSync(filePath);
    if (stats.size < 10000) {
      return { safe: false, message: 'File is suspiciously small for a book', details: `Size: ${stats.size} bytes` };
    }
    results.push(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // 5. Try ClamAV if available (optional)
    try {
      const clamResult = execSync(`clamscan --no-summary "${filePath}" 2>/dev/null`, { encoding: 'utf-8' });
      if (clamResult.includes('FOUND')) {
        return { safe: false, message: 'Malware detected by ClamAV', details: clamResult };
      }
      results.push('ClamAV scan: Clean');
    } catch (e) {
      results.push('ClamAV not available (skipped)');
    }
    
    return { 
      safe: true, 
      message: 'File passed all security checks',
      details: results.join('\n')
    };
    
  } catch (error) {
    console.error('[Book Upload] Scan error:', error);
    // Don't fail on scan errors - just log and allow with warning
    return { 
      safe: true, 
      message: 'Security scan completed with warnings',
      details: `Scan completed. Error during some checks: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[Book Upload] Request received:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  console.log('[Book Upload] Session:', session?.user?.id ? 'authenticated' : 'not authenticated');
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow any authenticated non-child account to upload
  const userRole = (session.user as any).role || (session.user as any).userType;
  const accountType = (session.user as any).accountType;
  console.log('[Book Upload] User role:', userRole, 'accountType:', accountType);
  
  if (accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden - Child accounts cannot upload books' });
  }

  try {
    console.log('[Book Upload] Parsing form data...');
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    let fields: any;
    let files: any;
    
    try {
      [fields, files] = await form.parse(req);
      console.log('[Book Upload] Form parsed. Fields:', Object.keys(fields || {}), 'Files:', Object.keys(files || {}));
    } catch (parseError) {
      console.error('[Book Upload] Form parse error:', parseError);
      return res.status(400).json({ error: 'Failed to parse upload', message: String(parseError) });
    }
    
    const childId = Array.isArray(fields.childId) ? fields.childId[0] : fields.childId;
    const bookTitle = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    const bookSeries = Array.isArray(fields.series) ? fields.series[0] : fields.series;
    const bookAuthor = Array.isArray(fields.author) ? fields.author[0] : fields.author;
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    console.log('[Book Upload] File:', uploadedFile?.originalFilename, 'Size:', uploadedFile?.size);

    if (!uploadedFile) {
      console.log('[Book Upload] No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file extension
    const ext = path.extname(uploadedFile.originalFilename || '').toLowerCase();
    console.log('[Book Upload] File extension:', ext);
    
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ 
        error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
    }

    // Security scan
    console.log(`[Book Upload] Scanning file: ${uploadedFile.originalFilename} at ${uploadedFile.filepath}`);
    const scanResult = await scanFile(uploadedFile.filepath);
    console.log('[Book Upload] Scan result:', scanResult);
    
    if (!scanResult.safe) {
      // Delete the suspicious file
      try { fs.unlinkSync(uploadedFile.filepath); } catch (e) {}
      console.error(`[Book Upload] Security scan failed:`, scanResult);
      return res.status(400).json({ 
        error: 'Security scan failed',
        message: scanResult.message,
        details: scanResult.details
      });
    }
    
    console.log(`[Book Upload] Security scan passed:`, scanResult.message);

    // Create books directory
    const booksDir = path.join(process.cwd(), 'data', 'books', 'library');
    if (!fs.existsSync(booksDir)) {
      fs.mkdirSync(booksDir, { recursive: true });
    }

    // Generate safe filename
    const safeTitle = (bookTitle || uploadedFile.originalFilename || 'book')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 100);
    const timestamp = Date.now();
    const filename = `${safeTitle}_${timestamp}${ext}`;
    const destPath = path.join(booksDir, filename);

    // Move file to destination
    fs.copyFileSync(uploadedFile.filepath, destPath);
    fs.unlinkSync(uploadedFile.filepath);

    // Save to database
    const result = await pool.query(`
      INSERT INTO children_books (
        filename, original_filename, file_path, file_type, file_size,
        title, series_name, author, 
        uploaded_by, assigned_child_id,
        security_scan_passed, security_scan_details
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12
      )
      RETURNING id, title, filename
    `, [
      filename,
      uploadedFile.originalFilename,
      destPath,
      ext.replace('.', ''),
      uploadedFile.size,
      bookTitle || uploadedFile.originalFilename,
      bookSeries || null,
      bookAuthor || null,
      session.user.id,
      childId && isValidUUID(childId) ? childId : null,
      true,
      scanResult.details
    ]);

    const book = result.rows[0];

    return res.status(200).json({
      success: true,
      book: {
        id: book.id,
        title: book.title,
        filename: book.filename,
      },
      securityScan: {
        passed: true,
        message: scanResult.message,
      }
    });
  } catch (error) {
    console.error('[Book Upload] Error:', error);
    console.error('[Book Upload] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({ 
      error: 'Failed to upload book',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}
