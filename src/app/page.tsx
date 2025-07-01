"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useCallback } from "react";

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

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">ExGen Dashboard</h1>
        
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

            {/* File Upload Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Qualification File</h2>
              
              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Assessment template_1"
                />
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
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Processing Status</h2>
                
                <div className="space-y-4">
                  {/* Status Overview */}
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(jobStatus.status)}</span>
                    <div>
                      <p className={`font-medium ${getStatusColor(jobStatus.status)}`}>
                        {jobStatus.status.charAt(0).toUpperCase() + jobStatus.status.slice(1)}
                      </p>
                      <p className="text-sm text-gray-600">{jobStatus.current_step}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${jobStatus.progress}%` }}
                    ></div>
                  </div>

                  {/* Logs */}
                  {logs.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Processing Logs</h3>
                      <div className="bg-gray-100 rounded p-3 max-h-64 overflow-y-auto">
                        {logs.map((log, index) => (
                          <div key={index} className="text-sm text-gray-700 mb-1">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

            {/* Debug Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Debug Tools</h2>
              <div className="flex space-x-4">
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                  onClick={callApi}
                >
                  Test API
                </button>
                <button
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                  onClick={testCors}
                >
                  Test CORS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
