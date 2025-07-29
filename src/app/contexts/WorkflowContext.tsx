"use client"

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';

export interface WorkflowGroup {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  created_at: string;
  updated_at: string;
  config?: {
    steps: Array<{
      id: string;
      name: string;
      description: string;
      prompt_components: string[];
      output_type: string;
      output_variable?: string;
      model: string;
      enabled?: boolean;
    }>;
    base_instructions?: string;
  };
  prompts?: { [key: string]: string };
}

export interface AvailableModels {
  available_models: {
    [provider: string]: string[];
  };
  default_model: string;
}

export interface WorkflowConfig {
  steps: Array<{
    name: string;
    description: string;
  }>;
}

interface WorkflowContextType {
  workflowGroups: WorkflowGroup[];
  availableModels: AvailableModels | null;
  workflowConfig: WorkflowConfig | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// Cache for workflow data to avoid repeated API calls
const workflowCache = new Map<string, { 
  groups: WorkflowGroup[]; 
  models: AvailableModels | null; 
  config: WorkflowConfig | null; 
  timestamp: number 
}>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to map backend snake_case to frontend camelCase
const mapWorkflowGroup = (group: any): WorkflowGroup => ({
  id: group.id,
  name: group.name,
  isActive: group.is_active,
  isDefault: group.is_default,
  created_at: group.created_at,
  updated_at: group.updated_at,
  config: group.config,
  prompts: group.prompts
});

interface WorkflowProviderProps {
  children: ReactNode;
}

export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const [workflowGroups, setWorkflowGroups] = useState<WorkflowGroup[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWorkflowData = async () => {
    if (!isLoaded || !isSignedIn) {
      setWorkflowGroups([]);
      setAvailableModels(null);
      setWorkflowConfig(null);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = user?.id || 'anonymous';
    const cached = workflowCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setWorkflowGroups(cached.groups);
      setAvailableModels(cached.models);
      setWorkflowConfig(cached.config);
      setIsLoading(false);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);
      
      const token = await getToken();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Fetch all workflow data in parallel
      const [groupsRes, modelsRes, configRes] = await Promise.all([
        fetch('/api/v1/workflow/groups', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortControllerRef.current.signal,
        }),
        fetch('/api/v1/models/available', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortControllerRef.current.signal,
        }),
        fetch(`${backendUrl}/api/v1/workflow/config`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortControllerRef.current.signal,
        })
      ]);

      if (!groupsRes.ok) throw new Error('Failed to fetch workflow groups');
      if (!modelsRes.ok) throw new Error('Failed to fetch available models');
      if (!configRes.ok) throw new Error('Failed to fetch workflow config');

      const [groupsData, modelsData, configData] = await Promise.all([
        groupsRes.json(),
        modelsRes.json(),
        configRes.json()
      ]);

      // Map backend snake_case to frontend camelCase for groups
      const mappedGroups = groupsData.map(mapWorkflowGroup);
      
      // Extract step names and descriptions from config
      const config = {
        steps: configData.steps?.map((step: any) => ({
          name: step.name,
          description: step.description
        })) || []
      };

      setWorkflowGroups(mappedGroups);
      setAvailableModels(modelsData);
      setWorkflowConfig(config);
      
      // Cache the result
      workflowCache.set(cacheKey, { 
        groups: mappedGroups, 
        models: modelsData, 
        config, 
        timestamp: now 
      });
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching workflow data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load workflow data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowData();

    // Cleanup function to abort ongoing requests when component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isLoaded, isSignedIn, getToken, user?.id]);

  const refetch = () => {
    // Clear cache and trigger re-fetch
    if (user?.id) {
      workflowCache.delete(user.id);
    }
    setIsLoading(true);
    setWorkflowGroups([]);
    setAvailableModels(null);
    setWorkflowConfig(null);
    fetchWorkflowData();
  };

  const value = {
    workflowGroups,
    availableModels,
    workflowConfig,
    isLoading,
    error,
    refetch
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
