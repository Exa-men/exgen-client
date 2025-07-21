"use client";

import { SignIn, SignUp, UserButton, useUser, useClerk, useAuth } from '@clerk/nextjs';
import { useState, useRef, useCallback, useEffect } from "react";
import { PlusIcon } from '@heroicons/react/24/outline';
import NewWorkflowGroup from '../components/NewWorkflowGroup';
import UnifiedHeader from '../components/UnifiedHeader';
// No longer importing ConfirmationModal

interface StepConfig {
  name: string;
  description: string;
  prompt_components: string[];
  output_type: string;
  output_variable?: string;
  model: string;
  enabled?: boolean;
}

interface Workflow {
  id: string;
  name: string;
  enabled: boolean;
  isNew?: boolean;
  config: { steps: StepConfig[] };
  prompts: { [key: string]: string };
}

interface JobStatus {
  job_id: string;
  status: string;
  progress: number;
  current_step: string;
  logs: string[];
  result?: {
    generated_document?: {
      document_id: string;
      document_url: string;
      document_title: string;
    };
    error?: string;
  };
}

export default function WorkflowsPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  
  // State for file upload and job status, re-adding error state here
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [templateName, setTemplateName] = useState("Examentemplate vanaf 2025-26");
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Removing the now-unused state for the old workflow config
  // const [dynamicStepNames, setDynamicStepNames] = useState<string[]>([]);
  // const [dynamicStepDescriptions, setDynamicStepDescriptions] = useState<string[]>([]);
  // const [isLoadingSteps, setIsLoadingSteps] = useState(false);

  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [workflowConfigs, setWorkflowConfigs] = useState<{[key: string]: StepConfig[]}>({});

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Fetch all workflows on load
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!isSignedIn) return;
      try {
        setLoadingWorkflows(true);
        const token = await getToken();
        const response = await fetch(`${backendUrl}/api/v1/workflows`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch workflows: ${response.status}`);
        }
        const data = await response.json();
        setWorkflows(data.workflows);
        setError(null);
      } catch (err) {
        console.error('Error fetching workflows:', err);
        setError('Failed to load workflow configurations');
        setWorkflows([]);
      } finally {
        setLoadingWorkflows(false);
      }
    };

    if (isSignedIn) {
      fetchWorkflows();
    }
  }, [isSignedIn, getToken, backendUrl]);

  // Set the first workflow as active once they are loaded
  useEffect(() => {
    if (!loadingWorkflows && workflows.length > 0 && !activeWorkflowId) {
      setActiveWorkflowId(workflows[0].id);
    }
  }, [workflows, loadingWorkflows, activeWorkflowId]);

  const handleAddWorkflow = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${backendUrl}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create new workflow');
      }

      const newWorkflowFromServer = await response.json();
      
      // The backend should return the full new workflow object
      // Let's assume it does, matching the Workflow interface
      setWorkflows(prev => [...prev, newWorkflowFromServer]);
      setActiveWorkflowId(newWorkflowFromServer.id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    }
  }, [getToken, backendUrl]);

  const handleUpdateWorkflow = useCallback(async (id: string, name: string, enabled: boolean) => {
    // Optimistically update the UI first for a smooth experience
    setWorkflows(prev =>
      prev.map(wf => (wf.id === id ? { ...wf, name, enabled } : wf))
    );

    try {
      const token = await getToken();
      const response = await fetch(`${backendUrl}/api/v1/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
        // Here you could add logic to revert the optimistic UI update on failure
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow');
    }
  }, [getToken, backendUrl]);

  const handleDeleteInitiated = (workflow: Workflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (workflowToDelete) {
      handleDeleteWorkflow(workflowToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setWorkflowToDelete(null);
  };

  const handleDeleteWorkflow = useCallback(async (id: string) => {
    // Optimistically update the UI for a fast response
    const originalWorkflows = workflows;
    setWorkflows(prev => prev.filter(wf => wf.id !== id));

    try {
      const token = await getToken();
      const response = await fetch(`${backendUrl}/api/v1/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }
    } catch (err) {
      // If the delete fails, revert the UI to the original state
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
      setWorkflows(originalWorkflows);
    }
  }, [workflows, getToken, backendUrl]);

  // Handlers from the original file are restored below
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/xml" || file.type === "text/xml" || file.name.endsWith('.xml')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload an XML file");
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/xml" || file.type === "text/xml" || file.name.endsWith('.xml')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload an XML file");
      }
    }
  }, []);

  // Removing the old fetchStepNamesAndDescriptions and its useEffect
  
  const getStepStatuses = useCallback((logs: string[], backendStepNames: string[]) => {
    if (!logs || logs.length === 0 || !backendStepNames || backendStepNames.length === 0) {
      return backendStepNames.map(() => "pending");
    }
    const firstLLMStepIdx = logs.findIndex(log => log.includes('--- Step 1/'));
    const relevantLogs = firstLLMStepIdx >= 0 ? logs.slice(firstLLMStepIdx) : logs;
    let foundCurrent = false;
    
    return backendStepNames.map((stepName, idx) => {
      const done = relevantLogs.some(
        log =>
          (log.includes(`✅ Step ${stepName} successful`) ||
           log.includes(`❌ Step ${stepName} failed`))
      );
      if (done) return "done";
      
      if (!foundCurrent) {
        const started = relevantLogs.some(log => log.includes(`--- Step ${idx + 1}/`));
        if (started) {
          foundCurrent = true;
          return "current";
        }
      }
      return "pending";
    });
  }, []);
  
  const cleanupPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    cleanupPolling();
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${backendUrl}/api/v1/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get job status: ${response.status}`);
        }

        const statusData = await response.json();
        setJobStatus(statusData);
        setLogs(statusData.logs || []);
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          cleanupPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
        setError('Failed to get job status');
        cleanupPolling();
      }
    }, 2000);
  }, [backendUrl, getToken, cleanupPolling]);

  // The uploadFile function no longer needs to call fetchStepNamesAndDescriptions
  const uploadFile = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }
    if (!activeWorkflowId) {
      setError("Please select a workflow to run.");
      return;
    }

    setIsUploading(true);
    setLogs([]);
    setJobStatus(null);
    setError(null);

    try {
      // No longer need to call fetchStepNamesAndDescriptions here
      
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('template_name_or_id', templateName);

      const response = await fetch(`${backendUrl}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const jobData = await response.json();
      setJobStatus(jobData);
      pollJobStatus(jobData.job_id);
    } catch (error) {
      console.error("Upload error:", error);
      setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, templateName, getToken, backendUrl, pollJobStatus, activeWorkflowId]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);


  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading authentication...</div>
        </div>
      </div>
    );
  }

  const activeWorkflowSteps = activeWorkflowId ? workflowConfigs[activeWorkflowId] : [];
  const dynamicStepNames = activeWorkflowSteps?.map(s => s.name) || [];
  const dynamicStepDescriptions = activeWorkflowSteps?.map(s => s.description) || [];

  return (
    <main className="min-h-screen bg-gray-50">
      <UnifiedHeader />

      {/* Modal overlay for sign-in */}
      {!isSignedIn && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="w-full max-w-md p-8 bg-white rounded shadow">
            <SignIn routing="hash" />
          </div>
        </div>
      )}

      {isSignedIn && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ontwikkelen</h1>
          </div>
          
          {loadingWorkflows && <div>Loading workflows...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loadingWorkflows && workflows.map(workflow => (
            <NewWorkflowGroup
              key={workflow.id}
              backendUrl={backendUrl}
              workflowId={workflow.isNew ? 'new' : workflow.id}
              initialName={workflow.name}
              initialEnabled={workflow.enabled}
              initialConfig={workflow.config}
              initialPrompts={workflow.prompts}
              onUpdate={handleUpdateWorkflow}
              onDelete={() => handleDeleteInitiated(workflow)} // Pass the whole workflow object
              isLastWorkflow={workflows.length === 1}
            />
          ))}
          
          <div className="flex justify-center my-4">
              <button
                  onClick={handleAddWorkflow}
                  className="p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                  <PlusIcon className="h-6 w-6 text-gray-500" />
              </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">❌</span>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Qualification</h2>
            
            {/* Template Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name
              </label>
              <div className="relative">
                <select
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-lg"
                  style={{ fontWeight: 500 }}
                >
                  <option value="Examentemplate vanaf 2025-26">Examentemplate vanaf 2025-26</option>
                  <option value="Kwalificerend Leren vanaf 2025-26">Kwalificerend Leren vanaf 2025-26</option>
                </select>
                {/* Custom arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    {selectedFile ? selectedFile.name : "Drag and drop your XML file here"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,application/xml,text/xml"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Browse Files
                </button>
              </div>
            </div>

            {/* Upload Button */}
            {selectedFile && (
              <div className="mt-4">
                <button
                  onClick={uploadFile}
                  disabled={isUploading}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isUploading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isUploading ? 'Processing...' : 'Generate Document'}
                </button>
              </div>
            )}
          </div>

          {/* Job Status */}
          {jobStatus && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Status</h2>
              
              <div className="space-y-4">
                {/* Step Progress Checklist */}
                <div>
                  {/* The step names and descriptions are now managed by NewWorkflowGroup */}
                  {/* We need to get them from the jobStatus or the workflow config */}
                  {/* For now, we'll use a placeholder or assume they are available */}
                  {/* A better solution would be to pass the step names/descriptions from NewWorkflowGroup */}
                  {/* For now, let's assume the first workflow's config is what we'll use for status display. */}
                  {/* This is a temporary simplification. */}
                  {/* A better solution might involve associating a job with a specific workflow run. */}
                  {(() => {
                    const stepStatuses = getStepStatuses(logs, dynamicStepNames);
                    return (
                      <ul className="mb-4">
                        {dynamicStepNames.map((name, idx) => {
                          const status = getStepStatuses(logs, dynamicStepNames)[idx];
                          let icon = null;
                          let textClass = "text-gray-700";
                          
                          if (status === "done") {
                            icon = <span className="mr-2 text-green-600">✅</span>;
                            textClass = "text-green-700 font-semibold";
                          } else if (status === "current") {
                            icon = (
                              <span className="mr-2 animate-spin inline-block" style={{fontSize: '1.2em'}}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                              </span>
                            );
                            textClass = "text-blue-700 font-semibold";
                          } else {
                            icon = <span className="mr-2 text-gray-400">⬜</span>;
                          }
                          
                          return (
                            <li key={idx} className="flex flex-col mb-1">
                              <div className="flex items-center">
                                {icon}
                                <span className={textClass}>{`Step ${idx + 1}: ${name}`}</span>
                              </div>
                              {dynamicStepDescriptions[idx] && (
                                <span className="ml-7 text-xs text-gray-500">{dynamicStepDescriptions[idx]}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(Math.max(jobStatus.progress || 0, 0), 100)}%` }}
                  ></div>
                </div>

                {/* Processing Logs (collapsed by default, auto-scroll to bottom) */}
                {logs.length > 0 && (
                  <details className="mt-6">
                    <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                      Processing Logs ({logs.length})
                    </summary>
                    <div className="bg-gray-100 rounded p-3 max-h-64 overflow-y-auto" style={{ position: 'relative' }}>
                      {logs.map((log, index) => (
                        <div key={index} className="text-sm text-gray-700 mb-1 font-mono">
                          {log}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </details>
                )}

                {/* Show preparing message when all steps are done but job not completed */}
                {(() => {
                  const stepStatuses = getStepStatuses(logs, dynamicStepNames);
                  const allStepsDone = stepStatuses.length > 0 && stepStatuses.every(s => s === 'done');
                  if (allStepsDone && jobStatus.status !== 'completed') {
                    return (
                      <div className="flex items-center space-x-2 text-blue-700 font-semibold text-lg">
                        <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Preparing the document...</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Generated Document Link */}
                {jobStatus.status === 'completed' && jobStatus.result?.generated_document && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2">Base document ready to use 🫡</h3>
                    <p className="text-sm text-green-700 mb-3">
                      {jobStatus.result.generated_document.document_title}
                    </p>
                    <a
                      href={jobStatus.result.generated_document.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      📄 Open in Google Docs
                    </a>
                  </div>
                )}

                {/* Completed but no document link - show raw result */}
                {jobStatus.status === 'completed' && !jobStatus.result?.generated_document && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Job Completed</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      The job completed successfully, but no document link was found.
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600">Show raw result data</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(jobStatus.result, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Error Display */}
                {jobStatus.status === 'failed' && jobStatus.result?.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-800 mb-2">Processing Failed</h3>
                    <p className="text-sm text-red-700">{jobStatus.result.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Modal for workflow deletion */}
      {isDeleteModalOpen && workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Workflow</h3>
            <p className="mb-6">Are you sure you want to delete <span className="font-bold">{workflowToDelete.name}</span>? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 