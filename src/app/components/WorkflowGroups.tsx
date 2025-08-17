import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PlusIcon } from '@heroicons/react/24/outline';
import WorkflowConfig from './WorkflowConfig';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';

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
  config: group.config,
  prompts: group.prompts
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
        const mappedGroups = (groupsData as any[]).map((group: any) => mapWorkflowGroup(group));
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
      
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => g.id === id ? { ...g, config } : g));
      
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
  const handlePromptChange = async (id: string, promptName: string, content: string) => {
    try {
      console.log('📝 Updating prompt:', id, promptName, content);
      
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => 
        g.id === id 
          ? { 
              ...g, 
              prompts: {
                ...g.prompts,
                [promptName]: content
              }
            }
          : g
      ));
      
      // Make API call in background
      const token = await getToken();
      const { error } = await api.updateWorkflowPrompt(id, promptName, content);
      
      if (error) {
        // Revert optimistic update on error
        // Note: We'd need to store the previous prompt content to revert properly
        // For now, we'll just show an error and let the user retry
        throw new Error('Failed to update prompt');
      }
      
      console.log('✅ Prompt updated successfully');
      toast.success('Prompt updated successfully');
      
    } catch (err) {
      console.error('❌ Error updating prompt:', err);
      toast.error('Failed to update prompt');
    }
  };

  // Delete prompt for a group (handled by config update)
  const handlePromptDelete = async (id: string, promptName: string) => {
    // Not implemented in backend; could be added if needed
  };

  // Update base instructions for a group
  const handleBaseInstructionsChange = async (id: string, content: string) => {
    try {
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => g.id === id ? {
        ...g,
        prompts: { 
          ...g.prompts,
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
        {groups.map((group) => (
          availableModels && (
            <WorkflowConfig
              key={group.id}
              workflowConfig={group.config || { steps: [] }}
              prompts={group.prompts || {}}
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
          )
        ))}
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