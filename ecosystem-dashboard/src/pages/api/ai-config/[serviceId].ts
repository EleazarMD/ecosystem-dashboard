import { NextApiRequest, NextApiResponse } from 'next';

interface AIConfigData {
  serviceId: string;
  features: Record<string, any>;
  updatedAt: string;
  updatedBy: string;
}

// In-memory storage for development (replace with Knowledge Graph/database in production)
const configStorage = new Map<string, AIConfigData>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { serviceId } = req.query;

  if (!serviceId || typeof serviceId !== 'string') {
    return res.status(400).json({ error: 'Service ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Retrieve AI configuration for service
        const config = configStorage.get(serviceId);
        if (!config) {
          return res.status(404).json({ error: 'Configuration not found' });
        }
        return res.status(200).json(config);

      case 'POST':
        // Save AI configuration for service
        const { features, updatedAt, updatedBy } = req.body;
        
        if (!features) {
          return res.status(400).json({ error: 'Features configuration is required' });
        }

        const configData: AIConfigData = {
          serviceId,
          features,
          updatedAt: updatedAt || new Date().toISOString(),
          updatedBy: updatedBy || 'unknown'
        };

        configStorage.set(serviceId, configData);
        
        // TODO: In production, save to Knowledge Graph or persistent database
        // Example: await knowledgeGraph.saveAIConfig(configData);
        
        console.log(`AI configuration saved for service: ${serviceId}`);
        return res.status(200).json({ 
          message: 'Configuration saved successfully',
          serviceId,
          updatedAt: configData.updatedAt
        });

      case 'DELETE':
        // Delete AI configuration for service
        if (configStorage.has(serviceId)) {
          configStorage.delete(serviceId);
          return res.status(200).json({ message: 'Configuration deleted successfully' });
        }
        return res.status(404).json({ error: 'Configuration not found' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('AI Config API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export configuration storage for potential use in other API routes
export { configStorage };
