"use client";

import { useState } from 'react';
import { useAdminAgents } from '../../../hooks/use-admin-agents';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import TemplateSelector from './TemplateSelector';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: (agent: any) => void;
  systemInfo: any;
}

interface AgentFormData {
  name: string;
  description: string;
  agent_type: string;
  system_prompt: string;
  template_id?: string;
}

export default function CreateAgentModal({
  isOpen,
  onClose,
  onAgentCreated,
  systemInfo
}: CreateAgentModalProps) {
  const { createAgent, getTemplates, isLoading } = useAdminAgents();
  
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    agent_type: '',
    system_prompt: '',
    template_id: undefined
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      name: template?.name ? `${template.name} Copy` : '',
      description: template?.description || '',
      agent_type: template?.agent_type || '',
      system_prompt: template?.configuration?.system_prompt || 'You are a helpful AI assistant.',
      template_id: template?.id
    });
    setStep('details');
  };

  // Handle skip template
  const handleSkipTemplate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      agent_type: 'general',
      system_prompt: 'You are a helpful AI assistant.',
      template_id: undefined
    });
    setStep('details');
  };

  // Handle form input changes
  const handleInputChange = (field: keyof AgentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate form
  const isFormValid = () => {
    return formData.name.trim() && 
           formData.agent_type && 
           formData.system_prompt.trim();
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newAgent = await createAgent({
        name: formData.name.trim(),
        description: formData.description.trim(),
        agent_type: formData.agent_type,
        system_prompt: formData.system_prompt.trim(),
        template_id: formData.template_id
      });

      if (newAgent) {
        onAgentCreated(newAgent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle back to template selection
  const handleBackToTemplate = () => {
    setStep('template');
    setError(null);
  };

  // Handle close modal
  const handleClose = () => {
    setStep('template');
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      agent_type: '',
      system_prompt: '',
      template_id: undefined
    });
    setError(null);
    onClose();
  };

  const agentTypes = [
    { value: 'exam_creator', label: 'Exam Creator', description: 'Creates exams and questions' },
    { value: 'validator', label: 'Validator', description: 'Validates content and documents' },
    { value: 'analyzer', label: 'Analyzer', description: 'Analyzes and provides insights' },
    { value: 'general', label: 'General', description: 'General-purpose assistant' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {step === 'template' ? 'Choose Agent Template' : 'Create New Agent'}
          </DialogTitle>
        </DialogHeader>

        {step === 'template' ? (
          <div className="space-y-6">
            <p className="text-white/70">
              Start with a template or create from scratch. Templates provide pre-configured settings optimized for specific use cases.
            </p>
            
            <TemplateSelector
              onSelectTemplate={handleTemplateSelect}
              onSkipTemplate={handleSkipTemplate}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Template Info */}
            {selectedTemplate && (
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Using template: {selectedTemplate.name}</p>
                      <p className="text-white/70 text-sm">{selectedTemplate.description}</p>
                    </div>
                    <Button variant="ghost" onClick={handleBackToTemplate} className="text-blue-400">
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Change Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {error && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <p className="text-red-400">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <Card className="bg-white/10 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Agent Name <span className="text-red-400">*</span>
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="My Agent"
                        className="bg-white/10 border-white/30 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Description
                      </label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what this agent does..."
                        className="bg-white/10 border-white/30 text-white"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Agent Type <span className="text-red-400">*</span>
                      </label>
                      <Select value={formData.agent_type} onValueChange={(value) => handleInputChange('agent_type', value)}>
                        <SelectTrigger className="bg-white/10 border-white/30 text-white">
                          <SelectValue placeholder="Select agent type" />
                        </SelectTrigger>
                        <SelectContent>
                          {agentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-sm text-gray-500">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - System Prompt */}
              <div className="space-y-4">
                <Card className="bg-white/10 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">System Prompt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        System Prompt <span className="text-red-400">*</span>
                      </label>
                      <Textarea
                        value={formData.system_prompt}
                        onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                        placeholder="You are a helpful AI assistant..."
                        className="bg-white/10 border-white/30 text-white"
                        rows={8}
                      />
                      <p className="text-xs text-white/60 mt-2">
                        This defines the agent's behavior and personality. Be specific about the agent's role and capabilities.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-6 border-t border-white/20">
              <Button variant="outline" onClick={handleBackToTemplate}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
              
              <div className="space-x-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Agent'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}