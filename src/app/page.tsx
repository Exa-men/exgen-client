"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { PencilIcon, CheckIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import WorkflowConfig from './components/WorkflowConfig';
import Phase2Continuation from './components/Phase2Continuation';
import EnhancedWorkflow from './components/EnhancedWorkflow';

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

export default function Home() {
  const { data: session } = useSession();
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [templateName, setTemplateName] = useState("Assessment template_1");
  const [outputTitle, setOutputTitle] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showPhase2, setShowPhase2] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [originalXmlPath, setOriginalXmlPath] = useState<string | null>(null);
  const [workflowMode, setWorkflowMode] = useState<'original' | 'phase2' | 'enhanced'>('original');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // State for dynamic step names
  const [dynamicStepNames, setDynamicStepNames] = useState<string[]>([]);
  const [dynamicStepDescriptions, setDynamicStepDescriptions] = useState<string[]>([]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Fetch step names from backend on mount
  useEffect(() => {
    const fetchStepNames = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/v1/workflow/config`, {
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch workflow config');
        const data = await response.json();
        const names = data.steps.map((step: any) => step.name);
        const descriptions = data.steps.map((step: any) => step.description);
        setDynamicStepNames(names);
        setDynamicStepDescriptions(descriptions);
      } catch (err) {
        setDynamicStepNames([]);
        setDynamicStepDescriptions([]);
      }
    };
    fetchStepNames();
  }, [backendUrl]);

  // Helper to determine step status from logs using backend step names
  function getStepStatuses(logs: string[], backendStepNames: string[]) {
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
  }

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
      } else {
        alert("Please upload an XML file");
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/xml" || file.type === "text/xml" || file.name.endsWith('.xml')) {
        setSelectedFile(file);
      } else {
        alert("Please upload an XML file");
      }
    }
  };

  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);

  // Reset uploadedFilePath if file or workflow mode changes
  useEffect(() => {
    setUploadedFilePath(null);
  }, [selectedFile, workflowMode]);

  const uploadFile = async () => {
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    setIsUploading(true);
    setLogs([]);
    setJobStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('template_name_or_id', templateName);

      const response = await fetch(`${backendUrl}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
        },
        body: formData,
      });

      if (response.ok) {
        const jobData = await response.json();
        // Try to get file_path from backend, fallback to uploads/selectedFile.name
        setUploadedFilePath(jobData.file_path || `uploads/${selectedFile.name}`);
        setJobStatus(jobData);
        console.log("Job created:", jobData);
        // Start polling for job status
        pollJobStatus(jobData.job_id);
      } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/v1/jobs/${jobId}`, {
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
          },
        });

        if (response.ok) {
          const statusData = await response.json();
          setJobStatus(statusData);
          setLogs(statusData.logs || []);
          
          console.log("Job status:", statusData);
          console.log("Job result:", statusData.result);
          
          if (statusData.status === 'completed' || statusData.status === 'failed') {
            clearInterval(pollInterval);
            if (statusData.status === 'completed') {
              console.log("Job completed successfully!");
              console.log("Full result object:", statusData.result);
              if (statusData.result?.generated_document) {
                console.log("Generated document:", statusData.result.generated_document);
                // Store document ID for Phase 2 continuation
                setCurrentDocumentId(statusData.result.generated_document.document_id);
                // Store original XML path if available
                if (selectedFile?.name) {
                  setOriginalXmlPath(selectedFile.name);
                }
              } else {
                console.log("No generated_document in result");
              }
            } else {
              console.error("Job failed:", statusData.result);
            }
          }
        } else {
          console.error("Failed to get job status:", response.status);
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
  };

  const callApi = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
        },
      });
      
      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status}, body: ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Response data:", data);
      alert(`API Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error("API call failed:", error);
      alert(`API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCors = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/test`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
        },
      });
      
      console.log("CORS test response status:", res.status);
      
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

  // Temporary debug: print logs from backend
  console.log("Logs from backend:", logs);

  // Scroll to bottom when logs change and logs are visible
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Helper: Render the 5-phase stepper (greyed out if no file uploaded)
  const renderEnhancedStepper = () => {
    const phases = [
      {
        id: 1,
        name: "Phase 1: Qualification Analysis",
        description: "AI analyzes the XML document and extracts key information",
        steps: [
          "XML to JSON Extraction",
          "Qualification Summary",
          "Qualification Requirements",
          "Behavioral Expectations",
          "Qualification Essence",
          "Learning Outcomes",
          "Assessment Form Suggestions"
        ]
      },
      {
        id: 2,
        name: "Phase 2: Expert Revision",
        description: "User selects assessment forms from AI suggestions",
        steps: ["Assessment Form Selection"]
      },
      {
        id: 3,
        name: "Phase 3: Assessment Creation",
        description: "AI creates assessment documents based on selected forms",
        steps: [
          "Conclusion",
          "Rubric Creation",
          "Learning Outcomes Mapping",
          "Assessment Plan",
          "Candidate Assignment",
          "Assessor Instructions"
        ]
      },
      {
        id: 4,
        name: "Phase 4: Final Review",
        description: "User reviews generated documents",
        steps: ["Document Review"]
      },
      {
        id: 5,
        name: "Phase 5: Assembly",
        description: "Final assembly and packaging",
        steps: ["Document Assembly", "Package Creation"]
      }
    ];
    const isGreyed = !selectedFile;
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Workflow Steps</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {phases.map(phase => (
            <div key={phase.id} className={`rounded-lg p-4 border ${isGreyed ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
              <div className="font-bold mb-1">{phase.name}</div>
              <div className="text-xs mb-2">{phase.description}</div>
              <ul className="text-xs list-disc ml-4">
                {phase.steps.map((step, idx) => (
                  <li key={idx} className={isGreyed ? 'text-gray-300' : 'text-blue-900'}>{step}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Exa.men</h1>
        
        {!session ? (
          <div className="text-center">
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => signIn("google")}
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* User Info */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Signed in as</p>
                  <p className="font-semibold text-gray-800">{session.user?.email}</p>
                </div>
                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                  onClick={() => signOut()}
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Workflow Configuration Section */}
            <WorkflowConfig backendUrl={backendUrl} />

            {/* Workflow Mode Selection */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Workflow Mode</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setWorkflowMode('original')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    workflowMode === 'original'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold mb-2">Original Workflow</div>
                  <div className="text-sm text-gray-600">
                    Standard 9-step LLM processing chain
                  </div>
                </button>
                
                <button
                  onClick={() => setWorkflowMode('phase2')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    workflowMode === 'phase2'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold mb-2">Phase 2 Workflow</div>
                  <div className="text-sm text-gray-600">
                    Original + Phase 2 automation
                  </div>
                </button>
                
                <button
                  onClick={() => setWorkflowMode('enhanced')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    workflowMode === 'enhanced'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold mb-2">Enhanced Workflow</div>
                  <div className="text-sm text-gray-600">
                    5-phase workflow with user interactions
                  </div>
                </button>
              </div>
            </div>

            {/* Always show file upload section */}
            <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
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
                    <option value="Assessment template_1">Assessment template_1</option>
                  </select>
                  {/* Custom arrow */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                      <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available template: "Assessment template_1"
                </p>
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

            {/* Enhanced Workflow Stepper (always visible in enhanced mode) */}
            {workflowMode === 'enhanced' && renderEnhancedStepper()}

            {/* Enhanced Workflow component (only interactive after file upload) */}
            {workflowMode === 'enhanced' && uploadedFilePath && (
              <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
                <EnhancedWorkflow
                  filePath={uploadedFilePath}
                  templateNameOrId={templateName}
                  outputTitle={outputTitle}
                  onComplete={(result) => {
                    console.log('Enhanced workflow completed:', result);
                  }}
                />
              </div>
            )}

            {/* Job Status - Original/Phase2 Workflows */}
            {(workflowMode === 'original' || workflowMode === 'phase2') && jobStatus && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Status</h2>
                
                <div className="space-y-4">
                  {/* Step Progress Checklist */}
                  <div>
                    <ul className="mb-4">
                      {(() => {
                        const stepStatuses = getStepStatuses(logs, dynamicStepNames);
                        return dynamicStepDescriptions.map((desc, idx) => {
                          const status = stepStatuses[idx];
                          let icon = null;
                          let textClass = "text-gray-700";
                          if (status === "done") {
                            icon = <span className="mr-2 text-green-600">✅</span>;
                            textClass = "text-green-700 font-semibold";
                          } else if (status === "current") {
                            icon = <span className="mr-2 animate-spin inline-block" style={{fontSize: '1.2em'}}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                            </span>;
                            textClass = "text-blue-700 font-semibold";
                          } else {
                            icon = <span className="mr-2 text-gray-400">⬜</span>;
                          }
                          return (
                            <li key={idx} className={`flex items-center mb-1`}>
                              {icon}
                              <span className={textClass}>{desc}</span>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${jobStatus.progress}%` }}
                    ></div>
                  </div>

                  {/* Processing Logs (collapsed by default, auto-scroll to bottom) */}
                  <details className="mt-6" open={false}>
                    <summary className="cursor-pointer font-semibold text-gray-700 mb-2">Processing Logs</summary>
                    <div className="bg-gray-100 rounded p-3 max-h-64 overflow-y-auto" style={{ position: 'relative' }}>
                      {logs.map((log, index) => (
                        <div key={index} className="text-sm text-gray-700 mb-1">
                          {log}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </details>

                  {/* After the checklist and before the document link, show a status indicator if all steps are done but jobStatus.status is not 'completed' */}
                  {(() => {
                    const stepStatuses = getStepStatuses(logs, dynamicStepNames);
                    const allStepsDone = stepStatuses.every(s => s === 'done');
                    if (allStepsDone && jobStatus.status !== 'completed') {
                      return (
                        <div className="flex items-center space-x-2 text-blue-700 font-semibold text-lg">
                          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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
                      <h3 className="font-medium text-green-800 mb-2">Document Generated Successfully!</h3>
                      <p className="text-sm text-green-700 mb-3">
                        {jobStatus.result.generated_document.document_title}
                      </p>
                      <div className="flex space-x-2">
                        <a
                          href={jobStatus.result.generated_document.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          📄 Open in Google Docs
                        </a>
                        <button
                          onClick={() => setShowPhase2(true)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <ArrowRightIcon className="h-4 w-4 mr-2" />
                          Continue to Phase 2
                        </button>
                      </div>
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

            {/* Phase 2 Continuation - Original/Phase2 Workflows */}
            {(workflowMode === 'original' || workflowMode === 'phase2') && showPhase2 && currentDocumentId && (
              <div className="mt-8">
                <Phase2Continuation
                  documentId={currentDocumentId}
                  originalXmlPath={originalXmlPath || undefined}
                  onComplete={(result) => {
                    console.log('Phase 2 completed:', result);
                    // You can add additional handling here
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
