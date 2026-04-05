---
lastUpdated: '2025-07-14'
---
# Project Onboarding Wizard

This directory contains the components for the AI Homelab Ecosystem project onboarding wizard, which guides users through the process of registering and configuring new projects in the ecosystem.

## Overview

The onboarding wizard is a multi-step process that handles:

1. Project registration with basic details
2. Service configuration and port allocation
3. Configuration file updates
4. Compliance scanning
5. Documentation setup

## Component Structure

- `ProjectOnboardingWizard.tsx`: Main wizard component that orchestrates the entire onboarding flow
- `steps/`: Directory containing individual step components:
  - `ProjectDetailsForm.tsx`: Form for capturing project details
  - `ServiceConfigurationForm.tsx`: Form for configuring services and ports
  - `ConfigurationUpdatesForm.tsx`: Form for specifying configuration file updates
  - `ComplianceScanStep.tsx`: Component for initiating and monitoring compliance scans
  - `DocumentationSetupStep.tsx`: Component for setting up project documentation

## Usage

To use the onboarding wizard in a page:

```tsx
import ProjectOnboardingWizard from '@/components/onboarding/ProjectOnboardingWizard';

const MyPage = () => {
  const handleOnboardingComplete = (projectId: string) => {
    console.log(`Project ${projectId} onboarded successfully`);
    // Navigate to project details or perform other actions
  };

  return (
    <div>
      <h1>Project Onboarding</h1>
      <ProjectOnboardingWizard onComplete={handleOnboardingComplete} />
    </div>
  );
};
```

## Props

### ProjectOnboardingWizard

| Prop | Type | Description |
|------|------|-------------|
| `onComplete` | `(projectId: string) => void` | Callback function called when onboarding is complete |
| `initialStep` | `number` | (Optional) Initial step to show (default: 0) |
| `projectId` | `string` | (Optional) Existing project ID for continuing onboarding |

## API Integration

The wizard components use the `ecosystemApi` client to interact with the AHIS backend. See the [Onboarding API Integration](../../docs/ONBOARDING_API_INTEGRATION.md) documentation for details on the API endpoints and data models.

## State Management

Each step component manages its own form state and validation. The main wizard component maintains the overall onboarding state, including:

- Project ID
- Current step
- Completion status of each step
- Error states

## Error Handling

The wizard includes comprehensive error handling:

- Form validation errors with user feedback
- API error handling with toast notifications
- Retry mechanisms for failed operations
- Graceful degradation when services are unavailable

## Styling

The wizard uses Chakra UI components for consistent styling and accessibility. The design follows the AI Homelab Ecosystem design system.

## ADK Integration

The onboarding wizard is designed to be compatible with Google's Agent Development Kit (ADK) through the AHIS MCP Adapter. This allows ADK-based agents to guide users through the onboarding process.

## Best Practices

When extending or modifying the onboarding wizard:

1. Maintain consistent error handling patterns
2. Use TypeScript interfaces for API requests and responses
3. Keep step components modular and focused on a single responsibility
4. Provide clear user feedback for long-running operations
5. Implement proper validation before submitting data to APIs
6. Follow the AHIS naming conventions for consistency
