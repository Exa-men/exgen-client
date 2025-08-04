"use client";

import { SignIn, SignUp, UserButton, useUser, useClerk, useAuth } from '@clerk/nextjs';
import { useState, useRef, useCallback, useEffect } from "react";
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import WorkflowConfig from '../components/WorkflowConfig';
import WorkflowGroups from '../components/WorkflowGroups';
import { AdminOnly } from '../../components/RoleGuard';


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
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [templateName, setTemplateName] = useState("Examentemplate vanaf 2025-26");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // State for dynamic step names
  const [dynamicStepNames, setDynamicStepNames] = useState<string[]>([]);
  const [dynamicStepDescriptions, setDynamicStepDescriptions] = useState<string[]>([]);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Fetch step names and descriptions from backend
  const fetchStepNamesAndDescriptions = useCallback(async () => {
    if (!isSignedIn) return;
    
    setIsLoadingSteps(true);
    try {
      const token = await getToken();
      const response = await fetch(`${backendUrl}/api/v1/workflow/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow config: ${response.status}`);
      }
      
      const data = await response.json();
      const names = data.steps?.map((step: any) => step.name) || [];
      const descriptions = data.steps?.map((step: any) => step.description) || [];
      setDynamicStepNames(names);
      setDynamicStepDescriptions(descriptions);
      setError(null);
    } catch (err) {
      console.error('Error fetching step names:', err);
      setError('Failed to load workflow configuration');
      setDynamicStepNames([]);
      setDynamicStepDescriptions([]);
    } finally {
      setIsLoadingSteps(false);
    }
  }, [backendUrl, getToken, isSignedIn]);

  // Fetch on mount and when user signs in
  useEffect(() => {
    if (isSignedIn) {
      fetchStepNamesAndDescriptions();
    }
  }, [isSignedIn, fetchStepNamesAndDescriptions]);

  // Helper to determine step status from logs using backend step names
  const getStepStatuses = useCallback((logs: string[], backendStepNames: string[]) => {
    if (!logs || logs.length === 0 || !backendStepNames || backendStepNames.length === 0) {
      return backendStepNames.map(() => "pending");
    }

    // Only consider logs from the first LLM step onwards
    const firstLLMStepIdx = logs.findIndex(log => log.includes('--- Step 1/'));
    const relevantLogs = firstLLMStepIdx >= 0 ? logs.slice(firstLLMStepIdx) : logs;
    let foundCurrent = false;
    
    return backendStepNames.map((stepName, idx) => {
      // Step done: "✅ Step {stepName} successful" or "❌ Step {stepName} failed"
      const done = relevantLogs.some(
        log =>
          (log.includes(`✅ Step ${stepName} successful`) ||
           log.includes(`❌ Step ${stepName} failed`))
      );
      if (done) return "done";
      
      if (!foundCurrent) {
        // First not-done step that has started is current
        const started = relevantLogs.some(log => log.includes(`--- Step ${idx + 1}/`));
        if (started) {
          foundCurrent = true;
          return "current";
        }
      }
      return "pending";
    });
  }, []);

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
      if (file.type === "application/xml" || file.type === "text/xml" || file.name.endsWith('.xml') ||
          file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload a PDF or XML file");
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/xml" || file.type === "text/xml" || file.name.endsWith('.xml') ||
          file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload a PDF or XML file");
      }
    }
  }, []);

  // Clean up polling interval
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    cleanupPolling(); // Clean up any existing polling
    
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
          if (statusData.status === 'completed') {
            if (statusData.result?.generated_document) {
            } else {
            }
          } else {
            console.error("Job failed:", statusData.result);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        setError('Failed to get job status');
        cleanupPolling();
      }
    }, 2000); // Poll every 2 seconds
  }, [backendUrl, getToken, cleanupPolling]);

  // Update uploadFile to refetch steps before starting job
  const uploadFile = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setIsUploading(true);
    setLogs([]);
    setJobStatus(null);
    setError(null);

    try {
      // Always get latest steps before starting
      await fetchStepNamesAndDescriptions();
      
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
      
      // Start polling for job status
      pollJobStatus(jobData.job_id);
    } catch (error) {
      console.error("Upload error:", error);
      setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, templateName, fetchStepNamesAndDescriptions, getToken, backendUrl, pollJobStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPolling();
    };
  }, [cleanupPolling]);

  const callApi = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status}, body: ${errorText}`);
      }
      
      const data = await res.json();
      alert(`API Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error("API call failed:", error);
      alert(`API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCors = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/api/v1/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("CORS test error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status}, body: ${errorText}`);
      }
      
      const data = await res.json();
      alert(`CORS Test Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error("CORS test failed:", error);
      alert(`CORS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'text-yellow-600';
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  // Scroll to bottom when logs change and logs are visible
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

  if (!isSignedIn) {
    return null; // Will redirect
  }

  return (
    <AdminOnly
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
        </div>
      }
    >
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title and subtitle */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ontwikkelen</h1>
          </div>
          <WorkflowGroups />
          
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
                  <option value="Valideren">Valideren</option>
                  <option value="Blueprint">Blueprint</option>
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
                    {selectedFile ? selectedFile.name : "Drag and drop your PDF or XML file here"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,application/xml,text/xml,.pdf,application/pdf"
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
                  {isLoadingSteps ? (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Loading workflow steps...</span>
                    </div>
                  ) : (
                    <ul className="mb-4">
                      {(() => {
                        const stepStatuses = getStepStatuses(logs, dynamicStepNames);
                        return dynamicStepNames.map((name, idx) => {
                          const status = stepStatuses[idx];
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
                        });
                      })()}
                    </ul>
                  )}
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
      </main>
    </AdminOnly>
  );
} 