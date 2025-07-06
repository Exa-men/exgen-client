"use client";

import { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, DocumentTextIcon, TableCellsIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface Phase2ContinuationProps {
  documentId: string;
  originalXmlPath?: string;
  onComplete?: (result: any) => void;
}

interface JobStatus {
  job_id: string;
  status: string;
  phase: string;
  progress: number;
  current_step: string;
  logs: string[];
  result?: any;
}

export default function Phase2Continuation({ documentId, originalXmlPath, onComplete }: Phase2ContinuationProps) {
  const [version, setVersion] = useState('3.0.0');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [spreadsheetTemplateId, setSpreadsheetTemplateId] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Fetch available spreadsheet templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/v1/phase2/templates/spreadsheet`, {
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      }
    };
    fetchTemplates();
  }, [backendUrl]);

  const startPhase2Workflow = async () => {
    if (!termsAccepted) {
      alert('Please accept the terms and conditions');
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setIsStarting(true);

    try {
      const response = await fetch(`${backendUrl}/api/v1/phase2/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer frontend-secret-key',
        },
        body: JSON.stringify({
          document_id: documentId,
          version: version,
          password: password,
          terms_accepted: termsAccepted,
          spreadsheet_template_id: spreadsheetTemplateId || undefined,
          original_xml_path: originalXmlPath || undefined,
        }),
      });

      if (response.ok) {
        const jobData = await response.json();
        setJobStatus(jobData);
        console.log('Phase 2 job created:', jobData);
        
        // Start polling for job status
        pollJobStatus(jobData.job_id);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to start Phase 2: ${errorText}`);
      }
    } catch (error) {
      console.error('Phase 2 start error:', error);
      alert(`Failed to start Phase 2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStarting(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/v1/phase2/jobs/${jobId}`, {
          headers: {
            'Authorization': 'Bearer frontend-secret-key',
          },
        });

        if (response.ok) {
          const statusData = await response.json();
          setJobStatus(statusData);
          setLogs(statusData.logs || []);
          
          if (statusData.status === 'completed' || statusData.status === 'failed') {
            clearInterval(pollInterval);
            if (statusData.status === 'completed' && onComplete) {
              onComplete(statusData.result);
            }
          }
        } else {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
  };

  const finalizeWorkflow = async (approved: boolean) => {
    if (!jobStatus?.job_id) return;

    setIsFinalizing(true);

    try {
      const response = await fetch(`${backendUrl}/api/v1/phase2/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer frontend-secret-key',
        },
        body: JSON.stringify({
          job_id: jobStatus.job_id,
          approved: approved,
          notes: reviewNotes || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Finalization result:', result);
        
        // Continue polling for completion
        pollJobStatus(jobStatus.job_id);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to finalize: ${errorText}`);
      }
    } catch (error) {
      console.error('Finalization error:', error);
      alert(`Failed to finalize workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  const downloadPackage = async () => {
    if (!jobStatus?.job_id) return;

    try {
      const response = await fetch(`${backendUrl}/api/v1/phase2/download/${jobStatus.job_id}`, {
        headers: {
          'Authorization': 'Bearer frontend-secret-key',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exgen_phase2_package_v${version}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download package');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download package');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'queued': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckIcon className="h-5 w-5 text-green-600" />;
      case 'failed': return <XMarkIcon className="h-5 w-5 text-red-600" />;
      default: return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Phase 2: Document Continuation</h2>
        <p className="text-gray-600">
          Continue the automation workflow after human refinement of the Google Doc.
        </p>
      </div>

      {!jobStatus ? (
        <div className="space-y-6">
          {/* Version Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semantic Version Number
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="3.0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter a semantic version number (e.g., 3.0.0)
            </p>
          </div>

          {/* Password Protection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Protection Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 8 characters)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Password must be at least 8 characters long
            </p>
          </div>

          {/* Spreadsheet Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spreadsheet Template (Optional)
            </label>
            <select
              value={spreadsheetTemplateId}
              onChange={(e) => setSpreadsheetTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Use default template</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Select a custom spreadsheet template or use the default
            </p>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I accept the terms and conditions for document generation and agree to the processing of assessment data.
            </label>
          </div>

          {/* Start Button */}
          <button
            onClick={startPhase2Workflow}
            disabled={isStarting || !termsAccepted || password.length < 8}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isStarting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Starting Phase 2...</span>
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5" />
                <span>Start Phase 2 Workflow</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Job Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(jobStatus.status)}
                <div>
                  <h3 className={`font-semibold ${getStatusColor(jobStatus.status)}`}>
                    Phase 2 Workflow - {jobStatus.status}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Current step: {jobStatus.current_step}
                  </p>
                </div>
              </div>
              {jobStatus.status === 'completed' && (
                <button
                  onClick={downloadPackage}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span>Download Package</span>
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${jobStatus.progress}%` }}
              ></div>
            </div>

            {/* Logs Toggle */}
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showLogs ? 'Hide' : 'Show'} Processing Logs
            </button>
          </div>

          {/* Review Phase UI */}
          {jobStatus.status === 'review_ready' && jobStatus.result && (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Final Review Required</h3>
              <p className="text-blue-800 mb-4">
                Please review the generated documents and quality check results before finalizing the workflow.
              </p>

              {/* Document Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">📄 Google Document</h4>
                  <a
                    href={jobStatus.result.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm break-all"
                  >
                    {jobStatus.result.document_url}
                  </a>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">📊 Assessment Spreadsheet</h4>
                  <a
                    href={jobStatus.result.spreadsheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm break-all"
                  >
                    {jobStatus.result.spreadsheet_url}
                  </a>
                </div>
              </div>

              {/* Quality Check Results */}
              {jobStatus.result.quality_checks && (
                <div className="bg-white p-4 rounded-lg border mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">✅ Quality Check Results</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Overall Score:</span>
                      <span className={`font-bold ${jobStatus.result.quality_checks.overall_score >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {jobStatus.result.quality_checks.overall_score?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Assessment Criteria:</span>
                      <span className="text-gray-600">{jobStatus.result.assessment_criteria?.total_criteria || 0}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Behavioral Statements:</span>
                      <span className="text-gray-600">{jobStatus.result.assessment_criteria?.total_behavioral_statements || 0}</span>
                    </div>
                  </div>
                  {jobStatus.result.quality_checks.details && (
                    <div className="mt-3 text-sm">
                      {Object.entries(jobStatus.result.quality_checks.details).map(([check, result]: [string, any]) => (
                        <div key={check} className="flex items-center space-x-2 mb-1">
                          <span className={`w-4 h-4 rounded-full ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="capitalize">{check.replace('_', ' ')}:</span>
                          <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                            {result.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Review Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes (Optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about your review..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Review Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={() => finalizeWorkflow(true)}
                  disabled={isFinalizing}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isFinalizing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Finalizing...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      <span>Approve & Finalize</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => finalizeWorkflow(false)}
                  disabled={isFinalizing}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <XMarkIcon className="h-5 w-5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          )}

          {/* Logs Display */}
          {showLogs && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}

          {/* Results Display */}
          {jobStatus.status === 'completed' && jobStatus.result && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-3">Workflow Results</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <TableCellsIcon className="h-4 w-4 text-green-600" />
                  <span>Assessment Criteria: {jobStatus.result.assessment_criteria?.total_criteria || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-4 w-4 text-green-600" />
                  <span>PDF Documents: {jobStatus.result.pdf_documents?.total_pdfs || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                  <span>Quality Score: {jobStatus.result.quality_checks?.overall_score?.toFixed(1) || 'N/A'}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">Version: {jobStatus.result.version}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {jobStatus.status === 'failed' && jobStatus.result?.error && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Workflow Failed</h4>
              <p className="text-red-700">{jobStatus.result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 