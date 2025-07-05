'use client';

import React, { useEffect, useState } from 'react';

interface ExtractionProgressProps {
  jobId: string;
  onExtractionComplete: (result: any) => void;
}

interface ExtractionStatus {
  status: string;
  current_step: string;
  progress: number;
  result?: any;
}

export default function ExtractionProgress({ jobId, onExtractionComplete }: ExtractionProgressProps) {
  const [status, setStatus] = useState<ExtractionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/proxy/api/v1/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY || 'frontend-secret-key'}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();
        setStatus(data);

        // Check if extraction is complete
        if (data.status === 'extraction_completed' || data.status === 'extraction_failed') {
          onExtractionComplete(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check status');
      }
    };

    // Check status immediately
    checkStatus();

    // Poll for status updates every 2 seconds
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId, onExtractionComplete]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-red-800 mb-2">Error</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Extraction Progress</h2>
        <p className="text-gray-600">
          Processing your document and creating the rubrics spreadsheet...
        </p>
      </div>

      {/* Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            status.status === 'extracting' ? 'bg-blue-100 text-blue-800' :
            status.status === 'extraction_completed' ? 'bg-green-100 text-green-800' :
            status.status === 'extraction_failed' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        
        <div className="text-sm text-gray-600">
          {status.current_step}
        </div>
      </div>

      {/* Progress Bar */}
      {status.status === 'extracting' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Result */}
      {status.status === 'extraction_completed' && status.result && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-green-800 mb-2">✅ Extraction Complete!</h3>
          <div className="text-sm text-green-700 space-y-2">
            <p><strong>Learning Objects:</strong> {status.result.learning_objects_count}</p>
            <p><strong>Spreadsheet:</strong> 
              <a 
                href={status.result.spreadsheet_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                View Spreadsheet
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Error Result */}
      {status.status === 'extraction_failed' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">❌ Extraction Failed</h3>
          <p className="text-sm text-red-600">
            {status.result?.error || 'An error occurred during extraction'}
          </p>
        </div>
      )}

      {/* Loading Animation */}
      {status.status === 'extracting' && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
}
