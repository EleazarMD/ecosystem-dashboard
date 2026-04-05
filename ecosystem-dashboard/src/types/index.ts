export interface Task {
  id: string;
  name: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  percentage: number;
  status: string;
  lastUpdate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  domain: string;
  status: string;
  progress: number;
  percentage: number;
  tasks?: Task[];
  components: number;
  lastUpdated: string;
}
