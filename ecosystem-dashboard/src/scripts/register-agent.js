#!/usr/bin/env node

/**
 * Agent Registration Script
 * 
 * Registers the AI Homelab Dashboard Agent with AHIS server
 * for discoverability by the ADE UI and other ecosystem services.
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Agent configuration
const AGENT_CONFIG = {
  id: 'dashboard-ai-agent',
  name: 'AI Homelab Dashboard Agent',
  type: 'dashboard-agent',
  version: '2.0.0',
  capabilities: [
    'natural_language_processing',
    'system_monitoring',
    'service_management', 
    'knowledge_graph_queries',
    'proactive_insights',
    'conversation_management'
  ],
  protocol_version: '1.0',
  message_formats: ['json', 'text'],
  websocket_endpoint: 'ws://localhost:8404/api/agent/ws',
  health_endpoint: 'http://localhost:8404/api/agent/health',
  metadata: {
    platform: 'dashboard',
    environment: process.env.NODE_ENV || 'development',
    google_adk_compatible: true,
    dashboard_integration: true,
    port: 8404,
    description: 'AI-powered dashboard agent for system monitoring, service management, and intelligent insights',
    tags: ['dashboard', 'monitoring', 'ai-agent', 'google-adk'],
    endpoints: {
      query: 'http://localhost:8404/api/agent/query',
      overview: 'http://localhost:8404/api/agent/overview',
      status: 'http://localhost:8404/api/agent/status',
      health: 'http://localhost:8404/api/agent/health'
    }
  }
};

// Service URLs
const AHIS_URL = process.env.AHIS_URL || 'http://localhost:8888';
const REGISTRATION_ENDPOINT = `${AHIS_URL}/api/agents/register`;

async function registerAgent() {
  try {
    console.log('🤖 Registering AI Homelab Dashboard Agent with AHIS...');
    console.log(`📡 AHIS URL: ${AHIS_URL}`);
    console.log(`🆔 Agent ID: ${AGENT_CONFIG.id}`);
    console.log(`📛 Agent Name: ${AGENT_CONFIG.name}`);
    
    // Check if AHIS is available
    try {
      await axios.get(`${AHIS_URL}/health`, { timeout: 5000 });
      console.log('✅ AHIS server is available');
    } catch (error) {
      console.warn('⚠️  AHIS server may not be available:', error.message);
      console.log('🔄 Proceeding with registration attempt...');
    }

    // Register the agent
    const response = await axios.post(REGISTRATION_ENDPOINT, AGENT_CONFIG, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Homelab-Dashboard-Agent/2.0.0'
      },
      timeout: 10000
    });

    if (response.status === 200 || response.status === 201) {
      console.log('🎉 Agent registration successful!');
      console.log('📋 Registration details:');
      console.log(`   - Agent ID: ${AGENT_CONFIG.id}`);
      console.log(`   - Agent Name: ${AGENT_CONFIG.name}`);
      console.log(`   - Capabilities: ${AGENT_CONFIG.capabilities.length} registered`);
      console.log(`   - Health Endpoint: ${AGENT_CONFIG.health_endpoint}`);
      console.log(`   - WebSocket Endpoint: ${AGENT_CONFIG.websocket_endpoint}`);
      
      if (response.data) {
        console.log('📄 Server response:', JSON.stringify(response.data, null, 2));
      }
      
      console.log('\n🔍 Agent should now be discoverable in:');
      console.log('   - ADE UI Agent Registry');
      console.log('   - AHIS Service Discovery');
      console.log('   - Agent-to-Agent Communication');
      
    } else {
      console.error('❌ Registration failed with status:', response.status);
      console.error('📄 Response:', response.data);
    }

  } catch (error) {
    console.error('❌ Agent registration failed:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('   No response received from AHIS server');
      console.error('   Check if AHIS is running on:', AHIS_URL);
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure AHIS server is running');
    console.log('   2. Check network connectivity');
    console.log('   3. Verify AHIS_URL environment variable');
    console.log('   4. Check AHIS server logs for errors');
    
    process.exit(1);
  }
}

async function checkAgentStatus() {
  try {
    console.log('\n🔍 Checking agent registration status...');
    
    const response = await axios.get(`${AHIS_URL}/api/agents/${AGENT_CONFIG.id}`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ Agent is registered and discoverable');
      console.log('📋 Current status:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Agent not found in registry');
    } else {
      console.warn('⚠️  Could not check agent status:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 AI Homelab Dashboard Agent Registration');
  console.log('==========================================\n');
  
  await registerAgent();
  await checkAgentStatus();
  
  console.log('\n✨ Registration process completed!');
}

// Run the registration
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  registerAgent,
  checkAgentStatus,
  AGENT_CONFIG
};
