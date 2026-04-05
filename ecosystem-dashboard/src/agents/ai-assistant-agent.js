#!/usr/bin/env node

/**
 * User Interface Intelligence Agent (UI-IA) - Full ADK Compatible Agent
 * 
 * The primary conversational interface agent that serves as the intelligent bridge
 * between users and the AI Homelab ecosystem. Specializes in natural language
 * understanding, intelligent query routing, and multi-domain response synthesis.
 * 
 * Purpose: Provides intelligent conversational AI assistance by understanding user
 * queries, classifying their intent, routing to appropriate specialized agents,
 * and synthesizing coherent responses from multiple data sources.
 * 
 * Role in Ecosystem: Central user interaction hub that coordinates with knowledge
 * graph, infrastructure, metrics, and system agents to provide unified AI assistance.
 * 
 * Port: 41247
 * Agent Type: ui_intelligence_agent
 * Capabilities: natural_language_understanding, intelligent_query_routing, 
 *               multi_domain_synthesis, conversation_management, user_interaction
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class AIAssistantAgent {
    constructor(config = {}) {
        this.config = {
            port: process.env.AI_ASSISTANT_AGENT_PORT || 41247,
            host: process.env.AI_ASSISTANT_AGENT_HOST || '0.0.0.0',
            orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:41240',
            aiGatewayUrl: process.env.AI_GATEWAY_URL || 'http://localhost:8777',
            ...config
        };

        this.app = express();
        this.server = null;
        this.agentId = `ui-intelligence-agent-${uuidv4().substring(0, 8)}`;
        this.agentType = 'ui_intelligence_agent';
        this.agentName = 'User Interface Intelligence Agent';
        this.agentDescription = 'Primary conversational interface agent that bridges users with the AI Homelab ecosystem through intelligent query understanding, routing, and response synthesis';
        this.preferredModel = 'llama3.2:3b'; // Use available model
        this.capabilities = [
            'natural_language_understanding',
            'intelligent_query_routing',
            'multi_domain_synthesis',
            'conversation_management',
            'user_interaction'
        ];

        // Domain routing configuration
        this.domainRoutes = {
            knowledge_graph: {
                endpoint: '/api/knowledge-graph/orchestrate',
                timeout: 25000,
                confidence_threshold: 0.7
            },
            infrastructure: {
                endpoint: '/api/infrastructure/query',
                timeout: 15000,
                confidence_threshold: 0.6
            },
            ai_metrics: {
                endpoint: '/api/ai-metrics/query',
                timeout: 10000,
                confidence_threshold: 0.6
            },
            system_status: {
                endpoint: '/api/system/status',
                timeout: 8000,
                confidence_threshold: 0.5
            },
            general: {
                endpoint: 'ai_gateway_direct',
                timeout: 12000,
                confidence_threshold: 0.3
            }
        };

        this.setupRoutes();
    }

    setupRoutes() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                agentId: this.agentId,
                agentType: this.agentType,
                agentName: this.agentName,
                description: this.agentDescription,
                version: '1.0.0',
                capabilities: this.capabilities,
                preferredModel: this.preferredModel,
                timestamp: new Date().toISOString(),
                domains: Object.keys(this.domainRoutes),
                purpose: 'Primary conversational interface for AI Homelab ecosystem',
                role: 'Central user interaction hub with intelligent query routing'
            });
        });

        // A2A protocol endpoint
        this.app.post('/a2a/message', async (req, res) => {
            try {
                const { from, to, type, payload } = req.body;
                console.log(`📨 AI Assistant A2A message from ${from}: ${type}`);

                const response = await this.handleA2AMessage(from, to, type, payload);
                res.json({ success: true, result: response });

            } catch (error) {
                console.error('❌ A2A message handling failed:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // User interaction endpoint (for dashboard integration)
        this.app.post('/interact', async (req, res) => {
            try {
                const { query, context = {}, options = {} } = req.body;
                
                const result = await this.processUserQuery(query, context, options);
                res.json({ success: true, result });

            } catch (error) {
                console.error('❌ User interaction failed:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Agent capabilities endpoint
        this.app.get('/capabilities', (req, res) => {
            res.json({
                agentId: this.agentId,
                agentType: this.agentType,
                agentName: this.agentName,
                description: this.agentDescription,
                capabilities: this.capabilities,
                domains: Object.keys(this.domainRoutes),
                purpose: 'Primary conversational interface for AI Homelab ecosystem',
                role: 'Central user interaction hub with intelligent query routing',
                specialization: 'Natural language understanding and multi-domain response synthesis',
                endpoints: {
                    health: '/health',
                    a2a: '/a2a/message',
                    interact: '/interact',
                    capabilities: '/capabilities'
                }
            });
        });
    }

    async handleA2AMessage(from, to, type, payload) {
        console.log(`📩 Processing A2A message: ${type} from ${from}`);
        
        switch (type) {
            case 'task_request':
            case 'EXECUTE_TASK':
                return await this.executeTask(payload);
            case 'USER_QUERY':
                return await this.processUserQuery(payload.query, payload.context, payload.options);
            case 'COORDINATION_REQUEST':
                return await this.handleCoordinationRequest(payload);
            case 'AGENT_STATUS':
                return await this.handleAgentStatus(payload);
            default:
                return { success: false, error: `Unknown message type: ${type}` };
        }
    }

    async executeTask(payload) {
        const { task, input, execution_id, step_id, executionId, query, context, phase } = payload;
        const taskType = task || phase || 'user_interaction';
        const taskInput = input || { query, context, executionId };
        
        console.log(`🔄 UI Intelligence Agent executing task: ${taskType} (${execution_id || executionId}/${step_id || 'default'})`);
        
        try {
            let result;
            
            switch (taskType) {
                case 'user_interaction':
                case 'query_processing':
                    result = await this.processUserQuery(taskInput.query, taskInput.context);
                    break;
                case 'domain_routing':
                    result = await this.routeQuery(taskInput.query, taskInput.context);
                    break;
                case 'response_synthesis':
                    result = await this.synthesizeResponse(taskInput);
                    break;
                default:
                    throw new Error(`Unknown task: ${taskType}`);
            }

            return {
                success: true,
                task: taskType,
                result,
                execution_id: execution_id || executionId,
                step_id,
                agent_id: this.agentId,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Task execution failed: ${taskType}`, error);
            return {
                success: false,
                task: taskType,
                error: error.message,
                execution_id: execution_id || executionId,
                step_id,
                agent_id: this.agentId
            };
        }
    }

    async processUserQuery(query, context = {}, options = {}) {
        console.log(`🤖 UI Intelligence Agent processing user query: ${query}`);
        
        try {
            // Step 1: Classify query domain and intent
            const classification = await this.classifyQuery(query);
            console.log(`🧠 Query classified:`, classification);

            // Step 2: Route to appropriate domain handler
            const routingResult = await this.routeQuery(query, context, classification);
            console.log(`🎯 Routing result:`, routingResult);

            // Step 3: Synthesize final response
            const response = await this.synthesizeResponse({
                query,
                context,
                classification,
                routingResult,
                options
            });

            return {
                query,
                classification,
                routing: routingResult,
                response,
                metadata: {
                    agent_id: this.agentId,
                    domain: classification.domain,
                    confidence: classification.confidence,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ User query processing failed:', error);
            return {
                query,
                error: error.message,
                response: {
                    content: `I encountered an error processing your query: ${error.message}`,
                    confidence: 0.1,
                    source: 'error_handler'
                },
                metadata: {
                    agent_id: this.agentId,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    async classifyQuery(query) {
        console.log('🧠 Classifying query with AI Gateway');
        
        try {
            const classificationPrompt = `
Analyze this user query and classify it for optimal routing in an AI Homelab system:

Query: "${query}"

Respond with JSON only:
{
  "domain": "knowledge_graph|infrastructure|ai_metrics|system_status|general",
  "confidence": 0.0-1.0,
  "intent": "brief description of user intent",
  "entities": ["key entities mentioned"],
  "requiresData": true/false,
  "urgency": "low|medium|high"
}

Domain Guidelines:
- knowledge_graph: IDE memories, documentation, code analysis, project data
- infrastructure: Kubernetes, containers, services, deployments, health
- ai_metrics: AI Gateway usage, model performance, inference stats  
- system_status: Service health, connectivity, system diagnostics
- general: Weather, casual conversation, non-system queries
`;

            const response = await axios.post(`${this.config.aiGatewayUrl}/api/v1/chat/completions`, {
                model: this.preferredModel,
                messages: [{ role: 'user', content: classificationPrompt }],
                max_tokens: 200,
                temperature: 0.1
            }, {
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-Key': 'ai-gateway-api-key-2024'
                },
                timeout: 10000
            });

            const content = response.data.choices?.[0]?.message?.content || response.data.message?.content;
            
            try {
                const classification = JSON.parse(content);
                return {
                    domain: classification.domain || 'general',
                    confidence: classification.confidence || 0.5,
                    intent: classification.intent || 'unknown',
                    entities: classification.entities || [],
                    requiresData: classification.requiresData || false,
                    urgency: classification.urgency || 'medium'
                };
            } catch (parseError) {
                console.warn('⚠️ Failed to parse classification, using fallback');
                return this.fallbackClassification(query);
            }

        } catch (error) {
            console.error('❌ Query classification failed:', error);
            return this.fallbackClassification(query);
        }
    }

    fallbackClassification(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('memor') || lowerQuery.includes('ide') || lowerQuery.includes('code')) {
            return { domain: 'knowledge_graph', confidence: 0.7, intent: 'memory query', entities: [], requiresData: true, urgency: 'medium' };
        } else if (lowerQuery.includes('kubernetes') || lowerQuery.includes('container') || lowerQuery.includes('service')) {
            return { domain: 'infrastructure', confidence: 0.7, intent: 'infrastructure query', entities: [], requiresData: true, urgency: 'medium' };
        } else if (lowerQuery.includes('ai') || lowerQuery.includes('gateway') || lowerQuery.includes('model')) {
            return { domain: 'ai_metrics', confidence: 0.6, intent: 'ai metrics query', entities: [], requiresData: true, urgency: 'low' };
        } else if (lowerQuery.includes('health') || lowerQuery.includes('status') || lowerQuery.includes('system')) {
            return { domain: 'system_status', confidence: 0.6, intent: 'status query', entities: [], requiresData: true, urgency: 'high' };
        } else {
            return { domain: 'general', confidence: 0.5, intent: 'general query', entities: [], requiresData: false, urgency: 'low' };
        }
    }

    async routeQuery(query, context = {}, classification) {
        const domain = classification.domain;
        const route = this.domainRoutes[domain];
        
        if (!route) {
            throw new Error(`Unknown domain: ${domain}`);
        }

        console.log(`🎯 Routing ${domain} query to: ${route.endpoint}`);

        try {
            if (route.endpoint === 'ai_gateway_direct') {
                // Direct AI Gateway call for general queries
                const response = await axios.post(`${this.config.aiGatewayUrl}/api/v1/chat/completions`, {
                    model: this.preferredModel,
                    messages: [{ role: 'user', content: query }],
                    max_tokens: 500
                }, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-API-Key': 'ai-gateway-api-key-2024'
                    },
                    timeout: route.timeout
                });

                const content = response.data.choices?.[0]?.message?.content || response.data.message?.content;
                return {
                    success: true,
                    content,
                    source: 'ai_gateway_direct',
                    confidence: 0.8
                };
            } else {
                // Route to domain-specific API
                const response = await axios.post(`http://localhost:8404${route.endpoint}`, {
                    query,
                    classification,
                    context: {
                        ...context,
                        agent_source: this.agentId,
                        domain,
                        confidence: classification.confidence
                    },
                    options: {
                        timeout: route.timeout,
                        includeEvidence: classification.requiresData
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: route.timeout
                });

                return {
                    success: response.data.success,
                    content: response.data.content || response.data.result?.summary,
                    data: response.data.data,
                    source: domain,
                    confidence: response.data.confidence || classification.confidence
                };
            }

        } catch (error) {
            console.error(`❌ Routing failed for ${domain}:`, error);
            
            // Fallback to AI Gateway for any domain
            try {
                const fallbackResponse = await axios.post(`${this.config.aiGatewayUrl}/api/v1/chat/completions`, {
                    model: this.preferredModel,
                    messages: [{ role: 'user', content: query }],
                    max_tokens: 500
                }, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-API-Key': 'ai-gateway-api-key-2024'
                    },
                    timeout: 10000
                });

                const content = fallbackResponse.data.choices?.[0]?.message?.content || fallbackResponse.data.message?.content;
                return {
                    success: true,
                    content,
                    source: 'ai_gateway_fallback',
                    confidence: 0.6,
                    fallback_reason: error.message
                };
            } catch (fallbackError) {
                throw new Error(`Both primary and fallback routing failed: ${error.message}`);
            }
        }
    }

    async synthesizeResponse(input) {
        const { query, classification, routingResult, options = {} } = input;
        
        if (!routingResult.success) {
            return {
                content: `I couldn't process your ${classification.domain} query. ${routingResult.error || 'Please try again.'}`,
                confidence: 0.2,
                source: 'error_synthesis',
                metadata: {
                    domain: classification.domain,
                    error: true
                }
            };
        }

        return {
            content: routingResult.content,
            confidence: routingResult.confidence,
            source: routingResult.source,
            data: routingResult.data,
            metadata: {
                domain: classification.domain,
                intent: classification.intent,
                entities: classification.entities,
                agent_id: this.agentId,
                routing_source: routingResult.source
            }
        };
    }

    async handleCoordinationRequest(payload) {
        const { requestType, data } = payload;
        
        switch (requestType) {
            case 'agent_discovery':
                return {
                    success: true,
                    agent: {
                        agentId: this.agentId,
                        agentType: this.agentType,
                        capabilities: this.capabilities,
                        domains: Object.keys(this.domainRoutes)
                    }
                };
            case 'capability_query':
                return {
                    success: true,
                    capabilities: this.capabilities,
                    domains: Object.keys(this.domainRoutes)
                };
            default:
                return { success: false, error: 'Unknown coordination request type' };
        }
    }

    async handleAgentStatus(payload) {
        return {
            success: true,
            status: 'healthy',
            agentId: this.agentId,
            capabilities: this.capabilities,
            timestamp: new Date().toISOString()
        };
    }

    async registerWithOrchestrator() {
        try {
            await axios.post(`${this.config.orchestratorUrl}/agents/register`, {
                agentId: this.agentId,
                agentType: this.agentType,
                url: `http://${this.config.host}:${this.config.port}`,
                capabilities: this.capabilities
            });
            console.log('✅ UI Intelligence Agent registered with Orchestrator');
        } catch (error) {
            console.warn('⚠️ Failed to register with Orchestrator:', error.message);
        }
    }

    async start() {
        try {
            this.server = this.app.listen(this.config.port, this.config.host, () => {
                console.log(`🤖 UI Intelligence Agent started on port ${this.config.port}`);
                console.log(`📡 A2A endpoint: http://${this.config.host}:${this.config.port}/a2a/message`);
                console.log(`👤 User interaction: http://${this.config.host}:${this.config.port}/interact`);
                console.log(`🏥 Health check: http://${this.config.host}:${this.config.port}/health`);
            });

            setTimeout(() => this.registerWithOrchestrator(), 2000);

            process.on('SIGINT', () => this.shutdown());
            process.on('SIGTERM', () => this.shutdown());

        } catch (error) {
            console.error('❌ Failed to start AI Assistant Agent:', error);
            throw error;
        }
    }

    async shutdown() {
        console.log('🛑 Shutting down UI Intelligence Agent...');
        
        if (this.server) {
            this.server.close(() => {
                console.log('✅ UI Intelligence Agent server closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    }
}

if (require.main === module) {
    const aiAssistantAgent = new AIAssistantAgent();
    aiAssistantAgent.start().catch(error => {
        console.error('Failed to start AI Assistant Agent:', error);
        process.exit(1);
    });
}

module.exports = AIAssistantAgent;
