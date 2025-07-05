'use client';

import React, { useState } from 'react';

interface DocumentApprovalProps {
  jobId: string;
  onApprovalComplete: (result: any) => void;
  onCancel: () => void;
}

interface ApprovalFormData {
  versionNumber: string;
  password: string;
  approved: boolean;
}

export default function DocumentApproval({ jobId, onApprovalComplete, onCancel }: DocumentApprovalProps) {
  const [formData, setFormData] = useState<ApprovalFormData>({
    versionNumber: '1.0',
    password: '',
    approved: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.approved) {
      setError('You must approve the document to continue');
      return;
    }

    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('version_number', formData.versionNumber);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('approved', formData.approved.toString());

      const response = await fetch(`/api/proxy/api/v1/approve-and-continue/${jobId}`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to approve document');
      }

      const result = await response.json();
      onApprovalComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Approval</h2>
        <p className="text-gray-600">
          Review your generated document and approve it to continue with the extraction process.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Version Number */}
        <div>
          <label htmlFor="versionNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Version Number *
          </label>
          <input
            type="text"
            id="versionNumber"
            name="versionNumber"
            value={formData.versionNumber}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 1.0, 2.1"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter password for spreadsheet protection"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This password will be used to protect the generated spreadsheet.
          </p>
        </div>

        {/* Approval Checkbox */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="approved"
            name="approved"
            checked={formData.approved}
            onChange={handleInputChange}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            required
          />
          <label htmlFor="approved" className="text-sm text-gray-700">
            I have reviewed the generated document and approve this version for extraction processing.
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.approved}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Continue & Extract'
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• The system will extract learning objects and rubrics from your document</li>
          <li>• A Google Spreadsheet will be created with variable placeholders</li>
          <li>• You'll receive a link to the generated spreadsheet</li>
        </ul>
      </div>
    </div>
  );
}
