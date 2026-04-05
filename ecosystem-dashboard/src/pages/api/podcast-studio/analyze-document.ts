import { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';

// Dynamic import for pdf-parse to avoid ESM issues
let pdfParse: any = null;
const getPdfParse = async () => {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  return pdfParse;
};

// Use Gemini for document analysis (best for multimodal/PDF)
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

// AI Gateway for fallback
const AI_GATEWAY_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_AI_CLIENT_URL || 'http://localhost:8777';

// Simple in-memory cache for document analysis
const analysisCache = new Map<string, any>();

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  maxDuration: 300, // 5 minutes for large documents
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, title, type, fileData, fileName, analysisModel = 'gemini-2-5-flash' } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'File data and filename are required' });
    }

    console.log(`📄 Analyzing document: ${fileName} (${type})`);

    // Generate cache key from file content hash
    const contentHash = createHash('md5').update(fileData.substring(0, 10000)).digest('hex');
    const cacheKey = `${contentHash}-${fileName}`;

    // Check cache first
    if (analysisCache.has(cacheKey)) {
      console.log(`⚡ Cache hit for: ${fileName}`);
      const cached = analysisCache.get(cacheKey);
      return res.status(200).json({
        ...cached,
        cached: true,
      });
    }

    // Extract base64 data
    const base64Match = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({ error: 'Invalid file data format' });
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];

    // Determine if this is a PDF or text document
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    let analysisResult;

    try {
      if (isPdf) {
        // Use AI Gateway with Qwen3-32B for PDF analysis (consistent with script generation)
        console.log('📄 Using AI Gateway (Qwen3-32B) for PDF analysis');
        analysisResult = await analyzeWithAIGateway(base64Data, mimeType, fileName, title);
      } else {
        // For non-PDF documents, extract text directly
        analysisResult = await analyzeTextDocument(base64Data, mimeType, fileName, title);
      }
    } catch (analysisError) {
      console.error('Analysis function error, using basic fallback:', analysisError);
      // Ultimate fallback - just estimate from file size
      analysisResult = {
        materialId: `mat-${Date.now()}`,
        summary: `Document: ${title || fileName}. Ready for podcast generation.`,
        wordCount: Math.round((base64Data.length * 3) / 4 / 6),
        pageCount: 1,
        keyTopics: [],
      };
    }

    // Cache the result
    analysisCache.set(cacheKey, analysisResult);

    // Limit cache size
    if (analysisCache.size > 100) {
      const firstKey = analysisCache.keys().next().value;
      if (firstKey) analysisCache.delete(firstKey);
    }

    console.log(`✅ Analysis complete: ${analysisResult.wordCount} words, ${analysisResult.pageCount} pages`);

    return res.status(200).json({
      ...analysisResult,
      cached: false,
    });

  } catch (error) {
    console.error('❌ Document analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function analyzeWithGemini(base64Data: string, mimeType: string, fileName: string, title: string) {
  const modelId = 'gemini-2.0-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;

  // Also extract text from PDF for script generation (Gemini summary alone isn't enough)
  let extractedText = '';
  let actualPageCount = 1;
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  
  if (isPdf) {
    try {
      const pdfParseLib = await getPdfParse();
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const pdfData = await pdfParseLib(pdfBuffer);
      extractedText = pdfData.text || '';
      actualPageCount = pdfData.numpages || 1;
      console.log(`📄 [Gemini path] Extracted ${extractedText.length} chars from ${actualPageCount} pages`);
    } catch (pdfError) {
      console.warn('PDF text extraction failed in Gemini path:', pdfError);
    }
  }

  const prompt = `Analyze this document and provide:
1. A brief summary (2-3 sentences)
2. Estimated word count
3. Estimated page count
4. Key topics (3-5 topics)

Document title: ${title || fileName}

Respond in this exact JSON format:
{
  "summary": "Brief summary here",
  "wordCount": 1234,
  "pageCount": 5,
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Calculate actual word count from extracted text if available
  const actualWordCount = extractedText ? extractedText.split(/\s+/).filter(w => w.length > 0).length : 0;

  // Parse JSON from response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        materialId: `mat-${Date.now()}`,
        summary: parsed.summary || 'Document analyzed successfully',
        wordCount: actualWordCount || parsed.wordCount || estimateWordCount(base64Data),
        pageCount: actualPageCount || parsed.pageCount || 1,
        keyTopics: parsed.keyTopics || [],
        extractedText: extractedText,
        content: extractedText, // Alias for frontend compatibility
      };
    } catch (e) {
      console.warn('Failed to parse Gemini JSON response');
    }
  }

  // Fallback
  return {
    materialId: `mat-${Date.now()}`,
    summary: textContent.substring(0, 300) || 'Document analyzed',
    wordCount: actualWordCount || estimateWordCount(base64Data),
    pageCount: actualPageCount || 1,
    keyTopics: [],
    extractedText: extractedText,
    content: extractedText, // Alias for frontend compatibility
  };
}

async function analyzeWithAIGateway(base64Data: string, mimeType: string, fileName: string, title: string) {
  // Use AI Gateway with Qwen3-32B for PDF analysis
  // First extract text from PDF, then send to Qwen3-32B for analysis
  
  try {
    // Extract text from PDF using pdf-parse
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    console.log(`📄 [analyzeWithAIGateway] PDF buffer size: ${pdfBuffer.length} bytes`);
    
    let extractedText = '';
    let pageCount = 1;
    
    try {
      const pdfParseLib = await getPdfParse();
      console.log(`📄 [analyzeWithAIGateway] pdf-parse library loaded, parsing PDF...`);
      const pdfData = await pdfParseLib(pdfBuffer);
      extractedText = pdfData.text || '';
      pageCount = pdfData.numpages || 1;
      console.log(`📄 [analyzeWithAIGateway] ✅ Extracted ${extractedText.length} chars from ${pageCount} pages`);
      
      // Log first 500 chars to verify extraction worked
      if (extractedText.length > 0) {
        console.log(`📄 [analyzeWithAIGateway] First 500 chars: ${extractedText.substring(0, 500).replace(/\n/g, ' ')}`);
      } else {
        console.warn(`📄 [analyzeWithAIGateway] ⚠️ PDF parsed but no text extracted - may be image-based PDF`);
      }
    } catch (pdfError: any) {
      console.error('❌ [analyzeWithAIGateway] PDF parsing failed:', pdfError.message || pdfError);
      console.error('❌ [analyzeWithAIGateway] Stack:', pdfError.stack);
    }
    
    // If pdf-parse failed, returned empty, or returned suspiciously little text, try Tesseract OCR fallback
    // A typical PDF with text should have ~5-6 chars per word, so 100 words = ~500-600 chars minimum
    const extractedTextTrimmed = extractedText.trim();
    const isTextTooShort = extractedTextTrimmed.length < 100; // Less than ~20 words
    
    if (isTextTooShort || !extractedTextTrimmed) {
      console.log(`📄 [analyzeWithAIGateway] Text too short (${extractedTextTrimmed.length} chars), attempting Tesseract OCR fallback...`);
      try {
        const ocrResult = await extractTextWithTesseract(base64Data, mimeType, fileName);
        if (ocrResult.text && ocrResult.text.length > extractedTextTrimmed.length) {
          extractedText = ocrResult.text;
          pageCount = ocrResult.pageCount || pageCount;
          console.log(`📄 [analyzeWithAIGateway] ✅ Tesseract OCR extracted ${extractedText.length} chars (better than pdf-parse)`);
        } else {
          console.log(`📄 [analyzeWithAIGateway] Tesseract OCR didn't improve results, keeping pdf-parse output`);
        }
      } catch (ocrError: any) {
        console.error('❌ [analyzeWithAIGateway] Tesseract OCR fallback failed:', ocrError.message);
      }
    }
    
    // Truncate text if too long (keep first 15000 chars for analysis)
    const textForAnalysis = extractedText.substring(0, 15000);
    const actualWordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;
    
    const prompt = `Analyze this PDF document and provide a structured analysis.

Document title: ${title || fileName}
Document filename: ${fileName}
Extracted page count: ${pageCount}
Extracted word count: ${actualWordCount}

${textForAnalysis ? `Document content (first portion):
---
${textForAnalysis}
---` : 'No text could be extracted from this PDF.'}

Provide your analysis in this exact JSON format:
{
  "summary": "Brief 2-3 sentence summary of the document's main content and purpose",
  "wordCount": ${actualWordCount || 1500},
  "pageCount": ${pageCount},
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
}

Respond with ONLY the JSON object, no other text.`;

    const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ecosystem-dashboard-ai-key'}`
      },
      body: JSON.stringify({
        model: 'qwen3-32b', // Use Qwen3-32B for consistency with podcast generation
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (response.ok) {
      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            materialId: `mat-${Date.now()}`,
            summary: parsed.summary || 'Document analyzed successfully',
            wordCount: parsed.wordCount || actualWordCount || estimateWordCount(base64Data),
            pageCount: parsed.pageCount || pageCount || 1,
            keyTopics: parsed.keyTopics || [],
            // Include the full extracted text for script generation
            extractedText: extractedText,
            content: extractedText, // Alias for frontend compatibility
          };
        } catch (e) {
          console.warn('Failed to parse AI Gateway JSON response');
        }
      }
    } else {
      console.warn('AI Gateway request failed, falling back to basic analysis');
    }
    
    // If AI analysis failed but we have extracted text, still return it
    if (extractedText) {
      return {
        materialId: `mat-${Date.now()}`,
        summary: extractedText.substring(0, 500) + '...',
        wordCount: actualWordCount,
        pageCount: pageCount,
        keyTopics: [],
        extractedText: extractedText,
        content: extractedText, // Alias for frontend compatibility
      };
    }
  } catch (error) {
    console.warn('AI Gateway error, falling back to basic analysis:', error);
  }

  // Fallback: use extracted PDF data if available, otherwise estimate from file size
  // Try to extract text from PDF one more time for the fallback
  let fallbackWordCount = estimateWordCount(base64Data);
  let fallbackPageCount = 1;
  let fallbackSummary = `PDF document: ${title || fileName}. Upload successful - content ready for podcast generation.`;
  
  let fallbackExtractedText = '';
  
  try {
    const pdfParseLib = await getPdfParse();
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    const pdfData = await pdfParseLib(pdfBuffer);
    fallbackExtractedText = pdfData.text || '';
    fallbackWordCount = fallbackExtractedText.split(/\s+/).filter((w: string) => w.length > 0).length || fallbackWordCount;
    fallbackPageCount = pdfData.numpages || 1;
    if (fallbackExtractedText.length > 50) {
      fallbackSummary = fallbackExtractedText.substring(0, 300).trim() + '...';
    }
  } catch (e) {
    console.warn('Fallback PDF parsing also failed');
  }

  return {
    materialId: `mat-${Date.now()}`,
    summary: fallbackSummary,
    wordCount: fallbackWordCount,
    pageCount: fallbackPageCount,
    keyTopics: [],
    extractedText: fallbackExtractedText,
    content: fallbackExtractedText, // Alias for frontend compatibility
  };
}

