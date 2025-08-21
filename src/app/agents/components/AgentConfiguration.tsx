"use client";

import { useState } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Workflow } from 'lucide-react';
import Avatar from './Avatar';

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface AgentConfigurationProps {
  agentId: string;
  agentName: string;
  onBack: () => void;
  onSave: (config: any) => void;
}

export default function AgentConfiguration({
  agentId,
  agentName,
  onBack,
  onSave
}: AgentConfigurationProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Document Validation',
      description: 'Validates exam products and documents',
      isActive: true
    },
    {
      id: '2',
      name: 'Content Analysis',
      description: 'Analyzes document content for quality assessment',
      isActive: false
    }
  ]);

  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '' });
  const [isAddingWorkflow, setIsAddingWorkflow] = useState(false);

  const handleAddWorkflow = () => {
    if (newWorkflow.name.trim() && newWorkflow.description.trim()) {
      const workflow: Workflow = {
        id: Date.now().toString(),
        name: newWorkflow.name.trim(),
        description: newWorkflow.description.trim(),
        isActive: true
      };
      setWorkflows([...workflows, workflow]);
      setNewWorkflow({ name: '', description: '' });
      setIsAddingWorkflow(false);
    }
  };

  const handleToggleWorkflow = (workflowId: string) => {
    setWorkflows(workflows.map(w => 
      w.id === workflowId ? { ...w, isActive: !w.isActive } : w
    ));
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflows(workflows.filter(w => w.id !== workflowId));
  };

  const handleSave = () => {
    onSave({
      agentId,
      workflows,
      // Add other configuration options here
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-200 rounded-lg mr-3 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="mr-3">
          <Avatar name={agentName} size={40} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Configure {agentName}</h3>
          <p className="text-sm text-gray-600">Agent Settings & Workflows</p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          Save
        </button>
      </div>

      {/* Configuration Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Agent Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Agent Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={agentName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent ID
                </label>
                <input
                  type="text"
                  value={agentId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Workflows Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Workflow className="w-5 h-5 mr-2 text-blue-500" />
                Workflows
              </h4>
              <button
                onClick={() => setIsAddingWorkflow(!isAddingWorkflow)}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1 inline" />
                Add Workflow
              </button>
            </div>

            {/* Add New Workflow Form */}
            {isAddingWorkflow && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter workflow description"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddWorkflow}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Add Workflow
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingWorkflow(false);
                      setNewWorkflow({ name: '', description: '' });
                    }}
                    className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Workflows List */}
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={workflow.isActive}
                        onChange={() => handleToggleWorkflow(workflow.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div>
                        <h5 className="font-medium text-gray-900">{workflow.name}</h5>
                        <p className="text-sm text-gray-600">{workflow.description}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete workflow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Configuration Options */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Additional Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Auto-Response</h5>
                  <p className="text-sm text-gray-600">Enable automatic responses for common queries</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Learning Mode</h5>
                  <p className="text-sm text-gray-600">Allow agent to learn from conversations</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
