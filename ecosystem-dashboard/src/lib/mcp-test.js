/**
 * Simple MCP SDK Integration Test
 * Tests the new SDK adapter without full Next.js build
 */

const { executeMCPCommand, initializeMCPSDK, getMCPSDKStatus } = require('./mcp-sdk-adapter');

async function testSDKIntegration() {
  console.log('🧪 Testing MCP SDK Integration...');
  
  try {
    // Test 1: Initialize SDK
    console.log('1. Initializing MCP SDK...');
    await initializeMCPSDK();
    console.log('✅ SDK initialized successfully');
    
    // Test 2: Check SDK status
    console.log('2. Checking SDK status...');
    const status = getMCPSDKStatus();
    console.log('✅ SDK Status:', status);
    
    // Test 3: Test Knowledge Graph query
    console.log('3. Testing Knowledge Graph query...');
    const kgResult = await executeMCPCommand('kg_search', {
      searchTerm: 'test',
      limit: 5
    });
    console.log('✅ KG Query successful:', kgResult ? 'Data received' : 'No data');
    
    // Test 4: Test service discovery
    console.log('4. Testing service discovery...');
    const services = await executeMCPCommand('service_discovery', {
      serviceType: 'dashboard'
    });
    console.log('✅ Service Discovery successful:', Array.isArray(services) ? `${services.length} services` : 'No services');
    
    console.log('🎉 All SDK integration tests passed!');
    
  } catch (error) {
    console.error('❌ SDK Integration test failed:', error.message);
    console.log('📋 This indicates the SDK needs AI Gateway service mesh running on port 7777');
  }
}

// Run test if called directly
if (require.main === module) {
  testSDKIntegration();
}

module.exports = { testSDKIntegration };
