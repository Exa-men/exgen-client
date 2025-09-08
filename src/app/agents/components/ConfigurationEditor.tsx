"use client";

import { useState, useEffect } from 'react';
import { useAdminAgents, AgentSummary, AgentDetail } from '../../../hooks/use-admin-agents';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Slider } from '../../components/ui/slider';
import { Loader2, Save, X, AlertTriangle, CheckCircle, History } from 'lucide-react';

interface ConfigurationEditorProps {
  agent: AgentSummary;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  systemInfo: any;
}

export default function ConfigurationEditor({
  agent,
  isOpen,
  onClose,
  onSave,
  systemInfo
}: ConfigurationEditorProps) {
  const { 
    getAgent, 
    updateAgentConfiguration, 
    validateConfiguration,
    getConfigurationHistory,
    isLoading 
  } = useAdminAgents();
  
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null);
  const [configuration, setConfiguration] = useState<any>(null);
  const [isSaving, setSaving] = useState(false);
  const [isValidating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Load agent details
  useEffect(() => {
    if (isOpen && agent.agent_id) {
      loadAgentDetails();
    }
  }, [isOpen, agent.agent_id]);

  const loadAgentDetails = async () => {
    try {
      const details = await getAgent(agent.agent_id);
      if (details) {
        setAgentDetail(details);
        setConfiguration(details.full_configuration || {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent details');
    }
  };

  // Handle configuration changes
  const handleConfigChange = (section: string, field: string, value: any) => {
    setConfiguration((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Validate configuration
  const handleValidate = async () => {
    if (!configuration) return;
    
    setValidating(true);
    try {
      const result = await validateConfiguration(agent.agent_id, configuration);
      setValidationResult(result);
    } catch (err) {
      setError('Failed to validate configuration');
    } finally {
      setValidating(false);
    }
  };

  // Save configuration
  const handleSave = async () => {
    if (!configuration) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await updateAgentConfiguration(agent.agent_id, configuration);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setAgentDetail(null);
    setConfiguration(null);
    setValidationResult(null);
    setError(null);
    setActiveTab('basic');
    onClose();
  };

  if (!agentDetail || !configuration) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-black">Loading Configuration</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-black/70">Loading agent configuration...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const llmConfig = configuration.llm_config || {};
  const toolConfig = configuration.tool_config || {};
  const workflowConfig = configuration.workflow_config || {};
  const memoryConfig = configuration.memory_config || {};
  const performanceConfig = configuration.performance || {};

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20">
        <DialogHeader className="border-b border-white/20 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-xl">
              Configure Agent: {agentDetail.name}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {(() => {
                // Handle both string and object formats for configuration_health
                const healthValue = typeof agentDetail.configuration_health === 'string' 
                  ? agentDetail.configuration_health 
                  : agentDetail.configuration_health_details?.errors?.length > 0 
                    ? 'error'
                    : agentDetail.configuration_health_details?.warnings?.length > 0 
                      ? 'warning' 
                      : 'healthy';
                      
                return healthValue && (
                  <Badge className={
                    healthValue === 'healthy' ? 'bg-green-500/20 text-green-300' :
                    healthValue === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }>
                    {healthValue.charAt(0).toUpperCase() + healthValue.slice(1)}
                  </Badge>
                );
              })()}
            </div>
          </div>
        </DialogHeader>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Results */}
        {validationResult && (
          <Card className={`mb-4 ${validationResult.valid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                {validationResult.valid ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                    {validationResult.valid ? 'Configuration is valid' : 'Configuration has errors'}
                  </p>
                  {validationResult.errors?.length > 0 && (
                    <ul className="mt-2 text-red-300 text-sm list-disc list-inside">
                      {validationResult.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.warnings?.length > 0 && (
                    <ul className="mt-2 text-yellow-300 text-sm list-disc list-inside">
                      {validationResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 border border-white/20">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="llm">LLM</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Configuration */}
          <TabsContent value="basic" className="mt-6 space-y-4">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Basic Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Name</label>
                    <Input
                      value={agentDetail.name}
                      disabled
                      className="bg-white/5 border-white/20 text-white/70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Type</label>
                    <Input
                      value={agentDetail.type}
                      disabled
                      className="bg-white/5 border-white/20 text-white/70"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <Textarea
                    value={agentDetail.description}
                    disabled
                    className="bg-white/5 border-white/20 text-white/70"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={agentDetail.is_active}
                    disabled
                  />
                  <label className="text-sm text-white">Agent Active</label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LLM Configuration */}
          <TabsContent value="llm" className="mt-6 space-y-4">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Language Model Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Model</label>
                    <Select
                      value={llmConfig.model || 'gpt-4'}
                      onValueChange={(value) => handleConfigChange('llm_config', 'model', value)}
                    >
                      <SelectTrigger className="bg-white/10 border-white/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {systemInfo?.available_models?.map((model: any) => (
                          <SelectItem key={model.name} value={model.name}>
                            {model.name}
                          </SelectItem>
                        )) || [
                          <SelectItem key="gpt-4" value="gpt-4">GPT-4</SelectItem>,
                          <SelectItem key="gpt-3.5-turbo" value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        ]}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Max Tokens</label>
                    <Input
                      type="number"
                      value={llmConfig.max_tokens || 4000}
                      onChange={(e) => handleConfigChange('llm_config', 'max_tokens', parseInt(e.target.value))}
                      className="bg-white/10 border-white/30 text-white"
                      min={100}
                      max={8000}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Temperature: {llmConfig.temperature || 0.7}
                  </label>
                  <Slider
                    value={[llmConfig.temperature || 0.7]}
                    onValueChange={(value) => handleConfigChange('llm_config', 'temperature', value[0])}
                    max={1}
                    min={0}
                    step={0.1}
                    className="mt-2"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Lower values are more focused, higher values are more creative
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Configuration */}
          <TabsContent value="tools" className="mt-6 space-y-4">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Available Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {systemInfo?.available_tools?.map((tool: any) => (
                    <div key={tool.name} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                      <Switch
                        checked={toolConfig.enabled_tools?.includes(tool.name) || false}
                        onCheckedChange={(checked) => {
                          const currentTools = toolConfig.enabled_tools || [];
                          const newTools = checked
                            ? [...currentTools, tool.name]
                            : currentTools.filter((t: string) => t !== tool.name);
                          handleConfigChange('tool_config', 'enabled_tools', newTools);
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{tool.name.replace('_', ' ')}</p>
                        <p className="text-white/60 text-sm">{tool.description}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-white/60">No tools available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflow Configuration */}
          <TabsContent value="workflow" className="mt-6 space-y-4">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Workflow Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Max Retries Per Step</label>
                  <Input
                    type="number"
                    value={workflowConfig.max_retries_per_step || 3}
                    onChange={(e) => handleConfigChange('workflow_config', 'max_retries_per_step', parseInt(e.target.value))}
                    className="bg-white/10 border-white/30 text-white"
                    min={1}
                    max={10}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={workflowConfig.allow_step_skipping || false}
                    onCheckedChange={(checked) => handleConfigChange('workflow_config', 'allow_step_skipping', checked)}
                  />
                  <label className="text-sm text-white">Allow Step Skipping</label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Configuration */}
          <TabsContent value="advanced" className="mt-6 space-y-4">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Memory & Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Conversation Memory Size</label>
                    <Input
                      type="number"
                      value={memoryConfig.conversation_memory_size || 10}
                      onChange={(e) => handleConfigChange('memory_config', 'conversation_memory_size', parseInt(e.target.value))}
                      className="bg-white/10 border-white/30 text-white"
                      min={1}
                      max={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Context Retention (hours)</label>
                    <Input
                      type="number"
                      value={memoryConfig.context_retention_hours || 24}
                      onChange={(e) => handleConfigChange('memory_config', 'context_retention_hours', parseInt(e.target.value))}
                      className="bg-white/10 border-white/30 text-white"
                      min={1}
                      max={168}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={performanceConfig.enable_caching || false}
                      onCheckedChange={(checked) => handleConfigChange('performance', 'enable_caching', checked)}
                    />
                    <label className="text-sm text-white">Enable Caching</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={performanceConfig.parallel_processing || false}
                      onCheckedChange={(checked) => handleConfigChange('performance', 'parallel_processing', checked)}
                    />
                    <label className="text-sm text-white">Parallel Processing</label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>


        {/* Actions */}
        <div className="flex justify-between pt-6 border-t border-white/20">
          <div className="space-x-3">
            <Button variant="outline" onClick={handleValidate} disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate'
              )}
            </Button>
          </div>
          
          <div className="space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || (validationResult && !validationResult.valid)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}