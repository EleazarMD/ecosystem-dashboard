#!/usr/bin/env python3
"""
Dashboard Agent - ADK v2.0 Compliant Implementation
Main orchestrator agent for AI Homelab Dashboard using Google's Agent Development Kit
"""

import os
import json
import asyncio
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

# Official Google ADK imports
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService

# Tool functions for ADK compatibility
def get_system_status(component: str = None) -> Dict[str, Any]:
    """
    Get current system health, status, metrics, service status, infrastructure health, 
    system performance, alerts, and monitoring data.
    
    Args:
        component (str, optional): Specific component to check ('services', 'health', 'metrics', 'alerts')
    
    Returns:
        Dict containing system status information
    """
    try:
        # Use working dashboard monitoring APIs
        health_data = {}
        metrics_data = {}
        services_data = []
        
        try:
            # Get health data
            health_response = requests.get('http://localhost:8404/api/health', timeout=5)
            if health_response.status_code == 200:
                health_data = health_response.json()
        except:
            health_data = {"status": "unknown", "message": "Health API unavailable"}
        
        try:
            # Get system metrics
            metrics_response = requests.get('http://localhost:8404/api/monitoring/system-metrics', timeout=5)
            if metrics_response.status_code == 200:
                metrics_data = metrics_response.json()
        except:
            metrics_data = {"cpu": 0, "memory": 0, "disk": 0, "network": 0}
        
        try:
            # Get infrastructure services
            services_response = requests.get('http://localhost:8404/api/infrastructure/services', timeout=5)
            if services_response.status_code == 200:
                services_data = services_response.json()
        except:
            services_data = []
        
        # Component-specific filtering
        if component == 'health':
            return {"status": "success", "data": health_data}
        elif component == 'metrics':
            return {"status": "success", "data": metrics_data}  
        elif component == 'services':
            return {"status": "success", "data": services_data}
        elif component == 'alerts':
            return {"status": "success", "data": []}  # No alerts system yet
        
        # Return comprehensive status
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "health": health_data,
            "metrics": metrics_data,
            "services": services_data,
            "alerts": [],
            "summary": f"System operational with {len(services_data)} services monitored"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to retrieve system status",
            "timestamp": datetime.now().isoformat()
        }

def search_knowledge_graph(query: str, limit: int = 10) -> Dict[str, Any]:
    """
    Query knowledge base and graph data using semantic search and graph traversal.
    
    Args:
        query (str): Search query for knowledge base
        limit (int): Maximum number of results to return
    
    Returns:
        Dict containing search results from knowledge graph
    """
    try:
        # Query Knowledge Graph API
        kg_response = requests.post(
            'http://localhost:8765/api/query',
            json={
                "query": query,
                "limit": limit,
                "include_context": True
            },
            timeout=10
        )
        
        if kg_response.status_code == 200:
            kg_data = kg_response.json()
            return {
                "status": "success",
                "query": query,
                "results": kg_data.get("results", []),
                "context": kg_data.get("context", {}),
                "total": len(kg_data.get("results", [])),
                "source": "knowledge_graph"
            }
        else:
            return {
                "status": "error",
                "error": f"Knowledge Graph API returned {kg_response.status_code}",
                "query": query
            }
            
    except Exception as e:
        return {
            "status": "error", 
            "error": str(e),
            "message": "Failed to query knowledge graph",
            "query": query
        }

def get_agent_registry() -> Dict[str, Any]:
    """
    Get current registered agents from the AI Homelab ecosystem.
    
    Returns:
        Dict containing agent registry information
    """
    try:
        # Query PostgreSQL-backed agent registry  
        agents_response = requests.get('http://localhost:8404/api/agentic-control/agents', timeout=10)
        
        if agents_response.status_code == 200:
            agents_data = agents_response.json()
            agents = agents_data.get("agents", [])
            
            # Categorize agents by project
            projects = {}
            for agent in agents:
                agent_type = agent.get("type", "unknown")
                if agent_type not in projects:
                    projects[agent_type] = []
                projects[agent_type].append(agent["name"])
            
            return {
                "status": "success",
                "total_agents": len(agents),
                "active_agents": len([a for a in agents if a.get("status") == "active"]),
                "projects": projects,
                "agents": agents[:10],  # Return first 10 for summary
                "source": "postgresql_registry"
            }
        else:
            return {
                "status": "error",
                "error": f"Agent registry API returned {agents_response.status_code}"
            }
            
    except Exception as e:
        return {
            "status": "error",
            "error": str(e), 
            "message": "Failed to retrieve agent registry"
        }

