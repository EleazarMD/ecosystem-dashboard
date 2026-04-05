/**
 * Integration Tests for Enhanced Provider Card Component
 * Tests real-time provider management with AI Gateway Backend
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { EnhancedProviderCard } from '../EnhancedProviderCard';
import { Provider } from '../../lib/ai-gateway-backend-client';

const mockProvider: Provider = {
  id: 'test-provider-1',
  name: 'Test Ollama Provider',
  type: 'ollama',
  enabled: true,
  priority: 10,
  endpoint: 'http://localhost:11434',
  models: ['llama3.1:8b', 'mistral:7b'],
  capabilities: ['chat_completion', 'code_generation'],
  health: {
    status: 'healthy',
    responseTime: 150,
    lastCheck: '2025-01-01T12:00:00Z'
  },
  createdAt: '2025-01-01T10:00:00Z',
  updatedAt: '2025-01-01T12:00:00Z'
};

const mockHandlers = {
  onUpdate: jest.fn(),
  onDelete: jest.fn(),
  onHealthCheck: jest.fn()
};

const renderWithChakra = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      {component}
    </ChakraProvider>
  );
};

describe('EnhancedProviderCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render provider information correctly', () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    expect(screen.getByText('Test Ollama Provider')).toBeInTheDocument();
    expect(screen.getByText('ollama')).toBeInTheDocument();
    expect(screen.getByText('ENABLED')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
    expect(screen.getByText('2 models')).toBeInTheDocument();
  });

  it('should show health status correctly', () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
  });

  it('should handle disabled provider state', () => {
    const disabledProvider = { ...mockProvider, enabled: false };
    
    renderWithChakra(
      <EnhancedProviderCard
        provider={disabledProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    expect(screen.getByText('DISABLED')).toBeInTheDocument();
  });

  it('should call onHealthCheck when health check button is clicked', async () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    const healthCheckButton = screen.getByLabelText('Check provider health');
    fireEvent.click(healthCheckButton);

    await waitFor(() => {
      expect(mockHandlers.onHealthCheck).toHaveBeenCalledWith('test-provider-1');
    });
  });

  it('should open edit modal when edit button is clicked', async () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    const editButton = screen.getByLabelText('Edit provider');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Provider')).toBeInTheDocument();
    });
  });

  it('should handle provider update', async () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    // Open edit modal
    const editButton = screen.getByLabelText('Edit provider');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Provider')).toBeInTheDocument();
    });

    // Update provider name
    const nameInput = screen.getByDisplayValue('Test Ollama Provider');
    fireEvent.change(nameInput, { target: { value: 'Updated Provider Name' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockHandlers.onUpdate).toHaveBeenCalledWith(
        'test-provider-1',
        expect.objectContaining({
          name: 'Updated Provider Name'
        })
      );
    });
  });

  it('should handle provider deletion with confirmation', async () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    // Open edit modal
    const editButton = screen.getByLabelText('Edit provider');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Provider')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByText('Delete Provider');
    fireEvent.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText('Delete Provider?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockHandlers.onDelete).toHaveBeenCalledWith('test-provider-1');
    });
  });

  it('should show loading state', () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={true}
      />
    );

    // Should show loading indicators
    expect(screen.getByText('Test Ollama Provider')).toBeInTheDocument();
    // Loading state should disable interactive elements
    const editButton = screen.getByLabelText('Edit provider');
    expect(editButton).toBeDisabled();
  });

  it('should handle unhealthy provider status', () => {
    const unhealthyProvider = {
      ...mockProvider,
      health: {
        status: 'unhealthy' as const,
        responseTime: 5000,
        lastCheck: '2025-01-01T12:00:00Z'
      }
    };

    renderWithChakra(
      <EnhancedProviderCard
        provider={unhealthyProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    expect(screen.getByText('UNHEALTHY')).toBeInTheDocument();
    expect(screen.getByText('5000ms')).toBeInTheDocument();
  });

  it('should display models and capabilities', () => {
    renderWithChakra(
      <EnhancedProviderCard
        provider={mockProvider}
        {...mockHandlers}
        isLoading={false}
      />
    );

    // Open edit modal to see detailed info
    const editButton = screen.getByLabelText('Edit provider');
    fireEvent.click(editButton);

    expect(screen.getByDisplayValue('llama3.1:8b, mistral:7b')).toBeInTheDocument();
    expect(screen.getByDisplayValue('chat_completion, code_generation')).toBeInTheDocument();
  });
});
