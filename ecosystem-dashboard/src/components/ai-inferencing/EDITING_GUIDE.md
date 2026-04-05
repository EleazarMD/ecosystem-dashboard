# API Key Management - Editing Guide

## Overview

This guide explains how to integrate the editing capabilities for Projects, Services, and API Keys into the existing AI Inferencing dashboard.

## Components Created

### 1. `EditableField.tsx`
**Purpose:** Inline editing for simple text fields  
**Use Case:** Quick edits without opening a modal

**Features:**
- Click to edit
- Save with Enter key or ✓ button
- Cancel with Esc key or ✗ button
- Hover highlight
- Validation
- Toast notifications

**Example Usage:**
```tsx
import { EditableField } from '@/components/ai-inferencing/EditableField';

<EditableField
  value={project.name}
  label="Project Name"
  onSave={async (newName) => {
    await fetch(`/api/v1/admin/keys/projects/${project.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    });
  }}
/>
```

### 2. `EditProjectServiceModal.tsx`
**Purpose:** Full modal for editing projects/services  
**Use Case:** Editing multiple fields (name + description)

**Features:**
- Edit name and description
- Shows read-only ID
- Validation
- Loading states
- Error handling

**Example Usage:**
```tsx
import { EditProjectServiceModal } from '@/components/ai-inferencing/EditProjectServiceModal';

const [editingProject, setEditingProject] = useState<any>(null);

<EditProjectServiceModal
  isOpen={!!editingProject}
  onClose={() => setEditingProject(null)}
  type="project"
  id={editingProject?.project_id}
  currentName={editingProject?.name}
  currentDescription={editingProject?.description}
  onUpdated={() => {
    // Refresh data
    loadProjects();
  }}
/>
```

### 3. `useAPIKeyUpdate.ts`
**Purpose:** Hook for updating API key settings  
**Use Case:** Updating key metadata (display name, limits, status)

**Features:**
- Centralized update logic
- Loading state
- Toast notifications
- Error handling

**Example Usage:**
```tsx
import { useAPIKeyUpdate } from '@/pages/ai-inferencing/hooks/useAPIKeyUpdate';

const { updateKey, isUpdating } = useAPIKeyUpdate();

await updateKey({
  keyId: 'key-123',
  updates: {
    display_name: 'Production Key',
    rate_limit_per_minute: 100,
    cost_limit_daily: 50,
  },
});
```

## Integration Points

### A. API Keys Page (`/ai-inferencing/api-keys`)

**Add Edit Icons to Project/Service Headers:**

```tsx
import { PencilIcon } from '@heroicons/react/24/outline';
import { EditProjectServiceModal } from '@/components/ai-inferencing/EditProjectServiceModal';

// In your component
const [editingProject, setEditingProject] = useState<any>(null);
const [editingService, setEditingService] = useState<any>(null);

// Project header
<HStack>
  <Text fontSize="xl" fontWeight="bold">{project.name}</Text>
  <IconButton
    aria-label="Edit project"
    icon={<PencilIcon className="w-4 h-4" />}
    size="sm"
    variant="ghost"
    onClick={() => setEditingProject(project)}
  />
</HStack>

// Service header
<HStack>
  <Text fontSize="lg" fontWeight="semibold">{service.name}</Text>
  <IconButton
    aria-label="Edit service"
    icon={<PencilIcon className="w-4 h-4" />}
    size="xs"
    variant="ghost"
    onClick={() => setEditingService(service)}
  />
</HStack>

// Modals
<EditProjectServiceModal
  isOpen={!!editingProject}
  onClose={() => setEditingProject(null)}
  type="project"
  id={editingProject?.project_id}
  currentName={editingProject?.name}
  currentDescription={editingProject?.description}
  onUpdated={refreshData}
/>

<EditProjectServiceModal
  isOpen={!!editingService}
  onClose={() => setEditingService(null)}
  type="service"
  id={editingService?.service_id}
  currentName={editingService?.name}
  currentDescription={editingService?.description}
  onUpdated={refreshData}