async function analyzeTextDocument(base64Data: string, mimeType: string, fileName: string, title: string) {
  // Decode base64 to text for non-PDF documents
  let textContent = '';
  
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    textContent = buffer.toString('utf-8');
  } catch (e) {
    console.warn('Could not decode document as text');
  }

  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 300)); // ~300 words per page estimate

  return {
    materialId: `mat-${Date.now()}`,
    summary: textContent.substring(0, 300).trim() + (textContent.length > 300 ? '...' : ''),
    wordCount,
    pageCount,
    keyTopics: [],
    extractedText: textContent,
    content: textContent, // Alias for frontend compatibility
  };
}

function estimateWordCount(base64Data: string): number {
  // Rough estimate based on base64 size
  // Base64 is ~33% larger than original, and average word is ~5 chars
  const estimatedBytes = (base64Data.length * 3) / 4;
  return Math.round(estimatedBytes / 6);
}

/**
 * Use Tesseract OCR to extract text from image-based PDFs
 * This is a fallback when pdf-parse fails to extract text
 */
async function extractTextWithTesseract(base64Data: string, mimeType: string, fileName: string): Promise<{ text: string; pageCount: number }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  
  const execAsync = promisify(exec);
  
  // Create temp directory for processing
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-ocr-'));
  const pdfPath = path.join(tempDir, 'input.pdf');
  
  try {
    // Write PDF to temp file
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log(`📄 [Tesseract OCR] Processing PDF: ${pdfBuffer.length} bytes`);
    
    // Convert PDF to images using pdftoppm (from poppler-utils)
    const imagesDir = path.join(tempDir, 'images');
    fs.mkdirSync(imagesDir);
    
    await execAsync(`pdftoppm -png "${pdfPath}" "${imagesDir}/page"`, { timeout: 120000 });
    
    // Get list of generated images
    const imageFiles = fs.readdirSync(imagesDir)
      .filter((f: string) => f.endsWith('.png'))
      .sort();
    
    console.log(`📄 [Tesseract OCR] Converted to ${imageFiles.length} page images`);
    
    // Run Tesseract on each image
    let allText = '';
    for (const imageFile of imageFiles) {
      const imagePath = path.join(imagesDir, imageFile);
      try {
        const { stdout } = await execAsync(`tesseract "${imagePath}" stdout -l eng`, { timeout: 60000 });
        allText += stdout + '\n\n';
      } catch (ocrError: any) {
        console.warn(`⚠️ [Tesseract OCR] Failed on ${imageFile}:`, ocrError.message);
      }
    }
    
    console.log(`📄 [Tesseract OCR] ✅ Extracted ${allText.length} chars from ${imageFiles.length} pages`);
    
    return {
      text: allText.trim(),
      pageCount: imageFiles.length,
    };
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}
