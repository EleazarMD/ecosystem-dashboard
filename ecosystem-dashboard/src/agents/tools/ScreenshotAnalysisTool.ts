/**
 * Screenshot Analysis Tool for DashboardAIAgent
 * Enables vision-based analysis using Gemma3 multimodal capabilities
 */

import { screenshotCapture } from '../../utils/screenshotCapture';

export interface ScreenshotAnalysisToolConfig {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: {
      query: {
        type: string;
        description: string;
      };
      captureType: {
        type: string;
        description: string;
        enum: string[];
      };
    };
    required: string[];
  };
}

export interface VisionAnalysisRequest {
  query: string;
  dashboardContext?: any;
  captureType?: 'viewport' | 'fullPage' | 'dashboard' | 'element';
  element?: HTMLElement;
}

export interface VisionAnalysisResponse {
  analysis: string;
  confidence: number;
  visualElements: string[];
  discrepancies?: string[];
  suggestions?: string[];
  metadata: {
    screenshotInfo: any;
    processingTime: number;
    model: string;
  };
}

export class ScreenshotAnalysisTool {
  private aiGatewayUrl: string;
  private apiKey: string;

  constructor() {
    this.aiGatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:8777';
    this.apiKey = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
  }

  /**
   * Analyze dashboard with screenshot + structured data
   */
  async analyzeWithVision(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
    const startTime = Date.now();

    try {
      // 1. Capture screenshot
      console.log('📸 Capturing screenshot for vision analysis...');
      const screenshotData = await this.captureScreenshot(request);

      // 2. Prepare multimodal request
      const visionRequest = this.buildVisionRequest(request, screenshotData);

      // 3. Send to Gemma3 via AI Gateway
      console.log('🧠 Sending vision request to Gemma3...');
      const response = await this.sendVisionRequest(visionRequest);

      // 4. Process and return results
      return this.processVisionResponse(response, screenshotData, startTime);

    } catch (error) {
      console.error('❌ Vision analysis failed:', error);
      throw new Error(`Vision analysis failed: ${error}`);
    }
  }

  /**
   * Capture screenshot based on request type
   */
  private async captureScreenshot(request: VisionAnalysisRequest) {
    const { captureType = 'dashboard', element } = request;

    switch (captureType) {
      case 'viewport':
        return await screenshotCapture.captureViewport();
      case 'fullPage':
        return await screenshotCapture.captureFullPage();
      case 'element':
        if (!element) throw new Error('Element required for element capture');
        return await screenshotCapture.captureElement(element);
      case 'dashboard':
      default:
        return await screenshotCapture.captureDashboardContent();
    }
  }

  /**
   * Build vision request for AI Gateway
   */
  private buildVisionRequest(request: VisionAnalysisRequest, screenshotData: any) {
    const { query, dashboardContext } = request;

    // Construct comprehensive prompt
    const systemPrompt = `You are an AI assistant analyzing a dashboard interface. You have access to both:
1. Structured data about the dashboard state
2. A visual screenshot of the actual interface

Your task is to:
- Analyze what you see in the screenshot
- Compare it with the structured data provided
- Identify any discrepancies or additional visual information
- Provide insights about the dashboard state
- Suggest improvements or highlight issues

Be specific about visual elements you observe.`;

    const userPrompt = `
STRUCTURED DASHBOARD DATA:
${dashboardContext ? JSON.stringify(dashboardContext, null, 2) : 'No structured data provided'}

USER QUERY: ${query}

Please analyze the screenshot and provide:
1. What visual elements you can identify
2. How the visual state compares to the structured data
3. Any discrepancies or additional information from the visual
4. Specific insights about the dashboard's current state
5. Suggestions for improvement or issues to address
`;

    return {
      model: 'mistral:latest',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'image',
              image_url: {
                url: screenshotData.dataUrl
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    };
  }

  /**
   * Send vision request to AI Gateway
   */
  private async sendVisionRequest(visionRequest: any): Promise<any> {
    const response = await fetch(`${this.aiGatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Request-Source': 'dashboard-vision-analysis'
      },
      body: JSON.stringify(visionRequest)
    });

    if (!response.ok) {
      throw new Error(`AI Gateway request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Process vision response
   */
  private processVisionResponse(response: any, screenshotData: any, startTime: number): VisionAnalysisResponse {
    const processingTime = Date.now() - startTime;
    const content = response.choices?.[0]?.message?.content || 'No analysis provided';

    // Extract structured information from response
    const visualElements = this.extractVisualElements(content);
    const discrepancies = this.extractDiscrepancies(content);
    const suggestions = this.extractSuggestions(content);
    const confidence = this.calculateConfidence(response);

    return {
      analysis: content,
      confidence,
      visualElements,
      discrepancies,
      suggestions,
      metadata: {
        screenshotInfo: {
          width: screenshotData.width,
          height: screenshotData.height,
          timestamp: screenshotData.timestamp
        },
        processingTime,
        model: 'mistral:latest'
      }
    };
  }

  /**
   * Extract visual elements from analysis
   */
  private extractVisualElements(content: string): string[] {
    const elements: string[] = [];
    
    // Look for common UI elements mentioned
    const elementPatterns = [
      /charts?/gi,
      /graphs?/gi,
      /buttons?/gi,
      /panels?/gi,
      /metrics?/gi,
      /status indicators?/gi,
      /navigation/gi,
      /sidebar/gi,
      /header/gi,
      /footer/gi
    ];

    elementPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        elements.push(...matches.map(m => m.toLowerCase()));
      }
    });

    return Array.from(new Set(elements)); // Remove duplicates
  }

  /**
   * Extract discrepancies from analysis
   */
  private extractDiscrepancies(content: string): string[] {
    const discrepancies: string[] = [];
    
    // Look for discrepancy indicators
    const discrepancyPatterns = [
      /discrepancy|difference|mismatch|inconsistent/gi,
      /doesn't match|not aligned|differs from/gi,
      /missing|absent|not visible/gi
    ];

    discrepancyPatterns.forEach(pattern => {
      const matches = content.match(new RegExp(`[^.]*${pattern.source}[^.]*`, 'gi'));
      if (matches) {
        discrepancies.push(...matches);
      }
    });

    return discrepancies;
  }

  /**
   * Extract suggestions from analysis
   */
  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    // Look for suggestion indicators
    const suggestionPatterns = [
      /suggest|recommend|should|could improve/gi,
      /consider|might want to|would benefit/gi
    ];

    suggestionPatterns.forEach(pattern => {
      const matches = content.match(new RegExp(`[^.]*${pattern.source}[^.]*`, 'gi'));
      if (matches) {
        suggestions.push(...matches);
      }
    });

    return suggestions;
  }

  /**
   * Calculate confidence based on response quality
   */
  private calculateConfidence(response: any): number {
    // Basic confidence calculation
    const content = response.choices?.[0]?.message?.content || '';
    
    if (content.length < 100) return 0.3;
    if (content.length < 300) return 0.6;
    if (content.length < 600) return 0.8;
    return 0.9;
  }

  /**
   * Quick screenshot analysis for simple queries
   */
  async quickAnalysis(query: string): Promise<string> {
    try {
      const result = await this.analyzeWithVision({
        query,
        captureType: 'dashboard'
      });
      return result.analysis;
    } catch (error) {
      console.error('❌ Quick analysis failed:', error);
      return `I couldn't analyze the visual content due to an error: ${error}`;
    }
  }
}

export default ScreenshotAnalysisTool;
