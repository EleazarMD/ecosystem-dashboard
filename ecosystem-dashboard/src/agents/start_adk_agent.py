#!/usr/bin/env python3
"""
ADK Dashboard Agent Starter
Launches the ADK v2.0 compliant Dashboard Agent with proper configuration
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

# Load ADK environment configuration
env_path = agents_dir / '.env.adk'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded ADK configuration from {env_path}")
else:
    print(f"⚠️  ADK configuration file not found: {env_path}")

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def check_prerequisites():
    """Check if all required services are available"""
    import requests
    
    services = {
        'Dashboard API': 'http://localhost:8404/api/health',
        'Knowledge Graph': 'http://localhost:8765/health', 
        'AI Gateway': 'http://localhost:8777/health'
    }
    
    print("🔍 Checking prerequisite services...")
    
    for service_name, url in services.items():
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                print(f"✅ {service_name}: Available")
            else:
                print(f"⚠️  {service_name}: Responding but status {response.status_code}")
        except requests.RequestException:
            print(f"❌ {service_name}: Not available ({url})")
    
    print()

def main():
    """Main entry point for ADK Dashboard Agent"""
    print("🤖 AI Homelab Dashboard - ADK v2.0 Agent")
    print("=" * 50)
    
    # Check prerequisites
    check_prerequisites()
    
    try:
        # Import and start the ADK agent
        from DashboardAgentADK import create_dashboard_runner, dashboard_agent
        
        print("🚀 Starting ADK Dashboard Agent...")
        print(f"   Agent Name: {dashboard_agent.name}")
        print(f"   Model: {dashboard_agent.model}")
        print(f"   Tools: {len(dashboard_agent.tools)} available")
        print(f"   Port: {os.getenv('DASHBOARD_PORT', 8405)}")
        print()
        
        # Create and start the runner
        runner = create_dashboard_runner()
        
        print("✅ ADK Dashboard Agent Server is ready!")
        print(f"   Server URL: http://localhost:{os.getenv('DASHBOARD_PORT', 8405)}")
        print(f"   Agent Cards: http://localhost:{os.getenv('DASHBOARD_PORT', 8405)}/agent_cards")
        print(f"   Health Check: http://localhost:{os.getenv('DASHBOARD_PORT', 8405)}/health")
        print(f"   Web Interface: http://localhost:{os.getenv('DASHBOARD_PORT', 8405)}/")
        print()
        print("🎯 ADK Features Available:")
        print("   • Official Google ADK v2.0 compliance")
        print("   • Function-based tool definitions")
        print("   • Session management with state persistence")
        print("   • Agent cards for discovery")
        print("   • Web-based testing interface")
        print("   • Multi-agent orchestration ready")
        print()
        print("Press Ctrl+C to stop the agent server...")
        
        # Start the runner (this blocks)
        runner.run()
        
    except KeyboardInterrupt:
        print("\n👋 Shutting down ADK Dashboard Agent...")
    except Exception as e:
        print(f"❌ Error starting ADK Dashboard Agent: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
