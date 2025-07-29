import React, { useState } from 'react';
import WorkflowConfig from './WorkflowConfig';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@clerk/nextjs';
import { useWorkflow } from '../contexts/WorkflowContext';

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
  const { workflowGroups: groups, availableModels, isLoading: loading, error, refetch } = useWorkflow();
  const [expandedGroups, setExpandedGroups] = useState<{ [id: string]: boolean }>({});

  // Add new group
  const handleAddGroup = async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/v1/workflow/groups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!res.ok) {
        throw new Error('Failed to create group');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to create group', err);
    }
  };

  // Rename group
  const handleRenameGroup = async (id: string, name: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to rename group');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to rename group', err);
    }
  };

  // Delete group
  const handleDeleteGroup = async (id: string) => {
    try {
      // Check if this is the default group (frontend check)
      const groupToDelete = groups.find(g => g.id === id);
      if (groupToDelete?.isDefault) {
        console.error('Cannot delete the default workflow group');
        return;
      }
      
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete group');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to delete group', err);
    }
  };

  // Set active group
  const handleSetActive = async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error('Failed to activate group');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to activate group', err);
    }
  };

  // Update config
  const handleConfigChange = async (id: string, config: WorkflowConfigType) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update config');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to update config', err);
    }
  };

  // Update prompt
  const handlePromptChange = async (id: string, promptName: string, content: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: { [promptName]: content } }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update prompt');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to update prompt', err);
    }
  };

  // Delete prompt
  const handlePromptDelete = async (id: string, promptName: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: { [promptName]: null } }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete prompt');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to delete prompt', err);
    }
  };

  // Update base instructions
  const handleBaseInstructionsChange = async (id: string, content: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/workflow/groups/${id}/config`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_instructions: content }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update base instructions');
      }
      
      // Refresh the workflow data from context
      refetch();
      
    } catch (err: any) {
      console.error('Failed to update base instructions', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <span className="text-red-600 mr-2">❌</span>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Workflow Groups</h2>
        <button
          onClick={handleAddGroup}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Group
        </button>
      </div>
      
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{group.name}</h3>
              <div className="flex items-center space-x-2">
                {group.isActive && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                )}
                {group.isDefault && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Default
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
