"use client";

import { useState, useEffect } from 'react';
import { useAdminAgents, TemplateSummary } from '../../../hooks/use-admin-agents';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Loader2, FileText, Wand2, BarChart3, Settings, ArrowRight } from 'lucide-react';

interface TemplateSelectorProps {
  onSelectTemplate: (template: any) => void;
  onSkipTemplate: () => void;
}

export default function TemplateSelector({ onSelectTemplate, onSkipTemplate }: TemplateSelectorProps) {
  const { getTemplates, isLoading } = useAdminAgents();
  const [templates, setTemplates] = useState<{
    system_templates: TemplateSummary[];
    custom_templates: TemplateSummary[];
  }>({ system_templates: [], custom_templates: [] });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templatesData = await getTemplates();
      if (templatesData) {
        setTemplates({
          system_templates: templatesData.system_templates || [],
          custom_templates: templatesData.custom_templates || []
        });
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'exam_creator':
        return <FileText className="w-6 h-6 text-blue-400" />;
      case 'validator':
        return <Wand2 className="w-6 h-6 text-green-400" />;
      case 'analyzer':
        return <BarChart3 className="w-6 h-6 text-purple-400" />;
      default:
        return <Settings className="w-6 h-6 text-gray-400" />;
    }
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'exam_creator':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'validator':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'analyzer':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const handleTemplateSelect = (template: TemplateSummary) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  const TemplateCard = ({ template }: { template: TemplateSummary }) => (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        selectedTemplate?.id === template.id
          ? 'bg-blue-500/20 border-blue-400 shadow-lg shadow-blue-400/20'
          : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/40'
      }`}
      onClick={() => handleTemplateSelect(template)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getTemplateIcon(template.agent_type)}
            <div>
              <CardTitle className="text-white text-lg">{template.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getTemplateTypeColor(template.agent_type)}>
                  {template.agent_type.replace('_', ' ').toUpperCase()}
                </Badge>
                {template.is_system_template && (
                  <Badge variant="outline" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">Used {template.usage_count} times</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-white/70 text-sm mb-3 line-clamp-3">
          {template.description || 'No description available'}
        </p>
        
        <div className="flex justify-between items-center text-xs text-white/50">
          <span>
            {template.created_at && new Date(template.created_at).toLocaleDateString()}
          </span>
          <span>
            {template.created_by && `by ${template.created_by}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white/70">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Start Option */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-400/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-black text-lg font-semibold mb-2">Start from scratch</h3>
              <p className="text-black/70 text-sm">
                Create a custom agent without using a template. You'll configure everything manually.
              </p>
            </div>
            <Button
              onClick={onSkipTemplate}
              variant="outline"
              className="ml-4"
            >
              Create Custom
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Selection */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">Or choose a template</h3>
        
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
            <TabsTrigger value="system" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              System Templates
            </TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Custom Templates ({templates.custom_templates.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="system" className="mt-6">
            {templates.system_templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.system_templates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/5 border-white/20">
                <CardContent className="p-8 text-center">
                  <Settings className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">No system templates available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="custom" className="mt-6">
            {templates.custom_templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.custom_templates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/5 border-white/20">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60 mb-2">No custom templates yet</p>
                  <p className="text-white/40 text-sm">
                    Custom templates will appear here after you create and save them
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <Card className="bg-blue-500/10 border-blue-400/30">
          <CardHeader>
            <CardTitle className="text-white">Selected Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTemplateIcon(selectedTemplate.agent_type)}
                <div>
                  <h4 className="text-white font-medium">{selectedTemplate.name}</h4>
                  <p className="text-white/70 text-sm">{selectedTemplate.description}</p>
                </div>
              </div>
              <Badge className={getTemplateTypeColor(selectedTemplate.agent_type)}>
                {selectedTemplate.agent_type.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">
                <p>Used {selectedTemplate.usage_count} times</p>
                {selectedTemplate.last_used_at && (
                  <p>Last used: {new Date(selectedTemplate.last_used_at).toLocaleDateString()}</p>
                )}
              </div>
              
              <Button onClick={handleUseTemplate} className="bg-blue-600 hover:bg-blue-700">
                Use This Template
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}