/>
```

### B. API Key Details Panel

**Enhance existing details panel with editable fields:**

```tsx
import { EditableField } from '@/components/ai-inferencing/EditableField';
import { useAPIKeyUpdate } from '@/pages/ai-inferencing/hooks/useAPIKeyUpdate';

const { updateKey } = useAPIKeyUpdate();

// Display Name
<FormControl>
  <FormLabel>Display Name</FormLabel>
  <EditableField
    value={selectedKey.display_name || ''}
    placeholder="Enter display name"
    label="Display Name"
    onSave={async (newName) => {
      await updateKey({
        keyId: selectedKey.id,
        updates: { display_name: newName },
      });
      refreshKeys();
    }}
  />
</FormControl>

// Rate Limit
<FormControl>
  <FormLabel>Rate Limit (per minute)</FormLabel>
  <EditableField
    value={String(selectedKey.rate_limit_per_minute || 50)}
    label="Rate Limit"
    onSave={async (newValue) => {
      await updateKey({
        keyId: selectedKey.id,
        updates: { rate_limit_per_minute: parseInt(newValue) },
      });
      refreshKeys();
    }}
  />
</FormControl>

// Cost Limit
<FormControl>
  <FormLabel>Daily Cost Limit ($)</FormLabel>
  <EditableField
    value={String(selectedKey.cost_limit_daily || 10)}
    label="Cost Limit"
    onSave={async (newValue) => {
      await updateKey({
        keyId: selectedKey.id,
        updates: { cost_limit_daily: parseFloat(newValue) },
      });
      refreshKeys();
    }}
  />
</FormControl>
```

### C. Keyboard Shortcuts

The `EditableField` component supports:
- **Enter** - Save changes
- **Escape** - Cancel editing
- **Click outside** - (Future enhancement)

## Backend API Reference

### Update Project
```
PATCH /api/v1/admin/keys/projects/:projectId
Body: { name, description }
```

### Update Service
```
PATCH /api/v1/admin/keys/services/:serviceId
Body: { name, description }
```

### Update API Key
```
PATCH /api/v1/admin/keys/keys/:keyId
Body: {
  display_name,
  rate_limit_per_minute,
  cost_limit_daily,
  is_primary,
  status
}
```

## UI/UX Best Practices

### 1. Visual Feedback
- ✅ Hover effect on editable fields
- ✅ Loading spinners during save
- ✅ Toast notifications for success/error
- ✅ Pencil icon to indicate editability

### 2. Validation
- ✅ Required field validation
- ✅ Type validation (numbers for limits)
- ✅ Non-empty name validation
- ✅ Revert on error

### 3. User Experience
- ✅ Inline editing for quick changes
- ✅ Modal for complex edits
- ✅ Keyboard shortcuts
- ✅ Clear save/cancel actions
- ✅ Optimistic UI updates (optional)

## Migration Path

### Phase 1: API Key Details Panel (Immediate)
1. Add `EditableField` to existing details panel
2. Use `useAPIKeyUpdate` hook
3. Test with display_name, rate_limit, cost_limit

### Phase 2: Project/Service Headers (Next)
1. Add edit icons to headers
2. Integrate `EditProjectServiceModal`
3. Wire up refresh callbacks

### Phase 3: Bulk Operations (Future)
1. Multi-select for batch updates
2. CSV import/export
3. Template-based key creation

## Testing Checklist

- [ ] Edit project name
- [ ] Edit project description
- [ ] Edit service name
- [ ] Edit service description
- [ ] Edit API key display name
- [ ] Edit rate limit
- [ ] Edit cost limit
- [ ] Validation errors show correctly
- [ ] Cancel reverts changes
- [ ] Keyboard shortcuts work
- [ ] Toast notifications appear
- [ ] Data refreshes after save
- [ ] Error handling works

## Example: Complete Integration

See `/tools/monitoring/ecosystem-dashboard/src/components/ai-inferencing/APIKeysEnhanced.tsx` for a complete example of integrating all editing capabilities.

---

**Status:** Components ready for integration. Follow the integration points above to add editing to your existing pages.
