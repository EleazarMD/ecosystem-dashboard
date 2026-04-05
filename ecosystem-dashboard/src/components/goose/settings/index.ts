/**
 * Goose Settings Components
 * 
 * Export all Goose settings components
 */

// Legacy panel (deprecated - use ModernGooseSettingsPanel)
export { default as GooseSettingsPanel } from './GooseSettingsPanel';

// Modern unified panel (recommended)
export { default as ModernGooseSettingsPanel } from './ModernGooseSettingsPanel';

// Legacy tabs (deprecated)
export { default as ModelTab } from './tabs/ModelTab';
export { default as IdentityTab } from './tabs/IdentityTab';
export { default as StyleTab } from './tabs/StyleTab';
export { default as GoosehintsTab } from './tabs/GoosehintsTab';
export { default as ToolsTab } from './tabs/ToolsTab';
export { default as RecipesTab } from './tabs/RecipesTab';
