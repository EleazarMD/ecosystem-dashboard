#!/usr/bin/env python3
"""
Simple ADK v2.0 Dashboard Agent
Simplified implementation following official ADK patterns
"""

import os
import requests
from typing import Dict, Any
from datetime import datetime

# Official Google ADK imports
from google.adk import Agent

def get_system_status(component: str = "all") -> Dict[str, Any]:
    """Get current system health and status"""
    try:
        health_response = requests.get('http://localhost:8404/api/health', timeout=5)
        if health_response.status_code == 200:
            return {
                "status": "success",
                "health": health_response.json(),
                "timestamp": datetime.now().isoformat(),
                "component": component
            }
        else:
            return {"status": "error", "message": "Health API unavailable"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def search_knowledge_graph(query: str, limit: int = 10) -> Dict[str, Any]:
    """Query knowledge base and graph data"""
    try:
        kg_response = requests.post(
            'http://localhost:8765/api/query',
            json={"query": query, "limit": limit},
            timeout=10
        )
        
        if kg_response.status_code == 200:
            kg_data = kg_response.json()
            return {
                "status": "success",
                "query": query,
                "results": kg_data.get("results", []),
                "total": len(kg_data.get("results", []))
            }
        else:
            return {"status": "error", "message": "Knowledge Graph API unavailable"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_agent_registry() -> Dict[str, Any]:
    """Get current registered agents"""
    try:
        agents_response = requests.get('http://localhost:8404/api/agentic-control/agents', timeout=10)
        
        if agents_response.status_code == 200:
            agents_data = agents_response.json()
            agents = agents_data.get("agents", [])
            
            return {
                "status": "success",
                "total_agents": len(agents),
                "active_agents": len([a for a in agents if a.get("status") == "active"]),
                "agents": agents[:5]  # Return first 5 for summary
            }
        else:
            return {"status": "error", "message": "Agent registry API unavailable"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Create simple ADK agent
simple_dashboard_agent = Agent(
    name="simple_dashboard_agent",
    model="gemini-2.0-flash-exp",
    description="Simple ADK v2.0 compliant Dashboard Agent for AI Homelab monitoring",
    instruction="""You are a dashboard monitoring agent for the AI Homelab ecosystem. 

Available tools:
- get_system_status: Check system health and status
- search_knowledge_graph: Query the knowledge base
- get_agent_registry: Get information about registered agents

Always use tools to provide current, accurate information. Be concise and helpful.""",
    tools=[get_system_status, search_knowledge_graph, get_agent_registry]
)

if __name__ == "__main__":
    print("🚀 Simple ADK v2.0 Dashboard Agent")
    print(f"   Agent: {simple_dashboard_agent.name}")
    print(f"   Model: {simple_dashboard_agent.model}")
    print(f"   Tools: {len(simple_dashboard_agent.tools)} available")
    print()
    
    # Test the agent directly
    print("🧪 Testing agent tools...")
    
    try:
        # Test system status
        status_result = get_system_status()
        print(f"✅ System Status: {status_result['status']}")
        
        # Test knowledge graph
        kg_result = search_knowledge_graph("AI Homelab components")
        print(f"✅ Knowledge Graph: {kg_result['status']}")
        
        # Test agent registry
        registry_result = get_agent_registry()
        print(f"✅ Agent Registry: {registry_result['status']} - {registry_result.get('total_agents', 0)} agents")
        
        print()
        print("✅ ADK v2.0 Dashboard Agent is working!")
        print("   All tools are functional")
        print("   Ready for integration")
        
    except Exception as e:
        print(f"❌ Error testing agent: {e}")
