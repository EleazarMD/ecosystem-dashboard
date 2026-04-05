/**
 * Vision Analysis Tool - ADK Tool Interface
 * Enables the agent to intelligently decide when to use vision analysis
 */

import { screenshotCapture } from '../../utils/screenshotCapture';
import { AIGatewayClient } from '../../lib/ai-gateway-client';

export class VisionAnalysisTool {
  name = 'analyze_dashboard_visually';
  description = 'Capture and analyze visual elements of the dashboard interface. Use this when users ask about colors, visual appearance, UI elements, charts, graphs, or when you need to validate structured data against actual visual state.';
  
  input_schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The specific question or analysis request about visual elements'
      },
      captureType: {
        type: 'string',
        description: 'Type of screenshot to capture',
        enum: ['dashboard', 'viewport', 'fullPage'],
        default: 'dashboard'
      }
    },
    required: ['query']
  };

  output_schema = {
    type: 'object',
    properties: {
      analysis: {
        type: 'string',
        description: 'Visual analysis results'
      },
      confidence: {
        type: 'number',
        description: 'Confidence score between 0 and 1'
      },
      visualElements: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of visual elements identified'
      }
    }
  };

  private aiGatewayClient: AIGatewayClient;

  constructor() {
    this.aiGatewayClient = new AIGatewayClient({
      apiKey: process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
      baseUrl: process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:8777'
    });
  }

  async execute(context: any, parameters: Record<string, any>): Promise<{
    analysis: string;
    confidence: number;
    visualElements: string[];
    metadata: any;
  }> {
    const { query, captureType = 'dashboard' } = parameters;
    const dashboardContext = context?.state?.currentContext?.dashboardContext;
    const startTime = Date.now();

    try {
      console.log('📸 VisionAnalysisTool: Capturing screenshot for analysis...');
      
      // Check if we're on client side
      if (!screenshotCapture) {
        throw new Error('Screenshot capture is only available on the client side');
      }

      // Capture screenshot
      let screenshotData;
      switch (captureType) {
        case 'viewport':
          screenshotData = await screenshotCapture.captureViewport();
          break;
        case 'fullPage':
          screenshotData = await screenshotCapture.captureFullPage();
          break;
        case 'dashboard':
        default:
          screenshotData = await screenshotCapture.captureDashboardContent();
          break;
      }

      console.log('🔍 VisionAnalysisTool: Screenshot captured', {
        width: screenshotData.width,
        height: screenshotData.height,
        size: `${Math.round(screenshotData.blob.size / 1024)}KB`
      });

      // Check if image exceeds AI Gateway 10MB limit
      if (screenshotData.blob.size > 9 * 1024 * 1024) { // 9MB safety margin
        throw new Error(`Screenshot too large: ${Math.round(screenshotData.blob.size / (1024 * 1024))}MB exceeds AI Gateway limit of 10MB`);
      }

      // Prepare vision request with proper typing
      const visionRequest = {
        model: 'mistral:latest' as const,
        messages: [
          {
            role: 'system' as const,
            content: `You are an AI assistant with vision capabilities analyzing a dashboard interface. You can see both structured data and visual elements.

Your task is to analyze the visual content and provide accurate information about what you observe.

Focus on:
- Visual elements (colors, layouts, charts, buttons, text)
- UI state and appearance
- Comparing visual reality with any provided structured data
- Identifying specific visual details requested

Be precise and factual about what you can actually see in the image.`
            },
            {
              role: 'user' as const,
              content: [
                {
                  type: 'text' as const,
                  text: `STRUCTURED DASHBOARD DATA:
${dashboardContext ? JSON.stringify(dashboardContext, null, 2) : 'No structured data provided'}

VISUAL ANALYSIS REQUEST: ${query}

Please analyze the screenshot and provide specific details about what you can visually observe.`
                },
                {
                  type: 'image' as const,
                  image_url: {
                    url: screenshotData.dataUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        };

        // Use Llama 3.2 Vision for analysis - Meta's latest vision model
        console.log('🧠 VisionAnalysisTool: Using Llama 3.2 Vision for analysis...');
        
        // Extract base64 from data URL
        const base64Data = screenshotData.dataUrl.split(',')[1];
        
        const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3.2-vision:11b',
            messages: [
              {
                role: 'user',
                content: `Analyze this dashboard interface image. Be confident and specific in your observations.

STRUCTURED DASHBOARD DATA:
${dashboardContext ? JSON.stringify(dashboardContext, null, 2) : 'No structured data provided'}

VISUAL ANALYSIS REQUEST: ${query}

Focus on:
- Exact colors of UI elements (buttons, bars, indicators)
- Precise locations and layout details
- Clear identification of interactive elements
- Actionable information for user guidance

Be direct and confident about what you see.`,
                images: [base64Data]
              }
            ],
            stream: false,
            options: {
              temperature: 0.1,
              num_predict: 1000,
              top_p: 0.9
            }
          })
        });

        if (!ollamaResponse.ok) {
          throw new Error(`Direct Ollama request failed: ${ollamaResponse.status}`);
        }

        const ollamaResult = await ollamaResponse.json();
        const analysis = ollamaResult.message?.content || 'No visual analysis provided';
        
        // Extract visual elements mentioned
        const visualElements = this.extractVisualElements(analysis);
        
        const processingTime = Date.now() - startTime;
        const confidence = this.calculateConfidence(analysis);

        console.log('✅ VisionAnalysisTool: Analysis completed', {
          confidence: `${(confidence * 100).toFixed(1)}%`,
          processingTime: `${processingTime}ms`,
          visualElements: visualElements.length
        });

      return {
        analysis,
        confidence,
        visualElements,
        metadata: {
          screenshotInfo: {
            width: screenshotData.width,
            height: screenshotData.height,
            timestamp: screenshotData.timestamp
          },
          processingTime,
          model: 'llama3.2-vision:11b',
          captureType
        }
      };

    } catch (error) {
      console.error('❌ VisionAnalysisTool error:', error);
      throw new Error(`Vision analysis failed: ${error}`);
    }
  }

  private extractVisualElements(content: string): string[] {
    const elements: string[] = [];
    
    // Look for visual elements mentioned
    const elementPatterns = [
      /blue|red|green|yellow|orange|purple|pink|gray|black|white/gi,
      /chart|graph|bar|button|panel|header|footer|sidebar/gi,
      /text|label|icon|image|logo/gi
    ];

    elementPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        elements.push(...matches.map(m => m.toLowerCase()));
      }
    });

    return Array.from(new Set(elements));
  }

  private calculateConfidence(analysis: string): number {
    if (analysis.length < 50) return 0.3;
    if (analysis.length < 150) return 0.6;
    if (analysis.length < 300) return 0.8;
    return 0.9;
  }
}

export default VisionAnalysisTool;
