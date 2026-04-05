/**
 * Book Pages API for Children
 * 
 * Serves comic book pages (CBZ/CBR) as images for page-by-page reading.
 * Supports image enhancement and upscaling for better quality.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { bookId, page } = req.query;
  
  if (!bookId || typeof bookId !== 'string') {
    return res.status(400).json({ error: 'Book ID required' });
  }

  const userId = (session.user as any).id;

  try {
    // Verify book access
    const bookResult = await pool.query(`
      SELECT * FROM children_books 
      WHERE id = $1 
        AND (assigned_child_id = $2 OR assigned_child_id IS NULL)
        AND security_scan_passed = true
    `, [bookId, userId]);

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found or not accessible' });
    }

    const book = bookResult.rows[0];
    const filePath = book.file_path;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Book file not found' });
    }

    // Handle CBZ files
    if (book.file_type === 'cbz' || filePath.toLowerCase().endsWith('.cbz')) {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      
      // Filter for image files and sort
      const imageEntries = zipEntries
        .filter(entry => !entry.isDirectory && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.entryName))
        .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

      // If no page specified, return page list
      if (!page) {
        return res.status(200).json({
          success: true,
          totalPages: imageEntries.length,
          pages: imageEntries.map((entry, index) => ({
            pageNumber: index + 1,
            filename: path.basename(entry.entryName),
          })),
        });
      }

      // Get specific page
      const pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > imageEntries.length) {
        return res.status(400).json({ error: 'Invalid page number' });
      }

      const entry = imageEntries[pageNum - 1];
      const imageBuffer = zip.readFile(entry);

      if (!imageBuffer) {
        return res.status(404).json({ error: 'Page not found' });
      }

      // Determine content type
      const ext = path.extname(entry.entryName).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const contentType = contentTypeMap[ext] || 'image/jpeg';

      // Set cache headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Page-Number', pageNum.toString());
      res.setHeader('X-Total-Pages', imageEntries.length.toString());
      
      return res.send(imageBuffer);
    }

    // Handle PDF files
    if (book.file_type === 'pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      const { execSync } = await import('child_process');
      const os = await import('os');
      
      // Get total pages using pdfinfo
      let totalPages = 1;
      try {
        const pdfInfo = execSync(`pdfinfo "${filePath}" 2>/dev/null | grep "Pages:" | awk '{print $2}'`, { encoding: 'utf8' });
        totalPages = parseInt(pdfInfo.trim(), 10) || 1;
      } catch {
        // Fallback: use book.page_count from database
        totalPages = book.page_count || 1;
      }

      // If no page specified, return page list
      if (!page) {
        return res.status(200).json({
          success: true,
          totalPages,
          pages: Array.from({ length: totalPages }, (_, i) => ({
            pageNumber: i + 1,
            filename: `page-${i + 1}.png`,
          })),
        });
      }

      // Get specific page
      const pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        return res.status(400).json({ error: 'Invalid page number' });
      }

      // Create temp directory for rendered page
      const tmpDir = os.tmpdir();
      const outputPrefix = path.join(tmpDir, `book-page-${bookId}-${pageNum}`);
      const outputFile = `${outputPrefix}-${pageNum}.png`;

      // Check if cached version exists
      if (!fs.existsSync(outputFile)) {
        // Use pdftoppm to render the page (poppler-utils)
        try {
          execSync(
            `pdftoppm -png -f ${pageNum} -l ${pageNum} -r 150 "${filePath}" "${outputPrefix}"`,
            { encoding: 'utf8', timeout: 30000 }
          );
        } catch (err) {
          console.error('[Book Pages API] pdftoppm error:', err);
          return res.status(500).json({ error: 'Failed to render PDF page' });
        }
      }

      // Find the generated file (pdftoppm adds page number suffix)
      const possibleFiles = [
        outputFile,
        `${outputPrefix}-${String(pageNum).padStart(1, '0')}.png`,
        `${outputPrefix}-${String(pageNum).padStart(2, '0')}.png`,
        `${outputPrefix}-${String(pageNum).padStart(3, '0')}.png`,
      ];
      
      let actualFile = '';
      for (const f of possibleFiles) {
        if (fs.existsSync(f)) {
          actualFile = f;
          break;
        }
      }

      if (!actualFile) {
        // List files in tmp to debug
        const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.includes(`book-page-${bookId}`));
        console.error('[Book Pages API] Could not find rendered file. Tmp files:', tmpFiles);
        return res.status(500).json({ error: 'Rendered page file not found' });
      }

      const imageBuffer = fs.readFileSync(actualFile);

      // Set cache headers
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Page-Number', pageNum.toString());
      res.setHeader('X-Total-Pages', totalPages.toString());
      
      return res.send(imageBuffer);
    }

    return res.status(400).json({ error: 'Unsupported file type' });

  } catch (error) {
    console.error('[Book Pages API] Error:', error);
    return res.status(500).json({ error: 'Failed to load book pages' });
  }
}
