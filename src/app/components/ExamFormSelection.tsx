"use client";

import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface ExamForm {
  id: number;
  name: string;
  description: string;
  reasoning: string;
}

interface ExamFormSelectionProps {
  examFormOptions: {
    suitable_forms: ExamForm[];
    total_forms: number;
  };
  onSubmit: (selectedForms: number[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ExamFormSelection({ 
  examFormOptions, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: ExamFormSelectionProps) {
  const [selectedForms, setSelectedForms] = useState<number[]>([]);

  const handleFormToggle = (formId: number) => {
    setSelectedForms(prev => {
      if (prev.includes(formId)) {
        return prev.filter(id => id !== formId);
      } else {
        if (prev.length >= 2) {
          return prev; // Don't add if already at max
        }
        return [...prev, formId];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedForms.length > 0) {
      onSubmit(selectedForms);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Examenvorm Selectie
        </h2>
        <p className="text-gray-600">
          Ik heb geconcludeerd dat deze examenvormen het meest geschikt zijn. 
          Selecteer maximaal 2 vormen om mee door te gaan.
        </p>
      </div>

      <div className="grid gap-4 mb-6">
        {examFormOptions.suitable_forms.map((form) => (
          <div
            key={form.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedForms.includes(form.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleFormToggle(form.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedForms.includes(form.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedForms.includes(form.id) && (
                    <CheckIcon className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {form.name}
                </h3>
                <p className="text-gray-600 mb-2">
                  {form.description}
                </p>
                <p className="text-sm text-gray-500 italic">
                  {form.reasoning}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {selectedForms.length} van maximaal 2 vormen geselecteerd
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedForms.length === 0 || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verwerken...' : 'Doorgaan'}
          </button>
        </div>
      </div>
    </div>
  );
} 