def analyze_dashboard_screen(action: str = "capture") -> Dict[str, Any]:
    """
    Analyze current dashboard visual state using vision capabilities.
    
    Args:
        action (str): Action to perform ('capture', 'analyze', 'compare')
    
    Returns:
        Dict containing visual analysis results
    """
    try:
        # Use vision analysis tool
        vision_response = requests.post(
            'http://localhost:8404/api/vision/analyze',
            json={
                "action": action,
                "target": "dashboard",
                "analyze_ui": True
            },
            timeout=15
        )
        
        if vision_response.status_code == 200:
            vision_data = vision_response.json()
            return {
                "status": "success",
                "action": action,
                "analysis": vision_data.get("analysis", {}),
                "screenshot_path": vision_data.get("screenshot_path"),
                "ui_elements": vision_data.get("ui_elements", []),
                "visual_state": vision_data.get("visual_state", {})
            }
        else:
            return {
                "status": "error",
                "error": f"Vision API returned {vision_response.status_code}",
                "action": action
            }
            
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to analyze dashboard screen",
            "action": action
        }

def handle_voice_interaction(command: str, mode: str = "process") -> Dict[str, Any]:
    """
    Handle voice interactions and audio processing for dashboard operations.
    
    Args:
        command (str): Voice command to process
        mode (str): Processing mode ('process', 'transcribe', 'respond')
    
    Returns:
        Dict containing voice interaction results
    """
    try:
        # Process voice command through voice service
        voice_response = requests.post(
            'http://localhost:8404/api/voice/process',
            json={
                "command": command,
                "mode": mode,
                "context": "dashboard"
            },
            timeout=10
        )
        
        if voice_response.status_code == 200:
            voice_data = voice_response.json()
            return {
                "status": "success",
                "command": command,
                "mode": mode,
                "response": voice_data.get("response", ""),
                "confidence": voice_data.get("confidence", 0.0),
                "audio_url": voice_data.get("audio_url")
            }
        else:
            return {
                "status": "error",
                "error": f"Voice API returned {voice_response.status_code}",
                "command": command
            }
            
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to process voice interaction",
            "command": command
        }

# Create ADK v2.0 compliant Dashboard Agent
dashboard_agent = Agent(
    name="dashboard_ai_coordinator", 
    model="gemini-2.0-flash",  # Use official ADK model
    description="AI coordinator for AI Homelab Dashboard with multimodal vision and multi-agent capabilities",
    instruction="""You are the AI coordinator for the AI Homelab Dashboard. Your role is to assist users with monitoring and managing their AI homelab ecosystem through intelligent analysis and real-time data access.

TOOLS AVAILABLE:
- get_system_status: Access real-time system health, metrics, and service status
- search_knowledge_graph: Query knowledge base and graph data
- get_agent_registry: Get information about registered agents
- analyze_dashboard_screen: Visual analysis of dashboard interface
- handle_voice_interaction: Process voice commands and interactions

DATA INTEGRITY:
- Only provide information from actual API endpoints and tools
- Never fabricate or assume data - always fetch current information
- If data is unavailable, clearly state this limitation
- Refuse to provide mock or placeholder information

CONVERSATION BEHAVIOR:
- Maintain context throughout the conversation
- Reference previous exchanges when relevant
- Avoid unnecessary repetition of information
- Provide contextual, progressive responses
- Ask clarifying questions when user intent is unclear

RESPONSE STYLE:
- Professional and helpful tone
- Concise yet informative
- Focus on user's specific needs
- Provide actionable insights when possible
- Respond naturally in the user's language

CAPABILITIES:
- Real-time system monitoring and health checks
- Knowledge graph queries and semantic search
- Agent registry management and discovery
- Visual dashboard analysis and troubleshooting
- Voice command processing and audio interactions
- Multi-modal assistance with visual and audio feedback

Always execute appropriate tools to gather current data rather than relying on assumptions or cached information.""",
    tools=[
        get_system_status,
        search_knowledge_graph, 
        get_agent_registry,
        analyze_dashboard_screen,
        handle_voice_interaction
    ]
)

# Agent runner setup for ADK v2.0
def create_dashboard_runner():
    """Create and configure ADK Runner for Dashboard Agent"""
    session_service = InMemorySessionService()
    
    runner = Runner(
        app_name="ai_homelab_dashboard",
        agent=dashboard_agent,
        session_service=session_service
    )
    
    return runner

# Main execution
if __name__ == "__main__":
    print("🚀 Starting ADK v2.0 Dashboard Agent...")
    print(f"   Agent: {dashboard_agent.name}")
    print(f"   Model: {dashboard_agent.model}")
    print(f"   Tools: {len(dashboard_agent.tools)} available")
    
    # Create and start runner
    runner = create_dashboard_runner()
    
    print("✅ Dashboard Agent ADK v2.0 Server Ready!")
    print("   Server will start on default ADK port")
    print("   Use ADK serve command to start")
    
    # Start the agent server using ADK serve
    runner.serve(port=8405, host="0.0.0.0")
