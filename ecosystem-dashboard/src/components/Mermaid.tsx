/**
 * Mermaid Diagram Component
 * 
 * A React component that renders Mermaid diagrams, with special handling 
 * for client-side rendering and dynamic updates.
 * 
 * @module Mermaid
 */

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Roboto, sans-serif',
  flowchart: {
    htmlLabels: true,
    curve: 'linear'
  },
  themeVariables: {
    primaryColor: '#007bff',
    primaryTextColor: '#fff',
    primaryBorderColor: '#007bff',
    lineColor: '#666',
    secondaryColor: '#6c757d',
    tertiaryColor: '#f8f9fa'
  }
});

interface MermaidProps {
  /**
   * Mermaid diagram definition
   */
  diagram: string;
  
  /**
   * Optional class name for styling
   */
  className?: string;
  
  /**
   * Optional callback when rendering is complete
   */
  onRendered?: () => void;
}

/**
 * Mermaid component for rendering diagrams
 */
const Mermaid: React.FC<MermaidProps> = ({ 
  diagram, 
  className = '', 
  onRendered 
}) => {
  // Create a unique ID for this diagram instance
  const [id] = useState(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    // Skip rendering if no diagram
    if (!diagram || typeof window === 'undefined') {
      return;
    }

    const renderDiagram = async () => {
      try {
        setRenderError(null);

        // Check diagram syntax
        await mermaid.parse(diagram);

        // Clear the container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';

          // Render the diagram
          const { svg } = await mermaid.render(id, diagram);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }

          // Call onRendered callback if provided
          if (onRendered) {
            onRendered();
          }
        }
      } catch (error: any) {
        console.error('Mermaid rendering error:', error);
        setRenderError(`Failed to render diagram: ${error.message || 'Unknown error'}`);
      }
    };

    renderDiagram();
  }, [diagram, id, onRendered]);

  if (renderError) {
    return (
      <div className={`mermaid-error ${className}`}>
        <div className="alert alert-danger">
          <h5>Diagram Error</h5>
          <p>{renderError}</p>
          <pre className="mt-3">{diagram}</pre>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={`mermaid ${className}`} id={id} />;
};

export default Mermaid;
