import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PlusIcon } from '@heroicons/react/24/outline';
import WorkflowConfig from './WorkflowConfig';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';

/**
 * NOTE: Current Prompt Management Implementation
 * 
 * This component currently implements a temporary prompt management system that stores
 * prompts locally in the workflow group's prompts object. This is because the backend
 * doesn't currently support updating/deleting prompts by name - it expects prompts
 * to be managed as separate entities with IDs.
 * 
 * Current Limitations:
 * - Prompts are stored locally and will be lost on page refresh
 * - No persistence to backend database
 * - No proper prompt versioning or history
 * 
 * TODO: Implement proper backend prompt management:
 * 1. Create a prompts table/collection in the backend
 * 2. Add endpoints for CRUD operations on prompts
 * 3. Link prompts to workflow groups via foreign keys
 * 4. Update the prompt management functions to use the proper backend API
 * 5. Add prompt versioning and history tracking
 */

interface StepConfig {
  id: string;
  name: string;
  description: string;
  prompt_components: string[];
  output_type: string;
  output_variable?: string;
  model: string;
  enabled?: boolean;
}

interface WorkflowConfigType {
  steps: StepConfig[];
  base_instructions?: string;
}

interface AvailableModels {
  available_models: {
    [provider: string]: string[];
  };
  default_model: string;
}

interface WorkflowGroup {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  created_at: string;
  updated_at: string;
  config?: WorkflowConfigType;
  prompts?: { [key: string]: string };
}

interface WorkflowGroupsProps {
  backendUrl?: string;
}

// Helper function to map backend snake_case to frontend camelCase
const mapWorkflowGroup = (group: any): WorkflowGroup => ({
  id: group.id,
  name: group.name,
  isActive: group.is_active,
  isDefault: group.is_default,
  created_at: group.created_at,
  updated_at: group.updated_at,
  config: group.config && group.config.steps ? group.config : { steps: [] },
  prompts: group.prompts || {}
});

