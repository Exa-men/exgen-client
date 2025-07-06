"use client";

import { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  XMarkIcon, 
  DocumentTextIcon, 
  TableCellsIcon, 
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface EnhancedWorkflowProps {
  filePath: string;
  templateNameOrId: string;
  outputTitle?: string;
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

interface Phase {
  id: number;
  name: string;
  description: string;
  steps: Step[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface Step {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export default function EnhancedWorkflow({ filePath, templateNameOrId, outputTitle, onComplete }: EnhancedWorkflowProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([1]);
  const [isStarting, setIsStarting] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Define the 5 phases
  const phases: Phase[] = [
    {
      id: 1,
      name: "Phase 1: Qualification Analysis",
      description: "AI analyzes the XML document and extracts key information",
      steps: [
        { id: 0, name: "XML to JSON Extraction", description: "Extract XML elements and store in JSON format", status: 'pending' },
        { id: 1, name: "Qualification Summary", description: "Generate qualification summary", status: 'pending' },
        { id: 2, name: "Qualification Requirements", description: "Analyze qualification requirements", status: 'pending' },
        { id: 3, name: "Behavioral Expectations", description: "Define behavioral expectations", status: 'pending' },
        { id: 4, name: "Qualification Essence", description: "Identify qualification essence", status: 'pending' },
        { id: 5, name: "Learning Outcomes", description: "Determine learning outcomes", status: 'pending' },
        { id: 6, name: "Assessment Form Suggestions", description: "Suggest feasible assessment forms", status: 'pending' }
      ],
      status: 'pending'
    },
    {
      id: 2,
      name: "Phase 2: Expert Revision",
      description: "User selects assessment forms from AI suggestions",
      steps: [
        { id: 7, name: "Assessment Form Selection", description: "Select assessment forms", status: 'pending' }
      ],
      status: 'pending'
    },
    {
      id: 3,
      name: "Phase 3: Assessment Creation",
      description: "AI creates assessment documents based on selected forms",
      steps: [
        { id: 8, name: "Conclusion", description: "Generate conclusion with assessment forms", status: 'pending' },
        { id: 9, name: "Rubric Creation", description: "Create assessment rubrics", status: 'pending' },
        { id: 10, name: "Learning Outcomes Mapping", description: "Map outcomes to assessment forms", status: 'pending' },
        { id: 11, name: "Assessment Plan", description: "Generate assessment plan input", status: 'pending' },
        { id: 12, name: "Candidate Assignment", description: "Create candidate assignment", status: 'pending' },
        { id: 13, name: "Assessor Instructions", description: "Create assessor instructions", status: 'pending' }
      ],
      status: 'pending'
    },
    {
      id: 4,
      name: "Phase 4: Final Review",
      description: "User reviews generated documents",
      steps: [
        { id: 14, name: "Document Review", description: "Review generated documents", status: 'pending' }
      ],
      status: 'pending'
    },
    {
      id: 5,
      name: "Phase 5: Assembly",
      description: "Final assembly and packaging",
      steps: [
        { id: 15, name: "Document Assembly", description: "Assemble final documents", status: 'pending' },
        { id: 16, name: "Package Creation", description: "Create final package", status: 'pending' }
      ],
      status: 'pending'
    }
  ];

  const startWorkflow = async () => {
    setIsStarting(true);

    try {
      const response = await fetch(`${backendUrl}/api/v1/enhanced/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer frontend-secret-key',
        },
        body: JSON.stringify({
          file_path: filePath,
          template_name_or_id: templateNameOrId,
          output_title: outputTitle
        }),
      });

      if (response.ok) {
        const jobData = await response.json();
        setJobStatus(jobData);
        console.log('Enhanced workflow job created:', jobData);
        
        // Start polling for job status
        pollJobStatus(jobData.job_id);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to start enhanced workflow: ${errorText}`);
      }
    } catch (error) {
      console.error('Enhanced workflow start error:', error);
      alert(`Failed to start enhanced workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStarting(false);
    }
  };

  const continueWorkflow = async () => {
    if (selectedForms.length === 0) {
      alert('Please select at least one assessment form');
      return;
    }

    if (selectedForms.length > 2) {
      alert('Maximum 2 assessment forms allowed');
      return;
    }

    setIsContinuing(true);

    try {
      const response = await fetch(`${backendUrl}/api/v1/enhanced/select-forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer frontend-secret-key',
        },
        body: JSON.stringify({
          job_id: jobStatus?.job_id,
          selected_forms: selectedForms,
          template_name_or_id: templateNameOrId,
          output_title: outputTitle
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Workflow continuation result:', result);
        
        // Continue polling for completion
        pollJobStatus(jobStatus?.job_id || '');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to continue workflow: ${errorText}`);
      }
    } catch (error) {
      console.error('Workflow continuation error:', error);
      alert(`Failed to continue workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsContinuing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/v1/enhanced/jobs/${jobId}`, {
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

  const togglePhase = (phaseId: number) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckIcon className="h-5 w-5 text-green-600" />;
      case 'failed': return <XMarkIcon className="h-5 w-5 text-red-600" />;
      case 'in_progress': return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />;
      default: return <div className="h-5 w-5 text-gray-400" />;
    }
  };

  const assessmentFormOptions = [
    "Portfolio Examen",
    "Praktijkexamen", 
    "Kennisexamen",
    "Presentatie",
    "CGI"
  ];

  const handleFormSelection = (form: string) => {
    setSelectedForms(prev => 
      prev.includes(form)
        ? prev.filter(f => f !== form)
        : prev.length < 2 ? [...prev, form] : prev
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enhanced ExGen Workflow</h2>
        <p className="text-gray-600">
          5-phase assessment generation workflow with AI analysis and human oversight.
        </p>
      </div>

      {!jobStatus ? (
        <div className="space-y-6">
          {/* Workflow Overview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Workflow Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
              {phases.map((phase) => (
                <div key={phase.id} className="text-center">
                  <div className="font-medium text-blue-800">Phase {phase.id}</div>
                  <div className="text-blue-600">{phase.name.split(':')[1]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startWorkflow}
            disabled={isStarting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isStarting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Starting Enhanced Workflow...</span>
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5" />
                <span>Start Enhanced Workflow</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Phase Display */}
          <div className="space-y-4">
            {phases.map((phase) => (
              <div key={phase.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(phase.status)}
                    <div className="text-left">
                      <h3 className={`font-semibold ${getStatusColor(phase.status)}`}>
                        {phase.name}
                      </h3>
                      <p className="text-sm text-gray-600">{phase.description}</p>
                    </div>
                  </div>
                  {expandedPhases.includes(phase.id) ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                {expandedPhases.includes(phase.id) && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="space-y-2">
                      {phase.steps.map((step) => (
                        <div key={step.id} className="flex items-center space-x-3 text-sm">
                          {getStatusIcon(step.status)}
                          <div>
                            <div className="font-medium">{step.name}</div>
                            <div className="text-gray-600">{step.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Assessment Form Selection (Phase 2) */}
          {jobStatus.status === 'phase1_complete' && jobStatus.result?.assessment_form_suggestions && (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-4">📋 Assessment Form Selection</h3>
              <p className="text-green-800 mb-4">
                Based on the qualification analysis, please select up to 2 assessment forms:
              </p>

              {/* Suggested Forms */}
              <div className="mb-4">
                <h4 className="font-medium text-green-900 mb-2">AI Suggestions:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobStatus.result.assessment_form_suggestions.map((suggestion: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="font-medium">{suggestion.form}</div>
                      <div className="text-sm text-gray-600">Score: {suggestion.feasibility_score}%</div>
                      <div className="text-sm text-gray-600">{suggestion.reasoning}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Selection */}
              <div className="mb-6">
                <h4 className="font-medium text-green-900 mb-2">Select Assessment Forms:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {assessmentFormOptions.map((form) => (
                    <label key={form} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedForms.includes(form)}
                        onChange={() => handleFormSelection(form)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{form}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {selectedForms.length}/2 forms
                </p>
              </div>

              {/* Continue Button */}
              <button
                onClick={continueWorkflow}
                disabled={isContinuing || selectedForms.length === 0}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isContinuing ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Continuing Workflow...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    <span>Continue with Selected Forms</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Job Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(jobStatus.status)}
                <div>
                  <h3 className={`font-semibold ${getStatusColor(jobStatus.status)}`}>
                    Enhanced Workflow - {jobStatus.status}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Current step: {jobStatus.current_step}
                  </p>
                </div>
              </div>
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
                  <CheckIcon className="h-4 w-4 text-green-600" />
                  <span>Status: Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">Processing Time: {jobStatus.result.processing_time?.toFixed(1)}s</span>
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