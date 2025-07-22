import React, { useState, useEffect } from 'react';
import WorkflowConfig from './WorkflowConfig';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@clerk/nextjs';

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

export default function WorkflowGroups() {
  const { getToken } = useAuth();
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
        const token = await getToken();
        // Fetch workflow groups
        const res = await fetch('/api/v1/workflow/groups', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch workflow groups');
        const data = await res.json();
        // Map backend snake_case to frontend camelCase
        const mappedData = data.map(mapWorkflowGroup);
        setGroups(mappedData);
        // Fetch available models
        const modelsRes = await fetch('/api/v1/models/available', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!modelsRes.ok) throw new Error('Failed to fetch models');
        const modelsData = await modelsRes.json();
        setAvailableModels(modelsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getToken]);

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
      const res = await fetch('/api/v1/workflow/groups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!res.ok) {
        // Revert optimistic update on error
        setGroups(prev => prev.filter(g => g.id !== optimisticGroup.id));
        throw new Error('Failed to create group');
      }
      
      const newGroup = await res.json();
      const mappedNewGroup = mapWorkflowGroup(newGroup);
      
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
      const res = await fetch(`/api/v1/workflow/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (!res.ok) {
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
    try {
      // Check if this is the default group (frontend check)
      const groupToDelete = groups.find(g => g.id === id);
      if (groupToDelete?.isDefault) {
        setError('Cannot delete the default workflow group');
        return;
      }
      
      // Optimistically remove from UI immediately
      setGroups(prev => prev.filter(g => g.id !== id));
      
      // Make API call in background
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        // Revert optimistic update on error
        // We'd need to refetch the group data to restore it properly
        // For now, we'll just show an error and let the user refresh
        throw new Error('Failed to delete group');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete group');
    }
  };

  // Set active group
  const handleSetActive = async (id: string) => {
    try {
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => ({
        ...g,
        isActive: g.id === id
      })));
      
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        // Revert optimistic update on error
        setGroups(prev => prev.map(g => ({
          ...g,
          isActive: g.id === id ? false : g.isActive
        })));
        throw new Error('Failed to set active group');
      }
      
      // Use the response data to confirm the update (optional, for consistency)
      const updatedGroup = await res.json();
      setGroups(prev => prev.map(g => 
        g.id === id 
          ? { ...g, isActive: updatedGroup.is_active, updated_at: updatedGroup.updated_at }
          : { ...g, isActive: false }
      ));
      
    } catch (err: any) {
      setError(err.message || 'Failed to set active group');
    }
  };

  // Update config for a group
  const handleConfigChange = async (id: string, config: WorkflowConfigType) => {
    try {
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => g.id === id ? { ...g, config } : g));
      
      // Make API call in background
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      
      if (!res.ok) {
        // Revert optimistic update on error
        // Note: We'd need to store the previous config to revert properly
        // For now, we'll just show an error and let the user retry
        throw new Error('Failed to update config');
      }
      
      // Optional: Update with server response if needed
      // const updatedGroup = await res.json();
      // setGroups(prev => prev.map(g => g.id === id ? { ...g, config: updatedGroup.config } : g));
      
    } catch (err: any) {
      setError(err.message || 'Failed to update config');
    }
  };

  // Update prompt for a group
  const handlePromptChange = async (id: string, promptName: string, content: string) => {
    try {
      // Optimistically update local state immediately
      setGroups(prev => prev.map(g => g.id === id ? {
        ...g,
        prompts: { ...g.prompts, [promptName]: content }
      } : g));
      
      // Make API call in background
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: { [promptName]: content } }),
      });
      
      if (!res.ok) {
        // Revert optimistic update on error
        // Note: We'd need to store the previous prompt content to revert properly
        // For now, we'll just show an error and let the user retry
        throw new Error('Failed to update prompt');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to update prompt');
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
        config: { 
          steps: g.config?.steps || [],
          base_instructions: content
        }
      } : g));
      
      // Make API call in background
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_instructions: content }),
      });
      
      if (!res.ok) {
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
    return <div className="bg-white rounded-lg p-6 shadow-md mb-8 text-center text-gray-600">Laden...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-lg p-6 shadow-md mb-8 text-center text-red-600">Fout: {error}</div>;
  }
  if (!availableModels) {
    return <div className="bg-white rounded-lg p-6 shadow-md mb-8 text-center text-red-600">Geen modellen beschikbaar</div>;
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