export default function WorkflowGroups({ backendUrl = 'http://localhost:8000' }: WorkflowGroupsProps) {
  const { getToken } = useAuth();
  const api = useApi();
  const [groups, setGroups] = useState<WorkflowGroup[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<{ [id: string]: boolean }>({});

  // Fetch workflow groups and models on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 Starting to fetch workflow groups...');
        console.log('🔍 Backend URL:', backendUrl);
        
        // Fetch workflow groups using centralized API
        console.log('🔍 Making request to workflow groups...');
        const { data: groupsData, error: groupsError } = await api.getWorkflowGroups();
        
        if (groupsError) {
          console.error('❌ Failed to fetch workflow groups:', groupsError);
          throw new Error(`Failed to fetch workflow groups: ${groupsError.detail}`);
        }
        
        console.log('🔍 Workflow groups response data:', groupsData);
        console.log('🔍 Data type:', typeof groupsData);
        console.log('🔍 Data length:', Array.isArray(groupsData) ? groupsData.length : 'Not an array');
        
        // Map backend snake_case to frontend camelCase
        const mappedGroups = (groupsData as any[]).map((group: any) => {
          console.log('🔍 Raw group from API:', group);
          const mapped = mapWorkflowGroup(group);
          console.log('🔍 Mapped group:', mapped.id, 'config:', mapped.config, 'steps:', mapped.config?.steps);
          return mapped;
        });
        console.log('🔍 All mapped groups:', mappedGroups);
        setGroups(mappedGroups);
        
        // Fetch available models using centralized API
        console.log('🔍 Fetching available models...');
        const { data: modelsData, error: modelsError } = await api.getAvailableModels();
        
        if (modelsError) {
          console.error('❌ Failed to fetch available models:', modelsError);
          // Don't throw here, just log the error
          setAvailableModels(null);
        } else {
          console.log('🔍 Available models response:', modelsData);
          setAvailableModels(modelsData as AvailableModels);
        }
        
        console.log('✅ Data fetching completed successfully');
        
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workflow groups');
        setGroups([]);
        setAvailableModels(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, backendUrl]);

  // Add new group
  const handleAddGroup = async () => {
    try {
      // Create optimistic group with temporary ID
      const optimisticGroup: WorkflowGroup = {
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
        name: 'Nieuwe workflow',
        isActive: false,
        isDefault: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config: { steps: [] },
        prompts: {}
      };
      
      // Optimistically add to UI immediately
      setGroups(prev => [...prev, optimisticGroup]);
      
      // Make API call in background
      const token = await getToken();
      const { data: newGroup, error } = await api.createWorkflowGroup({});
      
      if (error) {
        // Revert optimistic update on error
        setGroups(prev => prev.filter(g => g.id !== optimisticGroup.id));
        throw new Error('Failed to create group');
      }
      
      const mappedNewGroup = mapWorkflowGroup(newGroup as any);
      
      // Replace optimistic group with real one
      setGroups(prev => prev.map(g => g.id === optimisticGroup.id ? mappedNewGroup : g));
      
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    }
  };

  // Rename group
  const handleRenameGroup = async (id: string, name: string) => {
    try {
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
      
      // Make API call in background
      const token = await getToken();
      const { error } = await api.renameWorkflowGroup(id, name);
      
      if (error) {
        // Revert optimistic update on error
        // Note: We'd need to store the previous name to revert properly
        // For now, we'll just show an error and let the user retry
        throw new Error('Failed to rename group');
      }
      
      // Optional: Update with server response if needed
      // const updated = await res.json();
      // const mappedUpdated = mapWorkflowGroup(updated);
      // setGroups(prev => prev.map(g => g.id === id ? mappedUpdated : g));
      
    } catch (err: any) {
      setError(err.message || 'Failed to rename group');
    }
  };

  // Delete group
  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow group?')) {
      return;
    }
    
    try {
      console.log('🗑️ Deleting workflow group:', id);
      
      const { error: deleteError } = await api.deleteWorkflowGroup(id);
      
      if (deleteError) {
        console.error('❌ Failed to delete workflow group:', deleteError);
        toast.error(`Failed to delete: ${deleteError.detail}`);
        return;
      }
      
      console.log('✅ Workflow group deleted successfully');
      
      // Remove from local state
      setGroups(prev => prev.filter(group => group.id !== id));
      
      toast.success('Workflow group deleted successfully');
      
    } catch (err) {
      console.error('❌ Error deleting workflow group:', err);
      toast.error('Failed to delete workflow group');
    }
  };

  // Set active group
  const handleSetActive = async (id: string) => {
    try {
      console.log('🔄 Setting active workflow group:', id);
      
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => ({
        ...g,
        isActive: g.id === id
      })));
      
      const { error } = await api.activateWorkflowGroup(id);
      
      if (error) {
        // Revert optimistic update on error
        setGroups(prev => prev.map(g => ({
          ...g,
          isActive: g.id === id ? false : g.isActive
        })));
        console.error('❌ Failed to set active group:', error);
        toast.error(`Failed to set active group: ${error.detail}`);
        return;
      }
      
      console.log('✅ Workflow group activated successfully');
      toast.success('Workflow group activated successfully');
      
    } catch (err) {
      console.error('❌ Error setting active group:', err);
      toast.error('Failed to set active group');
    }
  };

  // Update config for a group
  const handleConfigChange = async (id: string, config: WorkflowConfigType) => {
    try {
      console.log('⚙️ Updating workflow config:', id, config);
      
      // Ensure config has valid structure
      const validConfig = {
        ...config,
        steps: config.steps || []
      };
      
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => g.id === id ? { ...g, config: validConfig } : g));
      
      const { error: updateError } = await api.updateWorkflowConfig(id, config);
      
      if (updateError) {
        console.error('❌ Failed to update config:', updateError);
        toast.error(`Failed to update config: ${updateError.detail}`);
        // Note: We'd need to store the previous config to revert properly
        // For now, we'll just show an error and let the user retry
        return;
      }
      
      console.log('✅ Workflow config updated successfully');
      toast.success('Workflow config updated successfully');
      
    } catch (err) {
      console.error('❌ Error updating config:', err);
      toast.error('Failed to update config');
    }
  };

  // Update prompt for a group
  // NOTE: This is a temporary implementation that stores prompts locally since the backend
  // doesn't currently support updating prompts by name. The backend expects prompts to be
  // managed as separate entities with IDs.
  // 
  // TODO: Implement proper backend prompt management:
  // 1. Create a prompts table/collection in the backend
  // 2. Add endpoints for CRUD operations on prompts
  // 3. Link prompts to workflow groups via foreign keys
  // 4. Update this function to use the proper backend API
  const handlePromptChange = async (id: string, promptName: string, content: string) => {
    // Validate inputs first
    if (!id || typeof id !== 'string') {
      console.error('❌ Invalid ID parameter:', id);
      toast.error('Invalid workflow group ID');
      return;
    }
    
    if (!promptName || typeof promptName !== 'string') {
      console.error('❌ Invalid prompt name parameter:', promptName);
      toast.error('Invalid prompt name');
      return;
    }
    
    if (content === undefined || content === null) {
      console.error('❌ Invalid content parameter:', content);
      toast.error('Invalid prompt content');
      return;
    }
    
    // Ensure content is a string
    const contentString = String(content);
    if (contentString.trim().length === 0) {
      console.warn('⚠️ Empty prompt content provided');
    }
    
    // Ensure groups state is properly initialized
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      console.error('❌ Groups state is not properly initialized:', groups);
      toast.error('Workflow groups not loaded. Please refresh the page and try again.');
      return;
    }
    
    // Find the target group and validate it exists
    const targetGroup = groups.find(g => g.id === id);
    if (!targetGroup) {
      console.error('❌ Target group not found:', { id, availableGroups: groups.map(g => g.id) });
      toast.error(`Workflow group with ID ${id} not found`);
      return;
    }
    
          // Store the previous prompt content for potential rollback
      const previousContent = targetGroup.prompts?.[promptName];
      
      try {
        console.log('📝 Updating prompt:', id, promptName, contentString);
        console.log('🔍 Current groups state:', groups);
        console.log('🔍 Target group:', targetGroup);
        console.log('🔍 Previous prompt content:', previousContent);
        
        // Ensure the prompts object exists and is properly initialized
        const currentPrompts = targetGroup.prompts || {};
        console.log('🔍 Current prompts object:', currentPrompts);
        
        // Optimistically update local state immediately
        try {
          setGroups(prev => {
            const updatedGroups = prev.map(g => 
              g.id === id 
                ? { 
                    ...g, 
                    prompts: {
                      ...currentPrompts,
                      [promptName]: contentString
                    }
                  }
                : g
            );
            
            console.log('🔍 State update result:', {
              before: prev.find(g => g.id === id)?.prompts,
              after: updatedGroups.find(g => g.id === id)?.prompts,
              targetGroup: updatedGroups.find(g => g.id === id)
            });
            
            return updatedGroups;
          });
        } catch (stateUpdateError: any) {
          console.error('❌ Error updating state:', stateUpdateError);
          throw new Error(`Failed to update local state: ${stateUpdateError.message || 'Unknown error'}`);
        }
        
        console.log('🔍 Updated local prompts state for group:', id, 'prompt:', promptName, 'content length:', contentString.length);
      
      // Since the backend doesn't support updating prompts by name, we'll just update the local state
      // and store the prompt content in the workflow group's prompts object
      // This is a temporary solution until the backend supports proper prompt management
      console.log('ℹ️ Backend prompt update not supported, storing prompt locally');
      
      // For now, we'll consider this a success since we're storing the prompt locally
      // In a production environment, you would want to implement proper backend prompt management
      console.log('✅ Prompt stored locally successfully');
      toast.success('Prompt updated successfully (stored locally)');
      
    } catch (err: any) {
      console.error('❌ Error updating prompt:', err);
      console.error('❌ Error details:', {
        error: err,
        errorType: typeof err,
        errorMessage: err?.message,
        errorStack: err?.stack
      });
      
      // Revert optimistic update on error if we have the previous content
      if (previousContent !== undefined) {
        try {
          setGroups(prev => prev.map(g => 
            g.id === id 
              ? { 
                  ...g, 
                  prompts: {
                    ...(g.prompts || {}),
                    [promptName]: previousContent
                  }
                }
              : g
          ));
          console.log('✅ Successfully reverted optimistic update');
        } catch (revertError) {
          console.error('❌ Failed to revert optimistic update:', revertError);
        }
      }
      
      // Show user-friendly error message
      const errorMessage = err?.message || 'An unexpected error occurred while updating the prompt';
      toast.error(errorMessage);
    }
  };

  // Delete prompt for a group
  // NOTE: This is a temporary implementation that removes prompts from local state since the backend
  // doesn't currently support deleting prompts by name. The backend expects prompts to be
  // managed as separate entities with IDs.
  const handlePromptDelete = async (id: string, promptName: string) => {
    // Store the previous prompt content for potential rollback
    const previousContent = groups.find(g => g.id === id)?.prompts?.[promptName];
    
    try {
      console.log('🗑️ Deleting prompt:', id, promptName);
      
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => 
        g.id === id 
          ? { 
              ...g, 
              prompts: Object.fromEntries(
                Object.entries(g.prompts || {}).filter(([key]) => key !== promptName)
              )
            }
          : g
      ));
      
      console.log('🔍 Updated local prompts state for group:', id, 'removed prompt:', promptName);
      
      // Since the backend doesn't support deleting prompts by name, we'll just remove it from local state
      // This is a temporary solution until the backend supports proper prompt management
      console.log('ℹ️ Backend prompt deletion not supported, removing prompt locally');
      
      // For now, we'll consider this a success since we're removing the prompt locally
      // In a production environment, you would want to implement proper backend prompt management
      console.log('✅ Prompt removed locally successfully');
      toast.success('Prompt deleted successfully (removed locally)');
      
    } catch (err: any) {
      console.error('❌ Error deleting prompt:', err);
      
      // Revert optimistic update on error if we have the previous content
      if (previousContent !== undefined) {
        setGroups(prev => prev.map(g => 
          g.id === id 
            ? { 
                ...g, 
                prompts: {
                  ...(g.prompts || {}),
                  [promptName]: previousContent
                }
              }
            : g
        ));
      }
      
      toast.error(err.message || 'Failed to delete prompt');
    }
  };

  // Update base instructions for a group
  // NOTE: This function works with the backend API and persists changes to the database
  const handleBaseInstructionsChange = async (id: string, content: string) => {
    try {
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => g.id === id ? {
        ...g,
        prompts: { 
          ...(g.prompts || {}),
          _base_instructions: content
        }
      } : g));
      
      // Make API call in background
      const token = await getToken();
      const { error } = await api.updateWorkflowBaseInstructions(id, content);
      
      if (error) {
        // Revert optimistic update on error
        // Note: We'd need to store the previous base_instructions to revert properly
        // For now, we'll just show an error and let the user retry
        throw new Error('Failed to update base instructions');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to update base instructions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading workflow groups...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 text-center">
        Error: {error}
      </div>
    );
  }

  // Don't render WorkflowConfig if availableModels is not loaded
  if (!availableModels) {
    return (
      <div className="text-gray-600 p-4 text-center">
        Loading available models...
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {groups.map((group) => {
          console.log('🔍 Rendering group:', group.id, 'config:', group.config, 'steps:', group.config?.steps);
          console.log('🔍 Group type check:', {
            hasConfig: !!group.config,
            configType: typeof group.config,
            hasSteps: !!group.config?.steps,
            stepsType: typeof group.config?.steps,
            isArray: Array.isArray(group.config?.steps)
          });
          return availableModels && (
            <WorkflowConfig
              key={group.id}
              workflowConfig={(() => {
                const config = group.config && group.config.steps ? group.config : { steps: [] };
                console.log('🔍 Final workflowConfig prop:', config);
                return config;
              })()}
              prompts={(() => {
                const prompts = group.prompts || {};
                console.log('🔍 Passing prompts to WorkflowConfig for group:', group.id, 'prompts:', Object.keys(prompts));
                return prompts;
              })()}
              availableModels={availableModels}
              onConfigChange={config => handleConfigChange(group.id, config)}
              onPromptChange={(promptName, content) => handlePromptChange(group.id, promptName, content)}
              onPromptDelete={promptName => handlePromptDelete(group.id, promptName)}
              onBaseInstructionsChange={content => handleBaseInstructionsChange(group.id, content)}
              groupName={group.name}
              onGroupNameChange={name => handleRenameGroup(group.id, name)}
              isActive={group.isActive}
              onSetActive={() => handleSetActive(group.id)}
              onDeleteGroup={() => handleDeleteGroup(group.id)}
              editableGroupName={true}
              showDelete={true}
              showActiveIndicator={true}
              isDefault={group.isDefault}
              expanded={!!expandedGroups[group.id]}
              onToggleExpand={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
            />
          );
        })}
      </div>
      
      {/* Add button positioned outside the space-y-6 container */}
      <div className="flex justify-center mt-4 mb-6">
        <button
          onClick={handleAddGroup}
          className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-400 text-blue-600 text-2xl font-bold transition-colors shadow-sm"
          title="Nieuwe workflow toevoegen"
          style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)' }}
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
} 