import { NextApiRequest, NextApiResponse } from 'next';

// Use local vLLM directly (AI Inferencing Service doesn't have chat completions endpoint mounted)
const VLLM_URL = process.env.VLLM_URL || 'http://localhost:8010/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { materialId, title, content } = req.body;

    if (!content || !title) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    console.log(`📝 Generating summary for: ${title}`);
    console.log(`🔌 Using local vLLM: ${VLLM_URL}`);

    // Call local vLLM directly
    const aiResponse = await fetch(`${VLLM_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in creating concise, informative summaries of research materials for podcast production.

Your task is to analyze the given document and extract:
1. A brief summary (2-3 sentences)
2. Key points (3-5 main takeaways)
3. Main themes/topics (3-5 themes)

Format your response as JSON with this exact structure:
{
  "summary": "Brief 2-3 sentence summary",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "mainThemes": ["Theme 1", "Theme 2", "Theme 3"]
}

Be concise, factual, and focus on the most important information for podcast creators.`
          },
          {
            role: 'user',
            content: `Please analyze this research material and provide a summary:

Title: ${title}

Content:
${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ AI Config Request error:', aiResponse.status, errorData);
      throw new Error(errorData.error || `Failed to generate summary: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract response content from OpenAI-compatible response format
    const assistantResponse = aiData.choices?.[0]?.message?.content;

    if (!assistantResponse) {
      console.error('Invalid AI response format:', JSON.stringify(aiData, null, 2));
      throw new Error('Invalid AI Inferencing response format');
    }

    // Parse JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = assistantResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from text
        parsedResponse = {
          summary: assistantResponse.substring(0, 200),
          keyPoints: assistantResponse.split('\n').filter(line => line.trim().length > 20).slice(0, 5),
          mainThemes: ['Analysis', 'Research', 'Findings']
        };
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response as JSON, using fallback structure');
      parsedResponse = {
        summary: assistantResponse.substring(0, 200),
        keyPoints: assistantResponse.split('\n').filter(line => line.trim().length > 20).slice(0, 5),
        mainThemes: ['Analysis', 'Research', 'Findings']
      };
    }

    console.log(`✅ Summary generated for: ${title}`);

    res.json({
      success: true,
      materialId,
      summary: parsedResponse.summary || 'Summary generated successfully',
      keyPoints: parsedResponse.keyPoints || [],
      mainThemes: parsedResponse.mainThemes || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Summary generation error:', error);

    let errorMessage = 'Failed to generate summary';
    let statusCode = 500;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = `AI Inferencing service is offline (${AI_INFERENCING_URL}). Please ensure the service is running.`;
      statusCode = 503;
    } else if (error.response?.status === 503) {
      errorMessage = 'AI Inferencing service is temporarily unavailable';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Summary generation timed out. Please try again with a shorter document.';
      statusCode = 408;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
