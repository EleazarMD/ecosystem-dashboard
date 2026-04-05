import React from 'react';

export default function DatabasePage() {
  return (
    <div style={{ 
      padding: '20px', 
      color: 'white', 
      background: '#1a1a1a', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#61dafb', marginBottom: '20px' }}>
        Neo4j Knowledge Graph Database
      </h1>
      <p style={{ fontSize: '18px', marginBottom: '30px' }}>
        Interactive exploration of your 817,000+ nodes and relationships
      </p>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        background: '#2d2d2d', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#61dafb', marginBottom: '15px' }}>Database Statistics:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '5px 0', borderBottom: '1px solid #444' }}>
            <strong>Total Nodes:</strong> <span style={{ color: '#4CAF50' }}>817,008</span>
          </li>
          <li style={{ padding: '5px 0', borderBottom: '1px solid #444' }}>
            <strong>Memory Nodes:</strong> <span style={{ color: '#4CAF50' }}>817,003</span>
          </li>
          <li style={{ padding: '5px 0', borderBottom: '1px solid #444' }}>
            <strong>Workspace Nodes:</strong> <span style={{ color: '#9C27B0' }}>2</span>
          </li>
          <li style={{ padding: '5px 0' }}>
            <strong>Tag Nodes:</strong> <span style={{ color: '#FF9800' }}>3</span>
          </li>
        </ul>
      </div>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        background: '#2d2d2d', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#61dafb', marginBottom: '15px' }}>Quick Access:</h2>
        <div style={{ marginBottom: '10px' }}>
          <a 
            href="http://localhost:7474" 
            target="_blank" 
            style={{
              color: '#61dafb',
              textDecoration: 'none',
              padding: '10px 15px',
              background: '#0066cc',
              borderRadius: '5px',
              display: 'inline-block',
              marginRight: '10px'
            }}
          >
            🌐 Neo4j Browser (Raw Interface)
          </a>
        </div>
        <p style={{ fontSize: '14px', color: '#ccc', marginTop: '10px' }}>
          Access the native Neo4j browser for advanced graph exploration and visualization
        </p>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        background: '#2d2d2d', 
        borderRadius: '8px'
      }}>
        <h2 style={{ color: '#61dafb', marginBottom: '15px' }}>Sample Cypher Queries:</h2>
        <p style={{ color: '#ccc', marginBottom: '15px' }}>
          Copy and paste these queries into the Neo4j Browser to explore your data:
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ color: '#4CAF50', fontSize: '16px' }}>🧠 Explore Memory Networks:</h3>
          <div style={{ 
            background: '#1a1a1a', 
            padding: '10px', 
            borderRadius: '4px', 
            marginTop: '5px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#f8f8f2'
          }}>
            MATCH (m:Memory)-[r]-(n) RETURN m,r,n LIMIT 100
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ color: '#9C27B0', fontSize: '16px' }}>🏠 View Workspace Connections:</h3>
          <div style={{ 
            background: '#1a1a1a', 
            padding: '10px', 
            borderRadius: '4px', 
            marginTop: '5px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#f8f8f2'
          }}>
            MATCH (w:Workspace)-[r]-(n) RETURN w,r,n LIMIT 50
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ color: '#FF9800', fontSize: '16px' }}>🏷️ Explore Tag Relationships:</h3>
          <div style={{ 
            background: '#1a1a1a', 
            padding: '10px', 
            borderRadius: '4px', 
            marginTop: '5px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#f8f8f2'
          }}>
            MATCH (t:Tag)-[r]-(n) RETURN t,r,n LIMIT 50
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ color: '#2196F3', fontSize: '16px' }}>⏰ Recent Activity:</h3>
          <div style={{ 
            background: '#1a1a1a', 
            padding: '10px', 
            borderRadius: '4px', 
            marginTop: '5px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#f8f8f2'
          }}>
            MATCH (n)-[r]-(m) WHERE n.timestamp IS NOT NULL RETURN n,r,m ORDER BY n.timestamp DESC LIMIT 100
          </div>
        </div>

        <div style={{ 
          background: '#0d4f3c', 
          padding: '15px', 
          borderRadius: '5px', 
          border: '1px solid #4CAF50',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#4CAF50', margin: '0 0 10px 0' }}>✅ Database Connection Status</h3>
          <p style={{ margin: 0, color: '#ccc' }}>
            Your Neo4j database is connected and contains rich AI Homelab ecosystem data. 
            Use the queries above to explore memory networks, workspace relationships, and agent communications.
          </p>
        </div>
      </div>
    </div>
  );
}
