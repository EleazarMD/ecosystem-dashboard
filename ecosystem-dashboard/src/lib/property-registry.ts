/**
 * Property Registry System - Notion-style dynamic property management
 * Central registry for all available property types with context-aware filtering
 */

export type PropertyCategory = 
  | 'basic'
  | 'advanced'
  | 'select'
  | 'relation'
  | 'media'
  | 'date';

export type PropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'person'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'place'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

export interface PropertyDefinition {
  id: string;
  type: PropertyType;
  name: string;
  icon: string;
  category: PropertyCategory;
  description: string;
  keywords: string[];
  aliases: string[];
  slashCommands: string[];
  
  // Context rules
  contexts: {
    views: ('table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline')[];
    allowInTitle?: boolean;
    requiresDatabase?: boolean;
    transformableFrom?: PropertyType[];
  };
  
  // Configuration
  config?: {
    hasOptions?: boolean; // Select/Multi-select
    requiresTarget?: boolean; // Relation/Rollup
    supportsFormatting?: boolean;
    isComputed?: boolean; // Formula, Rollup
    isReadOnly?: boolean; // Created time, etc.
  };
  
  // Metadata
  colorSupport?: boolean;
  defaultValue?: any;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export const PROPERTY_REGISTRY: PropertyDefinition[] = [
  // === BASIC PROPERTIES ===
  {
    id: 'text',
    type: 'text',
    name: 'Text',
    icon: '📝',
    category: 'basic',
    description: 'Simple text input',
    keywords: ['text', 'string', 'input', 'name', 'title'],
    aliases: ['txt', 'string'],
    slashCommands: ['/text', '/txt'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: true,
      requiresDatabase: false,
    },
    config: {
      supportsFormatting: true,
    },
  },
  
  {
    id: 'number',
    type: 'number',
    name: 'Number',
    icon: '🔢',
    category: 'basic',
    description: 'Numeric value with optional formatting',
    keywords: ['number', 'numeric', 'integer', 'decimal', 'count'],
    aliases: ['num', 'int', 'float'],
    slashCommands: ['/number', '/num'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      supportsFormatting: true, // Currency, percentage, etc.
    },
  },
  
  {
    id: 'checkbox',
    type: 'checkbox',
    name: 'Checkbox',
    icon: '☑️',
    category: 'basic',
    description: 'Toggle between checked and unchecked',
    keywords: ['checkbox', 'toggle', 'boolean', 'yes', 'no', 'done'],
    aliases: ['check', 'bool', 'toggle'],
    slashCommands: ['/checkbox', '/check', '/toggle'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    defaultValue: false,
  },
  
  // === SELECT PROPERTIES ===
  {
    id: 'select',
    type: 'select',
    name: 'Select',
    icon: '🏷️',
    category: 'select',
    description: 'Choose one option from a list',
    keywords: ['select', 'dropdown', 'option', 'choice', 'status'],
    aliases: ['dropdown', 'status', 'tag'],
    slashCommands: ['/select', '/status', '/dropdown'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      hasOptions: true,
    },
    colorSupport: true,
  },
  
  {
    id: 'multi_select',
    type: 'multi_select',
    name: 'Multi-select',
    icon: '🏷️',
    category: 'select',
    description: 'Choose multiple options from a list',
    keywords: ['multi', 'select', 'multiple', 'tags', 'categories'],
    aliases: ['multiselect', 'tags', 'multi-tag'],
    slashCommands: ['/multiselect', '/tags', '/multi'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      hasOptions: true,
    },
    colorSupport: true,
  },
  
  // === DATE PROPERTIES ===
  {
    id: 'date',
    type: 'date',
    name: 'Date',
    icon: '📅',
    category: 'date',
    description: 'A date or date range',
    keywords: ['date', 'calendar', 'time', 'schedule', 'deadline'],
    aliases: ['cal', 'time', 'schedule'],
    slashCommands: ['/date', '/calendar', '/time'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      supportsFormatting: true, // Date format, time zone
    },
  },
  
  // === ADVANCED PROPERTIES ===
  {
    id: 'person',
    type: 'person',
    name: 'Person',
    icon: '👤',
    category: 'advanced',
    description: 'Add people from your workspace',
    keywords: ['person', 'user', 'member', 'assignee', 'owner'],
    aliases: ['user', 'member', 'people'],
    slashCommands: ['/person', '/user', '/people'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
  },
  
  {
    id: 'files',
    type: 'files',
    name: 'Files & media',
    icon: '📎',
    category: 'media',
    description: 'Upload files or embed media',
    keywords: ['file', 'files', 'upload', 'attachment', 'media', 'image'],
    aliases: ['attach', 'upload', 'media'],
    slashCommands: ['/files', '/file', '/upload'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
  },
  
  {
    id: 'url',
    type: 'url',
    name: 'URL',
    icon: '🔗',
    category: 'basic',
    description: 'Link to a webpage',
    keywords: ['url', 'link', 'web', 'website', 'http'],
    aliases: ['link', 'web', 'website'],
    slashCommands: ['/url', '/link', '/web'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    validation: {
      pattern: '^https?://',
    },
  },
  
  {
    id: 'email',
    type: 'email',
    name: 'Email',
    icon: '📧',
    category: 'basic',
    description: 'Email address',
    keywords: ['email', 'mail', 'contact'],
    aliases: ['mail', 'e-mail'],
    slashCommands: ['/email', '/mail'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    validation: {
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
    },
  },
  
  {
    id: 'phone',
    type: 'phone',
    name: 'Phone',
    icon: '📞',
    category: 'basic',
    description: 'Phone number',
    keywords: ['phone', 'telephone', 'mobile', 'cell'],
    aliases: ['tel', 'mobile', 'cell'],
    slashCommands: ['/phone', '/tel'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
  },
  
  // === RELATION PROPERTIES ===
  {
    id: 'relation',
    type: 'relation',
    name: 'Relation',
    icon: '🔗',
    category: 'relation',
    description: 'Link to pages in another database',
    keywords: ['relation', 'link', 'reference', 'connect'],
    aliases: ['link', 'reference', 'foreign'],
    slashCommands: ['/relation', '/link'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: true,
    },
    config: {
      requiresTarget: true,
    },
  },
  
  {
    id: 'rollup',
    type: 'rollup',
    name: 'Rollup',
    icon: '📊',
    category: 'relation',
    description: 'Show data from related pages',
    keywords: ['rollup', 'aggregate', 'sum', 'count', 'average'],
    aliases: ['aggregate', 'summarize'],
    slashCommands: ['/rollup', '/aggregate'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: true,
    },
    config: {
      requiresTarget: true,
      isComputed: true,
    },
  },
  
  {
    id: 'formula',
    type: 'formula',
    name: 'Formula',
    icon: 'ƒ',
    category: 'advanced',
    description: 'Calculate values using properties',
    keywords: ['formula', 'calculate', 'compute', 'function', 'math'],
    aliases: ['calc', 'compute', 'function'],
    slashCommands: ['/formula', '/calc'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      isComputed: true,
      isReadOnly: true,
    },
  },
  
  // === METADATA PROPERTIES ===
  {
    id: 'created_time',
    type: 'created_time',
    name: 'Created time',
    icon: '🕐',
    category: 'advanced',
    description: 'When this page was created',
    keywords: ['created', 'time', 'timestamp', 'date'],
    aliases: ['created', 'ctime'],
    slashCommands: ['/created', '/ctime'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      isComputed: true,
      isReadOnly: true,
    },
  },
  
  {
    id: 'created_by',
    type: 'created_by',
    name: 'Created by',
    icon: '👤',
    category: 'advanced',
    description: 'Who created this page',
    keywords: ['created', 'by', 'author', 'creator'],
    aliases: ['creator', 'author'],
    slashCommands: ['/createdby', '/author'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      isComputed: true,
      isReadOnly: true,
    },
  },
  
  {
    id: 'last_edited_time',
    type: 'last_edited_time',
    name: 'Last edited time',
    icon: '🕐',
    category: 'advanced',
    description: 'When this page was last edited',
    keywords: ['edited', 'modified', 'updated', 'time'],
    aliases: ['modified', 'updated', 'mtime'],
    slashCommands: ['/edited', '/modified', '/mtime'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      isComputed: true,
      isReadOnly: true,
    },
  },
  
  {
    id: 'last_edited_by',
    type: 'last_edited_by',
    name: 'Last edited by',
    icon: '👤',
    category: 'advanced',
    description: 'Who last edited this page',
    keywords: ['edited', 'modified', 'updated', 'by'],
    aliases: ['modifier', 'editor'],
    slashCommands: ['/editedby', '/modifier'],
    contexts: {
      views: ['table', 'board', 'calendar', 'list', 'gallery', 'timeline'],
      allowInTitle: false,
      requiresDatabase: false,
    },
    config: {
      isComputed: true,
      isReadOnly: true,
    },
  },
];

// === PROPERTY REGISTRY QUERY FUNCTIONS ===

/**
 * Get all available property types
 */
export function getAllProperties(): PropertyDefinition[] {
  return PROPERTY_REGISTRY;
}

/**
 * Get properties by category
 */
export function getPropertiesByCategory(category: PropertyCategory): PropertyDefinition[] {
  return PROPERTY_REGISTRY.filter(prop => prop.category === category);
}

/**
 * Get property definition by type
 */
export function getPropertyByType(type: PropertyType): PropertyDefinition | undefined {
  return PROPERTY_REGISTRY.find(prop => prop.type === type);
}

/**
 * Search properties by query (real-time filtering)
 */
export function searchProperties(
  query: string,
  context?: {
    view?: 'table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline';
    currentPropertyType?: PropertyType;
    hasDatabase?: boolean;
  }
): PropertyDefinition[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Filter by context first
  let properties = PROPERTY_REGISTRY.filter(prop => {
    // Check view compatibility
    if (context?.view && !prop.contexts.views.includes(context.view)) {
      return false;
    }
    
    // Check database requirement
    if (!context?.hasDatabase && prop.contexts.requiresDatabase) {
      return false;
    }
    
    return true;
  });
  
  // If query is empty, return all context-appropriate properties
  if (!normalizedQuery) {
    return properties;
  }
  
  // Search across multiple fields
  return properties.filter(prop => {
    // Match slash commands
    if (prop.slashCommands.some(cmd => cmd.includes(normalizedQuery))) {
      return true;
    }
    
    // Match name
    if (prop.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    // Match keywords
    if (prop.keywords.some(kw => kw.includes(normalizedQuery))) {
      return true;
    }
    
    // Match aliases
    if (prop.aliases.some(alias => alias.includes(normalizedQuery))) {
      return true;
    }
    
    // Match description
    if (prop.description.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    return false;
  }).sort((a, b) => {
    // Prioritize exact slash command matches
    const aSlashMatch = a.slashCommands.some(cmd => cmd === `/${normalizedQuery}`);
    const bSlashMatch = b.slashCommands.some(cmd => cmd === `/${normalizedQuery}`);
    if (aSlashMatch && !bSlashMatch) return -1;
    if (!aSlashMatch && bSlashMatch) return 1;
    
    // Then exact name matches
    const aNameMatch = a.name.toLowerCase() === normalizedQuery;
    const bNameMatch = b.name.toLowerCase() === normalizedQuery;
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;
    
    // Then by relevance (starts with query)
    const aStarts = a.name.toLowerCase().startsWith(normalizedQuery);
    const bStarts = b.name.toLowerCase().startsWith(normalizedQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    // Finally alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get transformable property types for a given property
 */
export function getTransformableTypes(currentType: PropertyType): PropertyDefinition[] {
  return PROPERTY_REGISTRY.filter(prop => 
    prop.contexts.transformableFrom?.includes(currentType)
  );
}

/**
 * Check if a property type is available in a context
 */
export function isPropertyAvailable(
  propertyType: PropertyType,
  context: {
    view?: 'table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline';
    hasDatabase?: boolean;
  }
): boolean {
  const prop = getPropertyByType(propertyType);
  if (!prop) return false;
  
  // Check view
  if (context.view && !prop.contexts.views.includes(context.view)) {
    return false;
  }
  
  // Check database requirement
  if (!context.hasDatabase && prop.contexts.requiresDatabase) {
    return false;
  }
  
  return true;
}

/**
 * Get property groups for menu display
 */
export function getPropertyGroups(context?: {
  view?: 'table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline';
  hasDatabase?: boolean;
}): Record<PropertyCategory, PropertyDefinition[]> {
  const properties = context
    ? PROPERTY_REGISTRY.filter(prop => isPropertyAvailable(prop.type, context))
    : PROPERTY_REGISTRY;
  
  return properties.reduce((groups, prop) => {
    if (!groups[prop.category]) {
      groups[prop.category] = [];
    }
    groups[prop.category].push(prop);
    return groups;
  }, {} as Record<PropertyCategory, PropertyDefinition[]>);
}
