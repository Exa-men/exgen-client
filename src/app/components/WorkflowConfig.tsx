"use client";

import { useState, useEffect, useRef } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface StepConfig {
  id: string; // Add optional id for drag-and-drop stability
  name: string;
  description: string;
  prompt_components: string[];
  output_type: string;
  output_variable?: string;
  model: string;
  enabled?: boolean; // Add enabled property for toggling steps
}

interface WorkflowConfig {
  steps: StepConfig[];
}

interface AvailableModels {
  available_models: {
    [provider: string]: string[];
  };
  default_model: string;
}

interface WorkflowConfigProps {
  backendUrl: string;
}

// Helper to get a unique id for a step (fallback if missing)
function getStepId(step: StepConfig, index: number) {
  return step.id || `${index}-${step.name}`;
}

// Helper to ensure all steps have explicit enabled property
function withExplicitEnabled(steps: StepConfig[]): StepConfig[] {
  return steps.map((step) => ({
    ...step,
    enabled: step.enabled === false ? false : true,
  }));
}

// Helper to ensure all steps have a unique id
function ensureStepIds(steps: StepConfig[]): StepConfig[] {
  return steps.map((step, idx) => ({
    ...step,
    id: step.id && typeof step.id === 'string' && step.id.length > 0
      ? step.id
      : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}-${idx}`),
  }));
}

export default function WorkflowConfig({ backendUrl }: WorkflowConfigProps) {
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set()); // All steps collapsed by default
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<{ [key: string]: string }>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editedPromptContent, setEditedPromptContent] = useState<string>('');
  const [sectionExpanded, setSectionExpanded] = useState(false); // Collapsed by default
  const [deletingPrompt, setDeletingPrompt] = useState<string | null>(null);
  const [showDeleteStepModal, setShowDeleteStepModal] = useState<{stepIndex: number, stepName: string} | null>(null);
  const [deletingStep, setDeletingStep] = useState<number | null>(null);
  // Add state for editing base instructions
  const [editingBaseInstructions, setEditingBaseInstructions] = useState(false);
  const [baseInstructionsContent, setBaseInstructionsContent] = useState<string>('');
  const [savingBaseInstructions, setSavingBaseInstructions] = useState(false);
  // Add these state hooks inside the WorkflowConfig component, after other useState hooks
  const [newPromptName, setNewPromptName] = useState<{ [key: number]: string }>({});
  const [newPromptContent, setNewPromptContent] = useState<{ [key: number]: string }>({});
  const [addingPrompt, setAddingPrompt] = useState<{ [key: number]: boolean }>({});


  // Fetch workflow configuration and available models
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch workflow config
        const configResponse = await fetch(`${backendUrl}/api/v1/workflow/config`, {
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
          },
        });
        if (!configResponse.ok) throw new Error('Failed to fetch workflow config');
        const configData = await configResponse.json();
        // Ensure all steps have a unique id
        const stepsWithId = (configData.steps || []).map((step: any, idx: number) => ({
          ...step,
          id: step.id && typeof step.id === 'string' && step.id.length > 0
            ? step.id
            : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}-${idx}`),
        }));
        setWorkflowConfig({ steps: stepsWithId });

        // Fetch available models
        const modelsResponse = await fetch(`${backendUrl}/api/v1/models/available`, {
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
          },
        });
        if (!modelsResponse.ok) throw new Error('Failed to fetch available models');
        const modelsData = await modelsResponse.json();
        setAvailableModels(modelsData);

        // Fetch prompts
        const promptsResponse = await fetch(`${backendUrl}/api/v1/prompts`, {
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
          },
        });
        if (!promptsResponse.ok) throw new Error('Failed to fetch prompts');
        const promptsData = await promptsResponse.json();
        setPrompts(promptsData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [backendUrl]);

  // Set base instructions content from prompts when loaded
  useEffect(() => {
    if (prompts && typeof prompts._base_instructions === 'string') {
      setBaseInstructionsContent(prompts._base_instructions);
    }
  }, [prompts]);

  const toggleStepExpansion = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  const handleStepEdit = (stepIndex: number) => {
    setEditingStep(stepIndex);
  };

  const handleStepSave = async (stepIndex: number) => {
    if (!workflowConfig) return;

    try {
      setSaving(true);
      const updatedSteps = [...workflowConfig.steps];
      updatedSteps[stepIndex] = { ...updatedSteps[stepIndex] };
      
      const response = await fetch(`${backendUrl}/api/v1/workflow/config`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }),
      });

      if (!response.ok) throw new Error('Failed to save workflow configuration');
      
      setWorkflowConfig({ steps: ensureStepIds(updatedSteps) });
      setEditingStep(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleStepCancel = () => {
    setEditingStep(null);
  };

  const handlePromptEdit = (promptName: string) => {
    setEditingPrompt(promptName);
    setEditedPromptContent(prompts[promptName] || '');
  };

  const handlePromptSave = async (promptName: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/v1/prompts/${promptName}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editedPromptContent }),
      });

      if (!response.ok) throw new Error('Failed to save prompt');
      
      setPrompts(prev => ({ ...prev, [promptName]: editedPromptContent }));
      setEditingPrompt(null);
      setEditedPromptContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    }
  };

  const handlePromptCancel = () => {
    setEditingPrompt(null);
    setEditedPromptContent('');
  };

  const handlePromptDelete = async (promptName: string) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    setDeletingPrompt(promptName);
    setError(null);
    try {
      // Call DELETE API (to be implemented in backend)
      const response = await fetch(`${backendUrl}/api/v1/prompts/${promptName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
        },
      });
      if (!response.ok) throw new Error('Failed to delete prompt');
      setPrompts(prev => {
        const newPrompts = { ...prev };
        delete newPrompts[promptName];
        return newPrompts;
      });
      setEditingPrompt(null);
      setEditedPromptContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    } finally {
      setDeletingPrompt(null);
    }
  };

  const handleStepDelete = async (stepIndex: number) => {
    if (!workflowConfig) return;
    setDeletingStep(stepIndex);
    setError(null);
    try {
      const updatedSteps = workflowConfig.steps.filter((_, idx) => idx !== stepIndex);
      const stepsWithEnabled = withExplicitEnabled(updatedSteps);
      const response = await fetch(`${backendUrl}/api/v1/workflow/config`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps: withExplicitEnabled(stepsWithEnabled) }),
      });
      if (!response.ok) throw new Error('Failed to delete step');
      setWorkflowConfig({ steps: ensureStepIds(stepsWithEnabled) });
      setShowDeleteStepModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete step');
    } finally {
      setDeletingStep(null);
    }
  };

  const handleBaseInstructionsEdit = () => {
    setEditingBaseInstructions(true);
  };

  const handleBaseInstructionsCancel = () => {
    setEditingBaseInstructions(false);
    setBaseInstructionsContent(prompts._base_instructions || '');
  };

  const handleBaseInstructionsSave = async () => {
    setSavingBaseInstructions(true);
    setError(null);
    try {
      const response = await fetch(`${backendUrl}/api/v1/prompts/_base_instructions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: baseInstructionsContent }),
      });
      if (!response.ok) throw new Error('Failed to save base instructions');
      setPrompts(prev => ({ ...prev, _base_instructions: baseInstructionsContent }));
      setEditingBaseInstructions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save base instructions');
    } finally {
      setSavingBaseInstructions(false);
    }
  };

  // Update step field (edit)
  const updateStepField = (stepIndex: number, field: keyof StepConfig, value: any) => {
    if (!workflowConfig) return;
    
    const updatedSteps = workflowConfig.steps.map((step, idx) =>
      idx === stepIndex ? { ...step, [field]: value } : step
    );
    setWorkflowConfig({ steps: ensureStepIds(updatedSteps) });
  };

  // Handler for drag end
  const handleDragEnd = async (result: any) => {
    if (!result.destination || !workflowConfig) return;
    // Prevent drag if already saving
    if (saving) return;
    const prevSteps = workflowConfig.steps;
    const reordered = Array.from(prevSteps);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    const stepsWithEnabled = withExplicitEnabled(reordered);
    setSaving(true);
    try {
      const response = await fetch(`${backendUrl}/api/v1/workflow/config`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps: withExplicitEnabled(stepsWithEnabled) }),
      });
      if (!response.ok) throw new Error('Failed to save workflow configuration');
      setWorkflowConfig({ steps: ensureStepIds(stepsWithEnabled) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      // Revert to previous order if save fails
      setWorkflowConfig({ steps: prevSteps });
    } finally {
      setSaving(false);
    }
  };

  // Add this handler inside the WorkflowConfig component
  function handleAddStep() {
    if (!workflowConfig) return;
    const newStep: StepConfig = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: `New Step ${workflowConfig.steps.length + 1}`,
      description: '',
      prompt_components: [],
      output_type: 'text',
      model: allModels[0] || '',
      enabled: false, // New steps are disabled by default
    };
    const updatedSteps = [...workflowConfig.steps, newStep];
    setWorkflowConfig({ steps: ensureStepIds(updatedSteps) });
    // Optionally, save to backend immediately
    (async () => {
      setSaving(true);
      try {
        const response = await fetch(`${backendUrl}/api/v1/workflow/config`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }),
        });
        if (!response.ok) throw new Error('Failed to add step');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add step');
      } finally {
        setSaving(false);
      }
    })();
  }

  async function handleAddPromptComponent(stepIndex: number) {
    if (!workflowConfig) return;
    const name = (newPromptName[stepIndex] || '').trim();
    const content = (newPromptContent[stepIndex] || '').trim();
    if (!name || !content) return;
    setAddingPrompt((prev) => ({ ...prev, [stepIndex]: true }));
    try {
      // Save prompt to backend
      const response = await fetch(`${backendUrl}/api/v1/prompts/${name}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to save prompt');
      setPrompts((prev) => ({ ...prev, [name]: content }));
      // Add prompt reference to step
      const updatedSteps = [...workflowConfig.steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        prompt_components: [...updatedSteps[stepIndex].prompt_components, `prompts/${name}.md`],
      };
      setWorkflowConfig({ steps: ensureStepIds(updatedSteps) });
      // Save workflow config
      await fetch(`${backendUrl}/api/v1/workflow/config`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }),
      });
      setNewPromptName((prev) => ({ ...prev, [stepIndex]: '' }));
      setNewPromptContent((prev) => ({ ...prev, [stepIndex]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add prompt');
    } finally {
      setAddingPrompt((prev) => ({ ...prev, [stepIndex]: false }));
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md mb-8">
        <div className="text-center text-gray-600">Loading workflow configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md mb-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!workflowConfig || !availableModels) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md mb-8">
        <div className="text-red-600">Failed to load configuration</div>
      </div>
    );
  }

  // Flatten all available models into a single array, but only allow OpenAI models
  const allModels = Object.values(availableModels.available_models).flat().filter(
    (model) => model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('o2-')
  );

  return (
    <div className="bg-white rounded-lg p-6 shadow-md mb-8">
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setSectionExpanded((v) => !v)}>
        <div className="flex items-center space-x-2">
          {sectionExpanded ? (
            <ChevronDownIcon className="h-6 w-6 text-gray-600" />
          ) : (
            <ChevronRightIcon className="h-6 w-6 text-gray-600" />
          )}
          <h2 className="text-xl font-semibold text-gray-800">📋 Workflow Configuration</h2>
        </div>
        <span className="text-sm text-gray-500">{sectionExpanded ? 'Click to collapse' : 'Click to expand'}</span>
      </div>
      {sectionExpanded && (
        <div className="mt-6">
          {/* Base Instructions Section */}
          <div className="border border-gray-200 rounded-lg mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg">
              <span className="font-medium text-gray-800">📜 Base Instructions</span>
              {editingBaseInstructions ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleBaseInstructionsSave}
                    className="text-green-600 hover:text-green-800"
                    disabled={savingBaseInstructions}
                    title="Save"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleBaseInstructionsCancel}
                    className="text-gray-500 hover:text-gray-700"
                    title="Cancel"
                    disabled={savingBaseInstructions}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleBaseInstructionsEdit}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="p-4">
              {editingBaseInstructions ? (
                <textarea
                  value={baseInstructionsContent}
                  onChange={e => setBaseInstructionsContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  disabled={savingBaseInstructions}
                />
              ) : (
                <pre className="bg-gray-100 rounded p-2 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {prompts._base_instructions || 'No base instructions available'}
                </pre>
              )}
            </div>
          </div>
          {/* Steps Section */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="steps-droppable">
              {(provided: any) => (
                <div className="space-y-4" ref={provided.innerRef} {...provided.droppableProps}>
                  {saving && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 z-10">
                      <span className="text-blue-600 font-semibold">Saving order...</span>
                    </div>
                  )}
                  {ensureStepIds(workflowConfig.steps).map((step, stepIndex) => {
                    // Remove _base_instructions from prompt_components for display
                    const filteredPromptComponents = step.prompt_components.filter(
                      c => !c.includes('_base_instructions')
                    );
                    const hasBaseInstructions = step.prompt_components.some(
                      (c) => c.includes('_base_instructions')
                    );
                    const stepId = getStepId(step, stepIndex);
                    const isEnabled = step.enabled !== false; // Default to true if missing
                    return (
                      <Draggable key={step.id} draggableId={step.id} index={stepIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border border-gray-200 rounded-lg bg-white ${snapshot.isDragging ? 'shadow-lg' : ''} ${!isEnabled ? 'opacity-50 grayscale' : ''}`}
                            style={{ ...provided.draggableProps.style, transition: 'box-shadow 0.2s' }}
                          >
                            {/* Step Header */}
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleStepExpansion(stepIndex)}
                            >
                              <div className="flex items-center space-x-3">
                                <span {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-600"><Bars3Icon className="h-5 w-5" /></span>
                                {/* Enable/Disable Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={e => {
                                    e.stopPropagation();
                                    const updatedSteps = workflowConfig.steps.map((step, idx) =>
                                      idx === stepIndex ? { ...step, enabled: e.target.checked } : { ...step, enabled: step.enabled === false ? false : true }
                                    );
                                    setWorkflowConfig({ steps: ensureStepIds(updatedSteps) });
                                    // Save to backend
                                    (async () => {
                                      setSaving(true);
                                      try {
                                        const response = await fetch(`${backendUrl}/api/v1/workflow/config`, {
                                          method: 'POST',
                                          headers: {
                                            'Authorization': 'Bearer frontend-secret-key',
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }),
                                        });
                                        if (!response.ok) throw new Error('Failed to save workflow configuration');
                                      } catch (err) {
                                        setError(err instanceof Error ? err.message : 'Failed to save configuration');
                                      } finally {
                                        setSaving(false);
                                      }
                                    })();
                                  }}
                                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                                  title={isEnabled ? 'Disable step' : 'Enable step'}
                                  onClick={e => e.stopPropagation()}
                                />
                                {expandedSteps.has(stepIndex) ? (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                                )}
                                <span className="font-medium text-gray-800">
                                  🔧 Step {stepIndex + 1}: {step.name}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                {editingStep === stepIndex ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStepSave(stepIndex);
                                      }}
                                      disabled={saving}
                                      className="text-green-600 hover:text-green-800"
                                      title="Save"
                                    >
                                      <CheckIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStepCancel();
                                      }}
                                      className="text-gray-500 hover:text-gray-700"
                                      title="Cancel"
                                    >
                                      <XMarkIcon className="h-5 w-5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStepEdit(stepIndex);
                                      }}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Edit"
                                    >
                                      <PencilIcon className="h-5 w-5" />
                                    </button>
                                    {!hasBaseInstructions && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowDeleteStepModal({stepIndex, stepName: step.name});
                                        }}
                                        className="text-gray-400 hover:text-red-600"
                                        title="Delete Step"
                                        disabled={deletingStep === stepIndex}
                                      >
                                        <TrashIcon className={`h-5 w-5 ${deletingStep === stepIndex ? 'opacity-50' : ''}`} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Step Content */}
                            {expandedSteps.has(stepIndex) && (
                              <div className="p-4 border-t border-gray-200 space-y-4">
                                {/* Step Name */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Step Name
                                  </label>
                                  {editingStep === stepIndex ? (
                                    <input
                                      type="text"
                                      value={step.name}
                                      onChange={(e) => updateStepField(stepIndex, 'name', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">
                                      {step.name}
                                    </div>
                                  )}
                                </div>

                                {/* Step Description */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  {editingStep === stepIndex ? (
                                    <textarea
                                      value={step.description}
                                      onChange={(e) => updateStepField(stepIndex, 'description', e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">
                                      {step.description}
                                    </div>
                                  )}
                                </div>

                                {/* Model Selection */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Model
                                  </label>
                                  {editingStep === stepIndex ? (
                                    <div className="relative">
                                      <select
                                        value={step.model}
                                        onChange={(e) => updateStepField(stepIndex, 'model', e.target.value)}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                      >
                                        {allModels.map((model) => (
                                          <option key={model} value={model}>
                                            {model}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                                          <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">
                                      {step.model}
                                    </div>
                                  )}
                                </div>

                                {/* Output Type */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Output Type
                                  </label>
                                  {editingStep === stepIndex ? (
                                    <div className="relative">
                                      <select
                                        value={step.output_type}
                                        onChange={(e) => updateStepField(stepIndex, 'output_type', e.target.value)}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                      >
                                        <option value="text">Text</option>
                                        <option value="json">JSON</option>
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                                          <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">
                                      {step.output_type}
                                    </div>
                                  )}
                                </div>

                                {/* Output Variable (if applicable) */}
                                {step.output_type === 'text' && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Output Variable
                                    </label>
                                    {editingStep === stepIndex ? (
                                      <input
                                        type="text"
                                        value={step.output_variable || ''}
                                        onChange={(e) => updateStepField(stepIndex, 'output_variable', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., SUMMARY_QUALIFICATION_REQUIREMENTS"
                                      />
                                    ) : (
                                      <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">
                                        {step.output_variable || 'Not specified'}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Prompt Components */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prompt Components
                                  </label>
                                  <div className="space-y-2">
                                    {filteredPromptComponents.map((component, compIndex) => {
                                      const promptName = component.replace('prompts/', '').replace('.md', '');
                                      const promptContent = prompts[promptName];
                                      
                                      return (
                                        <div key={compIndex} className="border border-gray-200 rounded-md p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">{promptName}</span>
                                            <div className="flex space-x-2">
                                              {editingPrompt === promptName ? (
                                                <>
                                                  <button
                                                    onClick={() => handlePromptSave(promptName)}
                                                    className="text-green-600 hover:text-green-800 text-sm"
                                                  >
                                                    Save
                                                  </button>
                                                  <button
                                                    onClick={handlePromptCancel}
                                                    className="text-gray-500 hover:text-gray-700 text-sm"
                                                  >
                                                    Cancel
                                                  </button>
                                                </>
                                              ) : (
                                                <button
                                                  onClick={() => handlePromptEdit(promptName)}
                                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                                  title="Edit"
                                                >
                                                  <PencilIcon className="h-5 w-5 inline" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {editingPrompt === promptName ? (
                                            <textarea
                                              value={editedPromptContent}
                                              onChange={(e) => setEditedPromptContent(e.target.value)}
                                              rows={6}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                            />
                                          ) : (
                                            <pre className="bg-gray-100 rounded p-2 text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                              {promptContent || 'No content available'}
                                            </pre>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                {editingStep === stepIndex && (
                                  <div className="border border-green-300 rounded-md p-3 mt-2 bg-green-50">
                                    <div className="flex flex-col md:flex-row md:items-center md:space-x-2 mb-2">
                                      <input
                                        type="text"
                                        className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-2 md:mb-0"
                                        placeholder="Prompt name (e.g. my_prompt)"
                                        value={newPromptName[stepIndex] || ''}
                                        onChange={e => setNewPromptName(prev => ({ ...prev, [stepIndex]: e.target.value }))}
                                        disabled={addingPrompt[stepIndex]}
                                      />
                                      <button
                                        className="ml-0 md:ml-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                        onClick={() => handleAddPromptComponent(stepIndex)}
                                        disabled={addingPrompt[stepIndex] || !(newPromptName[stepIndex] && newPromptContent[stepIndex])}
                                        type="button"
                                      >
                                        Add Prompt
                                      </button>
                                    </div>
                                    <textarea
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                                      placeholder="Prompt content..."
                                      rows={4}
                                      value={newPromptContent[stepIndex] || ''}
                                      onChange={e => setNewPromptContent(prev => ({ ...prev, [stepIndex]: e.target.value }))}
                                      disabled={addingPrompt[stepIndex]}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {/* Add Step Bar */}
                  <div
                    className="flex items-center justify-center mt-2 p-4 border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
                    onClick={handleAddStep}
                    title="Add Step"
                  >
                    <span className="flex items-center space-x-2 text-gray-500 font-semibold hover:text-blue-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add Step</span>
                    </span>
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {saving && (
            <div className="mt-4 text-center text-blue-600">
              Saving configuration...
            </div>
          )}
        </div>
      )}
      {/* Modal for step deletion */}
      {showDeleteStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Step</h3>
            <p className="mb-6">Are you sure you want to delete <span className="font-bold">{showDeleteStepModal.stepName}</span>? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowDeleteStepModal(null)}
                disabled={deletingStep !== null}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleStepDelete(showDeleteStepModal.stepIndex)}
                disabled={deletingStep !== null}
              >
                {deletingStep !== null ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 