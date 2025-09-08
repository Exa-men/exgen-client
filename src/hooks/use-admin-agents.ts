/**
 * Hook for admin agent management API calls
 */

import { useState, useCallback } from 'react';
import { useApi } from './use-api';

export interface AgentSummary {
  agent_id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  llm_model: string;
  temperature: number;
  enabled_tools_count: number;
  enabled_tools: string[];
  workflow_steps_count: number;
  memory_size: number;
  configuration_health: 'healthy' | 'warning' | 'error';
  caching_enabled: boolean;
  config_version: string;
  last_modified?: string;
  modified_by?: string;
}

export interface AgentDetail extends AgentSummary {
  full_configuration: any;
  configuration_health_details: {
    errors: string[];
    warnings: string[];
    info: string[];
  };
  created_at?: string;
  updated_at?: string;
}

export interface AgentListResponse {
  agents: AgentSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  agent_type: string;
  is_system_template: boolean;
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  last_used_at?: string;
}

export interface SystemInfo {
  available_tools: Array<{
    name: string;
    description: string;
  }>;
  available_models: Array<{
    name: string;
    description: string;
  }>;
  agent_stats: {
    total: number;
    active: number;
    inactive: number;
  };
  recent_activity: Array<{
    action: string;
    timestamp?: string;
    admin: string;
    success: boolean;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  validated_config?: any;
}

export interface ConfigurationHistoryEntry {
  version: number;
  changed_by: string;
  change_reason?: string;
  change_summary: string;
  created_at?: string;
  configuration: any;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors: string[];
}

export const useAdminAgents = () => {
  const { makeAuthenticatedRequest } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // List agents with filtering and pagination
  const listAgents = useCallback(async (
    filters: {
      agent_type?: string;
      is_active?: boolean;
      search?: string;
      page?: number;
      per_page?: number;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (filters.agent_type) queryParams.append('agent_type', filters.agent_type);
      if (filters.is_active !== undefined) queryParams.append('is_active', filters.is_active.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.per_page) queryParams.append('per_page', filters.per_page.toString());

      const response = await makeAuthenticatedRequest(`/api/v1/admin/agents?${queryParams.toString()}`);
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch agents');
      }

      return response.data as AgentListResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Get detailed agent information
  const getAgent = useCallback(async (agentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`/api/v1/admin/agents/${agentId}`);
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch agent');
      }

      const apiResponse = response.data as ApiResponse<AgentDetail>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.errors?.join(', ') || 'Failed to fetch agent');
      }

      return apiResponse.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Create new agent
  const createAgent = useCallback(async (agentData: {
    name: string;
    description?: string;
    agent_type: string;
    system_prompt: string;
    configuration?: any;
    template_id?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest('/api/v1/admin/agents', {
        method: 'POST',
        body: JSON.stringify(agentData)
      });
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to create agent');
      }

      const apiResponse = response.data as ApiResponse<AgentDetail>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.errors?.join(', ') || 'Failed to create agent');
      }

      return apiResponse.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Update agent configuration
  const updateAgentConfiguration = useCallback(async (
    agentId: string,
    configuration: any,
    changeReason?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`/api/v1/admin/agents/${agentId}/config`, {
        method: 'PUT',
        body: JSON.stringify({
          configuration,
          change_reason: changeReason
        })
      });
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to update configuration');
      }

      const apiResponse = response.data as ApiResponse<AgentDetail>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.errors?.join(', ') || 'Failed to update configuration');
      }

      return apiResponse.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Delete agent
  const deleteAgent = useCallback(async (agentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`/api/v1/admin/agents/${agentId}`, {
        method: 'DELETE'
      });
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to delete agent');
      }

      const apiResponse = response.data as ApiResponse<void>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.errors?.join(', ') || 'Failed to delete agent');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Toggle agent status
  const toggleAgentStatus = useCallback(async (agentId: string, isActive: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`/api/v1/admin/agents/${agentId}/toggle?is_active=${isActive}`, {
        method: 'POST'
      });
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to toggle agent status');
      }

      const apiResponse = response.data as ApiResponse<AgentDetail>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.errors?.join(', ') || 'Failed to toggle agent status');
      }

      return apiResponse.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle agent status';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Validate agent configuration
  const validateConfiguration = useCallback(async (agentId: string, configuration?: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`/api/v1/admin/agents/${agentId}/validate`, {
        method: 'POST',
        body: JSON.stringify(configuration || {})
      });
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to validate configuration');
      }

      return response.data as ValidationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate configuration';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Get configuration history
  const getConfigurationHistory = useCallback(async (agentId: string, limit: number = 10) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`/api/v1/admin/agents/${agentId}/history?limit=${limit}`);
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch configuration history');
      }

      return response.data as {
        agent_id: string;
        agent_name: string;
        history: ConfigurationHistoryEntry[];
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configuration history';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Get templates
  const getTemplates = useCallback(async (agentType?: string, includeSystem: boolean = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (agentType) queryParams.append('agent_type', agentType);
      queryParams.append('include_system', includeSystem.toString());

      const response = await makeAuthenticatedRequest(`/api/v1/admin/templates?${queryParams.toString()}`);
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch templates');
      }

      return response.data as {
        templates: TemplateSummary[];
        system_templates: TemplateSummary[];
        custom_templates: TemplateSummary[];
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Get system info
  const getSystemInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest('/api/v1/admin/system-info');
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch system info');
      }

      return response.data as SystemInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system info';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  return {
    // State
    isLoading,
    error,

    // Methods
    listAgents,
    getAgent,
    createAgent,
    updateAgentConfiguration,
    deleteAgent,
    toggleAgentStatus,
    validateConfiguration,
    getConfigurationHistory,
    getTemplates,
    getSystemInfo,
  };
};