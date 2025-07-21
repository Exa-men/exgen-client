"use client";

import { useState, useEffect, useRef } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// 1. Update imports: Remove useAuth and all API-related imports
// 2. Update props interface:
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
  workflowConfig: WorkflowConfig;
  prompts: { [key: string]: string };
  availableModels: AvailableModels;
  onConfigChange: (config: WorkflowConfig) => void;
  onPromptChange: (promptName: string, content: string) => void;
  onPromptDelete?: (promptName: string) => void;
  onBaseInstructionsChange: (content: string) => void;
  groupName?: string;
  onGroupNameChange?: (name: string) => void;
  onDeleteGroup?: () => void;
  isActive?: boolean;
  onSetActive?: () => void;
  editableGroupName?: boolean;
  showDelete?: boolean;
  showActiveIndicator?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
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

export default function WorkflowConfig({
  workflowConfig,
  prompts,
  availableModels,
  onConfigChange,
  onPromptChange,
  onPromptDelete,
  onBaseInstructionsChange,
  groupName,
  onGroupNameChange,
  onDeleteGroup,
  isActive,
  onSetActive,
  editableGroupName,
  showDelete,
  showActiveIndicator,
  expanded,
  onToggleExpand,
}: WorkflowConfigProps) {
  // Guard: if availableModels is not defined, do not render
  if (!availableModels) {
    return null;
  }
  // 3. Remove all useAuth, useEffect for fetching, and API calls. Replace with props usage and callback invocations.
  // 4. Replace setWorkflowConfig, setPrompts, setAvailableModels, etc. with onConfigChange, onPromptChange, etc.
  // 5. Remove backendUrl and all references to it.
  // 6. Remove all error/loading state and UI. Parent will handle errors/loading.
  // 7. Add optional UI for renaming, deleting, and setting active if those props are provided.
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set()); // All steps collapsed by default
  const [editingStep, setEditingStep] = useState<number | null>(null);
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
  // Add state for editing group name
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameValue, setGroupNameValue] = useState(groupName || '');
  useEffect(() => { setGroupNameValue(groupName || ''); }, [groupName]);
  // State for workflow deletion modal
  const [showDeleteWorkflowModal, setShowDeleteWorkflowModal] = useState(false);


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
      // setSaving(true); // Removed as per parent's responsibility
      const updatedSteps = [...workflowConfig.steps];
      updatedSteps[stepIndex] = { ...updatedSteps[stepIndex] };
      // const token = await getToken(); // Removed as per parent's responsibility
      // const response = await fetch(`${backendUrl}/api/v1/workflow/config`, { // Removed as per parent's responsibility
      //   method: 'POST', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
      //     'Content-Type': 'application/json', // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      //   body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }), // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility

      // if (!response.ok) throw new Error('Failed to save workflow configuration'); // Removed as per parent's responsibility
      
      onConfigChange({ steps: ensureStepIds(updatedSteps) });
      setEditingStep(null);
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'Failed to save configuration'); // Removed as per parent's responsibility
    } finally {
      // setSaving(false); // Removed as per parent's responsibility
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
      // const token = await getToken(); // Removed as per parent's responsibility
      // const response = await fetch(`${backendUrl}/api/v1/prompts/${promptName}`, { // Removed as per parent's responsibility
      //   method: 'POST', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
      //     'Content-Type': 'application/json', // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      //   body: JSON.stringify({ content: editedPromptContent }), // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility

      // if (!response.ok) throw new Error('Failed to save prompt'); // Removed as per parent's responsibility
      
      onPromptChange(promptName, editedPromptContent);
      setEditingPrompt(null);
      setEditedPromptContent('');
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'Failed to save prompt'); // Removed as per parent's responsibility
    }
  };

  const handlePromptCancel = () => {
    setEditingPrompt(null);
    setEditedPromptContent('');
  };

  const handlePromptDelete = async (promptName: string) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    setDeletingPrompt(promptName);
    // setError(null); // Removed as per parent's responsibility
    try {
      // const token = await getToken(); // Removed as per parent's responsibility
      // // Call DELETE API (to be implemented in backend) // Removed as per parent's responsibility
      // const response = await fetch(`${backendUrl}/api/v1/prompts/${promptName}`, { // Removed as per parent's responsibility
      //   method: 'DELETE', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility
      // if (!response.ok) throw new Error('Failed to delete prompt'); // Removed as per parent's responsibility
      onPromptDelete?.(promptName);
      setEditingPrompt(null);
      setEditedPromptContent('');
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'Failed to delete prompt'); // Removed as per parent's responsibility
    } finally {
      setDeletingPrompt(null);
    }
  };

  const handleStepDelete = async (stepIndex: number) => {
    if (!workflowConfig) return;
    setDeletingStep(stepIndex);
    // setError(null); // Removed as per parent's responsibility
    try {
      // const token = await getToken(); // Removed as per parent's responsibility
      const updatedSteps = workflowConfig.steps.filter((_, idx) => idx !== stepIndex);
      const stepsWithEnabled = withExplicitEnabled(updatedSteps);
      // const response = await fetch(`${backendUrl}/api/v1/workflow/config`, { // Removed as per parent's responsibility
      //   method: 'POST', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
      //     'Content-Type': 'application/json', // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      //   body: JSON.stringify({ steps: withExplicitEnabled(stepsWithEnabled) }), // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility
      // if (!response.ok) throw new Error('Failed to delete step'); // Removed as per parent's responsibility
      onConfigChange({ steps: ensureStepIds(stepsWithEnabled) });
      setShowDeleteStepModal(null);
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'Failed to delete step'); // Removed as per parent's responsibility
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
    // setError(null); // Removed as per parent's responsibility
    try {
      // const token = await getToken(); // Removed as per parent's responsibility
      // const response = await fetch(`${backendUrl}/api/v1/prompts/_base_instructions`, { // Removed as per parent's responsibility
      //   method: 'POST', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
      //     'Content-Type': 'application/json', // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      //   body: JSON.stringify({ content: baseInstructionsContent }), // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility
      // if (!response.ok) throw new Error('Failed to save base instructions'); // Removed as per parent's responsibility
      onBaseInstructionsChange(baseInstructionsContent);
      setEditingBaseInstructions(false);
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'Failed to save base instructions'); // Removed as per parent's responsibility
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
    onConfigChange({ steps: ensureStepIds(updatedSteps) });
  };

  // Handler for drag end
  const handleDragEnd = async (result: any) => {
    if (!result.destination || !workflowConfig) return;
    // Prevent drag if already saving
    // if (saving) return; // Removed as per parent's responsibility
    const prevSteps = workflowConfig.steps;
    const reordered = Array.from(prevSteps);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    const stepsWithEnabled = withExplicitEnabled(reordered);
    // setSaving(true); // Removed as per parent's responsibility
    try {
      // const token = await getToken(); // Removed as per parent's responsibility
      // const response = await fetch(`${backendUrl}/api/v1/workflow/config`, { // Removed as per parent's responsibility
      //   method: 'POST', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
      //     'Content-Type': 'application/json', // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      //   body: JSON.stringify({ steps: withExplicitEnabled(stepsWithEnabled) }), // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility
      // if (!response.ok) throw new Error('Failed to save workflow configuration'); // Removed as per parent's responsibility
      onConfigChange({ steps: ensureStepIds(stepsWithEnabled) });
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'Failed to save configuration'); // Removed as per parent's responsibility
      // Revert to previous order if save fails
      onConfigChange({ steps: prevSteps });
    } finally {
      // setSaving(false); // Removed as per parent's responsibility
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
      model: availableModels.available_models[Object.keys(availableModels.available_models)[0]][0] || '', // Use default model from availableModels
      enabled: false, // New steps are disabled by default
    };
    const updatedSteps = [...workflowConfig.steps, newStep];
    onConfigChange({ steps: ensureStepIds(updatedSteps) });
    // Optionally, save to backend immediately
    // (async () => { // Removed as per parent's responsibility
    //   setSaving(true); // Removed as per parent's responsibility
    //   try { // Removed as per parent's responsibility
    //     const token = await getToken(); // Removed as per parent's responsibility
    //     const response = await fetch(`${backendUrl}/api/v1/workflow/config`, { // Removed as per parent's responsibility
    //       method: 'POST', // Removed as per parent's responsibility
    //       headers: { // Removed as per parent's responsibility
    //         'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
    //         'Content-Type': 'application/json', // Removed as per parent's responsibility
    //       }, // Removed as per parent's responsibility
    //       body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }), // Removed as per parent's responsibility
    //     }); // Removed as per parent's responsibility
    //     if (!response.ok) throw new Error('Failed to add step'); // Removed as per parent's responsibility
    //   } catch (err) { // Removed as per parent's responsibility
    //     setError(err instanceof Error ? err.message : 'Failed to add step'); // Removed as per parent's responsibility
    //   } finally { // Removed as per parent's responsibility
    //     setSaving(false); // Removed as per parent's responsibility
    //   } // Removed as per parent's responsibility
    // })(); // Removed as per parent's responsibility
  }

  async function handleAddPromptComponent(stepIndex: number) {
    if (!workflowConfig) return;
    const name = (newPromptName[stepIndex] || '').trim();
    const content = (newPromptContent[stepIndex] || '').trim();
    if (!name || !content) return;
    setAddingPrompt((prev) => ({ ...prev, [stepIndex]: true }));
    try {
      // Save prompt to backend
      // const token = await getToken(); // Removed as per parent's responsibility
      // const response = await fetch(`${backendUrl}/api/v1/prompts/${name}`, { // Removed as per parent's responsibility
      //   method: 'POST', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
      //     'Content-Type': 'application/json', // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      //   body: JSON.stringify({ content }), // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility
      // if (!response.ok) throw new Error('Failed to save prompt'); // Removed as per parent's responsibility
      onPromptChange(name, content);
      // Add prompt reference to step
      const updatedSteps = [...workflowConfig.steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        prompt_components: [...updatedSteps[stepIndex].prompt_components, `prompts/${name}.md`],
      };
      onConfigChange({ steps: ensureStepIds(updatedSteps) });
      // Save workflow config
      // const token2 = await getToken(); // Removed as per parent's responsibility
      // await fetch(`${backendUrl}/api/v1/workflow/config`, { // Removed as per parent's responsibility
      //   method: 'POST', // Removed as per parent's responsibility
      //   headers: { // Removed as per parent's responsibility
      //     'Authorization': `Bearer ${token2}`, // Removed as per parent's responsibility
      //     'Content-Type': 'application/json', // Removed as per parent's responsibility
      //   }, // Removed as per parent's responsibility
      //   body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }), // Removed as per parent's responsibility
      // }); // Removed as per parent's responsibility
      setNewPromptName((prev) => ({ ...prev, [stepIndex]: '' }));
      setNewPromptContent((prev) => ({ ...prev, [stepIndex]: '' }));
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'Failed to add prompt'); // Removed as per parent's responsibility
    } finally {
      setAddingPrompt((prev) => ({ ...prev, [stepIndex]: false }));
    }
  }

  // Removed loading, error, and !workflowConfig || !availableModels checks as per parent's responsibility

  // Flatten all available models into a single array, but exclude only 'gemini-pro'
  const allModels = Object.values(availableModels.available_models).flat().filter(
    (model) =>
      model.startsWith('gpt-') ||
      model.startsWith('o1-') ||
      model.startsWith('o2-') ||
      model === 'gemini-1.5-flash' ||
      model === 'gemini-1.5-pro'
  );

  return (
    <div
      className={
        `${isActive ? 'bg-white shadow-md' : 'bg-gray-100'} rounded-lg p-0 mb-8 transition-colors duration-200`
      }
    >
      <div
        className={
          `flex items-center justify-between cursor-pointer select-none px-6 py-4 border-b border-gray-200 transition-colors duration-200 ` +
          (isActive ? '' : 'text-gray-400')
        }
        style={isActive ? {} : { opacity: 0.7 }}
        onClick={onToggleExpand}
      >
        <div className="flex items-center space-x-2 min-w-0">
          {expanded ? (
            <ChevronDownIcon className="h-6 w-6 text-gray-600 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="h-6 w-6 text-gray-600 flex-shrink-0" />
          )}
          {editableGroupName ? (
            editingGroupName ? (
              <input
                className="border px-2 py-1 rounded text-lg font-semibold min-w-0"
                value={groupNameValue}
                onChange={e => setGroupNameValue(e.target.value)}
                onClick={e => e.stopPropagation()}
                onBlur={() => { setEditingGroupName(false); onGroupNameChange && onGroupNameChange(groupNameValue); }}
                onKeyDown={e => { if (e.key === 'Enter') { setEditingGroupName(false); onGroupNameChange && onGroupNameChange(groupNameValue); }}}
                autoFocus
                style={{ maxWidth: 240 }}
              />
            ) : (
              <span className="text-xl font-semibold text-gray-800 truncate" onClick={e => { e.stopPropagation(); setEditingGroupName(true); }}>
                {groupNameValue} <PencilIcon className="h-4 w-4 inline text-blue-500 ml-1" />
              </span>
            )
          ) : (
            <h2 className="text-xl font-semibold text-gray-800">📋 Workflow Configuration</h2>
          )}
        </div>
        <div className="flex items-center flex-1 justify-end space-x-4 min-w-0">
          {showActiveIndicator && (
            <input
              type="radio"
              name="workflow-group-radio"
              checked={isActive}
              onChange={e => { e.stopPropagation(); onSetActive && onSetActive(); }}
              className="accent-blue-600 ml-2"
              title="Set as active"
            />
          )}
          {showDelete && (
            <button
              onClick={e => { e.stopPropagation(); setShowDeleteWorkflowModal(true); }}
              className="text-gray-400 hover:text-red-600 ml-2"
              title="Delete Workflow Group"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-6 px-6 pb-6">
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
                  {/* Removed saving and saving UI */}
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
                                    onConfigChange({ steps: ensureStepIds(updatedSteps) });
                                    // Save to backend
                                    // (async () => { // Removed as per parent's responsibility
                                    //   setSaving(true); // Removed as per parent's responsibility
                                    //   try { // Removed as per parent's responsibility
                                    //     const token = await getToken(); // Removed as per parent's responsibility
                                    //     const response = await fetch(`${backendUrl}/api/v1/workflow/config`, { // Removed as per parent's responsibility
                                    //       method: 'POST', // Removed as per parent's responsibility
                                    //       headers: { // Removed as per parent's responsibility
                                    //         'Authorization': `Bearer ${token}`, // Removed as per parent's responsibility
                                    //         'Content-Type': 'application/json', // Removed as per parent's responsibility
                                    //       }, // Removed as per parent's responsibility
                                    //       body: JSON.stringify({ steps: withExplicitEnabled(updatedSteps) }), // Removed as per parent's responsibility
                                    //     }); // Removed as per parent's responsibility
                                    //     if (!response.ok) throw new Error('Failed to save workflow configuration'); // Removed as per parent's responsibility
                                    //   } catch (err) { // Removed as per parent's responsibility
                                    //     setError(err instanceof Error ? err.message : 'Failed to save configuration'); // Removed as per parent's responsibility
                                    //   } finally { // Removed as per parent's responsibility
                                    //     setSaving(false); // Removed as per parent's responsibility
                                    //   } // Removed as per parent's responsibility
                                    // })(); // Removed as per parent's responsibility
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
                                      // disabled={saving} // Removed as per parent's responsibility
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
                    onClick={e => { e.stopPropagation(); handleAddStep(); }}
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
          {/* Removed saving and saving UI */}
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
      {/* Modal for workflow deletion */}
      {showDeleteWorkflowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Workflow</h3>
            <p className="mb-6">Are you sure you want to delete the workflow <span className="font-bold">{groupName || 'this workflow'}</span>? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowDeleteWorkflowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => { setShowDeleteWorkflowModal(false); onDeleteGroup && onDeleteGroup(); }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 