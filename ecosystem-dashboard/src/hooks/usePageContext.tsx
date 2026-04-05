import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Page context types for the Knowledge Graph Agent
 */
export type PageContextType = {
  pageType: string;
  section: string;
  entityId?: string;
  entityType?: string;
  viewMode?: string;
  features?: string[];
};

/**
 * Custom hook to derive detailed contextual information about the current page
 * Provides rich context to the Knowledge Graph Agent for more intelligent interactions
 */
export const usePageContext = (): PageContextType => {
  const router = useRouter();
  const [pageContext, setPageContext] = useState<PageContextType>({
    pageType: 'dashboard',
    section: 'home',
  });

  useEffect(() => {
    const path = router.pathname;
    const query = router.query;
    
    // Extract context from URL
    const pathParts = path.split('/').filter(Boolean);
    
    let newContext: PageContextType = {
      pageType: 'dashboard',
      section: 'home',
    };
    
    // Determine page type (first level of the path)
    if (pathParts.length > 0) {
      const mainSection = pathParts[0];
      
      switch(mainSection) {
        case 'dashboard':
          newContext.pageType = 'dashboard';
          newContext.section = 'overview';
          newContext.features = ['stats', 'health', 'activity'];
          break;
          
        case 'infrastructure':
          newContext.pageType = 'infrastructure';
          newContext.section = pathParts[1] || 'overview';
          
          if (pathParts[1] === 'kubernetes') {
            newContext.entityType = 'kubernetes';
            newContext.features = ['pods', 'services', 'deployments'];
          } else if (pathParts[1] === 'services') {
            newContext.entityType = 'service';
            newContext.features = ['health', 'logs', 'metrics'];
          } else if (pathParts[1] === 'ai-gateway') {
            newContext.entityType = 'gateway';
            newContext.features = ['routing', 'auth', 'traffic'];
          }
          
          // Check for specific entity ID
          if (pathParts[2]) {
            newContext.entityId = pathParts[2];
            
            // Detect view mode if present
            if (pathParts[3]) {
              newContext.viewMode = pathParts[3];
            }
          }
          break;
          
        case 'knowledge':
          newContext.pageType = 'knowledge';
          newContext.section = pathParts[1] || 'documents';
          
          if (pathParts[1] === 'graph') {
            newContext.entityType = 'knowledge-graph';
            newContext.features = ['query', 'visualize', 'entities'];
          } else if (pathParts[1] === 'documents') {
            newContext.entityType = 'document';
            newContext.features = ['search', 'tag', 'categorize'];
          }
          
          // Check for specific entity ID
          if (pathParts[2]) {
            newContext.entityId = pathParts[2];
          }
          break;
          
        case 'ide-memory':
          newContext.pageType = 'memory';
          newContext.section = 'overview';
          newContext.entityType = 'memory-system';
          newContext.features = ['memories', 'stats', 'health', 'settings'];
          break;
          
        case 'agent':
          newContext.pageType = 'agent';
          newContext.section = pathParts[1] || 'overview';
          
          if (pathParts[1] === 'knowledge-graph') {
            newContext.entityType = 'kg-agent';
            newContext.features = ['chat', 'evidence', 'actions'];
          } else if (pathParts[1] === 'kubernetes-ai') {
            newContext.entityType = 'kubernetes-agent';
            newContext.features = ['commands', 'analysis', 'diagnostics'];
          }
          break;
          
        case 'projects':
          newContext.pageType = 'project';
          newContext.section = pathParts[1] || 'list';
          newContext.features = ['code', 'issues', 'docs', 'timeline'];
          
          // Check for specific project ID
          if (pathParts[1] && pathParts[1] !== 'list') {
            newContext.entityId = pathParts[1];
            
            // Detect specific project view
            if (pathParts[2]) {
              newContext.viewMode = pathParts[2];
            }
          }
          break;
          
        case 'settings':
          newContext.pageType = 'settings';
          newContext.section = pathParts[1] || 'general';
          newContext.features = ['preferences', 'integrations', 'users'];
          break;
          
        default:
          newContext.pageType = 'unknown';
          newContext.section = mainSection;
      }
    }
    
    // Check for query params that might provide additional context
    if (query.id) {
      newContext.entityId = Array.isArray(query.id) ? query.id[0] : query.id;
    }
    
    if (query.type) {
      newContext.entityType = Array.isArray(query.type) ? query.type[0] : query.type.toString();
    }
    
    if (query.view) {
      newContext.viewMode = Array.isArray(query.view) ? query.view[0] : query.view.toString();
    }
    
    setPageContext(newContext);
  }, [router.pathname, router.query]);
  
  return pageContext;
};

export default usePageContext;
