"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [prompts, setPrompts] = useState<{ [key: string]: string }>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editedPromptContent, setEditedPromptContent] = useState<string>('');
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Backend step names (in order, for log matching)
  const backendStepNames = [
    "Kwalificatie specificeren",
    "Overzicht kwalificatie Voorwaarden",
    "Gedrag beginnend beroepsbeoefenaar",
    "Essentie van de kwalificatie",
    "Bepaal de leeropbrengsten",
    "Conclusie",
    "Rubriceren",
    "Examenopdracht Kandidaat",
    "Exameninstructie Beoordelaar"
  ];
  // User-friendly descriptions (for display)
  const stepDescriptions = [
    "Stap 1: Bekijk de inhoud van het kwalificatiebestand",
    "Stap 2: Inventariseer de kwalificatievoorwaarden",
    "Stap 3: Inventariseer het gedrag van een beginnend beroepsbeoefenaar",
    "Stap 4: Bepaal de essentie van de kwalificatie",
    "Stap 5: Verwachte leeropbrengsten overzichtelijk maken",
    "Stap 6: Onderbouw de conclusie over het ontwerp van het examen",
    "Stap 7: Rubriceer de leeropbrengsten",
    "Stap 8: Schrijf een examenopdracht voor de kandidaat",
    "Stap 9: Maak een instructie voor de beoordelaar",
  ];

  // Helper to determine step status from logs using backend step names
  function getStepStatuses(logs: string[], backendStepNames: string[]) {
    let foundCurrent = false;
    return backendStepNames.map((stepName, idx) => {
      // Step start: "--- Step X/"
      const started = logs.some(log => log.includes(`--- Step ${idx + 1}/`));
      // Step done: "✅ Step {stepName} successful" or "❌ Step {stepName} failed"
      const done = logs.some(
        log =>
          (log.includes(`✅ Step ${stepName} successful`) ||
           log.includes(`❌ Step ${stepName} failed`))
      );
      if (done) return "done";
      if (!foundCurrent && started) {
        foundCurrent = true;
        return "current";
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

  // Fetch prompts from backend
  const fetchPrompts = async () => {
    setLoadingPrompts(true);
    setPromptError(null);
    try {
      const res = await fetch(`${backendUrl}/api/v1/prompts`, {
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch prompts');
      const data = await res.json();
      setPrompts(data);
    } catch (err) {
      setPromptError('Failed to load prompts');
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Fetch prompts from backend on mount (for the collapsible section)
  useEffect(() => {
    fetchPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edit prompt
  const handleEditPrompt = (promptName: string) => {
    setEditingPrompt(promptName);
    setEditedPromptContent(prompts[promptName]);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setEditedPromptContent('');
  };

  // Save prompt
  const handleSavePrompt = async (promptName: string) => {
    setSavingPrompt(promptName);
    setPromptError(null);
    try {
      const res = await fetch(`${backendUrl}/api/v1/prompts/${promptName}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editedPromptContent }),
      });
      if (!res.ok) throw new Error('Failed to save prompt');
      setPrompts((prev) => ({ ...prev, [promptName]: editedPromptContent }));
      setEditingPrompt(null);
      setEditedPromptContent('');
    } catch (err) {
      setPromptError('Failed to save prompt');
    } finally {
      setSavingPrompt(null);
    }
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

            {/* Prompt Settings Collapsible Section */}
            <details className="bg-white rounded-lg p-6 shadow-md mb-8" open={false}>
              <summary className="text-xl font-semibold text-gray-800 cursor-pointer select-none mb-4">Prompt Settings</summary>
              {loadingPrompts ? (
                <div className="text-gray-600">Loading prompts...</div>
              ) : promptError ? (
                <div className="text-red-600">{promptError}</div>
              ) : (
                <div className="space-y-6 mt-4">
                  {Object.entries(prompts)
                    .sort(([a], [b]) => {
                      // _base_instructions first
                      if (a === '_base_instructions') return -1;
                      if (b === '_base_instructions') return 1;
                      // Then by numeric prefix if present
                      const numA = a.match(/^\d+/)?.[0];
                      const numB = b.match(/^\d+/)?.[0];
                      if (numA && numB) return Number(numA) - Number(numB);
                      if (numA) return -1;
                      if (numB) return 1;
                      // Otherwise alphabetical
                      return a.localeCompare(b);
                    })
                    .map(([promptName, promptContent]) => (
                      <div key={promptName} className="border-b pb-4">
                        <div className="flex items-center mb-2">
                          <span className="font-medium text-gray-700 flex-1">{promptName.replace(/_/g, ' ')}</span>
                          {editingPrompt === promptName ? (
                            <>
                              <button
                                className="text-green-600 hover:text-green-800 mr-2"
                                onClick={() => handleSavePrompt(promptName)}
                                disabled={savingPrompt === promptName}
                                title="Save"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                              <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={handleCancelEdit}
                                title="Cancel"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => handleEditPrompt(promptName)}
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                        {editingPrompt === promptName ? (
                          <textarea
                            className="w-full border rounded p-2 text-sm font-mono"
                            rows={8}
                            value={editedPromptContent}
                            onChange={e => setEditedPromptContent(e.target.value)}
                            disabled={savingPrompt === promptName}
                          />
                        ) : (
                          <pre className="bg-gray-100 rounded p-2 text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">{promptContent}</pre>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </details>

            {/* File Upload Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
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

            {/* Job Status */}
            {jobStatus && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Status</h2>
                
                <div className="space-y-4">
                  {/* Step Progress Checklist */}
                  <div>
                    <ul className="mb-4">
                      {(() => {
                        const stepStatuses = getStepStatuses(logs, backendStepNames);
                        return stepDescriptions.map((desc, idx) => {
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
                    const stepStatuses = getStepStatuses(logs, backendStepNames);
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
      </div>
    </div>
  );
}
