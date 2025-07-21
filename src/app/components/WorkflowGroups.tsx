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
  created_at: string;
  updated_at: string;
  config?: WorkflowConfigType;
  prompts?: { [key: string]: string };
}

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
        setGroups(data);
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
      setLoading(true);
      const token = await getToken();
      const res = await fetch('/api/v1/workflow/groups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to create group');
      const newGroup = await res.json();
      setGroups(prev => [...prev, newGroup]);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  // Rename group
  const handleRenameGroup = async (id: string, name: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to rename group');
      const updated = await res.json();
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name: updated.name } : g));
    } catch (err: any) {
      setError(err.message || 'Failed to rename group');
    } finally {
      setLoading(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (id: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete group');
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  // Set active group
  const handleSetActive = async (id: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to set active group');
      // Re-fetch groups to get the latest isActive state from backend
      const groupsRes = await fetch('/api/v1/workflow/groups', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!groupsRes.ok) throw new Error('Failed to fetch workflow groups');
      const data = await groupsRes.json();
      setGroups(data);
    } catch (err: any) {
      setError(err.message || 'Failed to set active group');
    } finally {
      setLoading(false);
    }
  };

  // Update config for a group
  const handleConfigChange = async (id: string, config: WorkflowConfigType) => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error('Failed to update config');
      // Update local state with new config
      setGroups(prev => prev.map(g => g.id === id ? { ...g, config } : g));
    } catch (err: any) {
      setError(err.message || 'Failed to update config');
    } finally {
      setLoading(false);
    }
  };

  // Update prompt for a group
  const handlePromptChange = async (id: string, promptName: string, content: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: { [promptName]: content } }),
      });
      if (!res.ok) throw new Error('Failed to update prompt');
      // Optionally refetch or update local state
    } catch (err: any) {
      setError(err.message || 'Failed to update prompt');
    } finally {
      setLoading(false);
    }
  };

  // Delete prompt for a group (handled by config update)
  const handlePromptDelete = async (id: string, promptName: string) => {
    // Not implemented in backend; could be added if needed
  };

  // Update base instructions for a group
  const handleBaseInstructionsChange = async (id: string, content: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_instructions: content }),
      });
      if (!res.ok) throw new Error('Failed to update base instructions');
      // Optionally refetch or update local state
    } catch (err: any) {
      setError(err.message || 'Failed to update base instructions');
    } finally {
      setLoading(false);
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
            expanded={!!expandedGroups[group.id]}
            onToggleExpand={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
          />
        )
      ))}
      <div className="flex justify-center mt-8 mb-2">
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