"use client";

import { useState } from 'react';
import { AgentSummary } from '../../../hooks/use-admin-agents';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Search, Settings, Play, Pause, Trash2, Eye, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import ConfigurationEditor from './ConfigurationEditor';

interface AgentManagementGridProps {
  agents: AgentSummary[];
  systemInfo: any;
  isLoading: boolean;
  error: string | null;
  filters: {
    agent_type: string;
    is_active: boolean | undefined;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
}

export default function AgentManagementGrid({
  agents,
  systemInfo,
  isLoading,
  error,
  filters,
  onFiltersChange,
  onRefresh
}: AgentManagementGridProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const [showConfigEditor, setShowConfigEditor] = useState(false);

  // Handle search input
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  // Handle agent type filter
  const handleAgentTypeChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      agent_type: value === 'all' ? '' : value 
    });
  };

  // Handle status filter
  const handleStatusChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      is_active: value === 'all' ? undefined : value === 'active' 
    });
  };

  // Handle configure agent
  const handleConfigureAgent = (agent: AgentSummary) => {
    setSelectedAgent(agent);
    setShowConfigEditor(true);
  };

  // Get health indicator
  const getHealthIndicator = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get agent type color
  const getAgentTypeColor = (type: string) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-black/70">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-black mb-2">Failed to load agents</p>
            <p className="text-black/70 text-sm mb-4">{error}</p>
            <Button onClick={onRefresh} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-black">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-black/70">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black/50" />
                <Input
                  placeholder="Search agents..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-black placeholder-black/50"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-black/70">Agent Type</label>
              <Select value={filters.agent_type || 'all'} onValueChange={handleAgentTypeChange}>
                <SelectTrigger className="bg-white/10 border-white/30 text-black">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="exam_creator">Exam Creator</SelectItem>
                  <SelectItem value="validator">Validator</SelectItem>
                  <SelectItem value="analyzer">Analyzer</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-black/70">Status</label>
              <Select 
                value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="bg-white/10 border-white/30 text-black">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.agent_id} className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-black text-lg mb-2">{agent.name}</CardTitle>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className={`text-xs ${getAgentTypeColor(agent.type)}`}>
                      {agent.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge className={agent.is_active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {getHealthIndicator(agent.configuration_health)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-black/70 text-sm mb-4 line-clamp-2">{agent.description}</p>
              
              {/* Agent Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-black/70">Model:</span>
                  <span className="text-black">{agent.llm_model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black/70">Temperature:</span>
                  <span className="text-black">{agent.temperature}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black/70">Tools:</span>
                  <span className="text-black">{agent.enabled_tools_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black/70">Memory:</span>
                  <span className="text-black">{agent.memory_size}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConfigureAgent(agent)}
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </Button>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline">
                  {agent.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold text-black mb-2">No agents found</h3>
          <p className="text-black/70 mb-4">
            {filters.search || filters.agent_type || filters.is_active !== undefined
              ? 'Try adjusting your filters to see more agents.'
              : 'Create your first agent to get started.'}
          </p>
          {(!filters.search && !filters.agent_type && filters.is_active === undefined) && (
            <Button onClick={() => window.location.reload()}>
              Create First Agent
            </Button>
          )}
        </div>
      )}

      {/* Configuration Editor Modal */}
      {showConfigEditor && selectedAgent && (
        <ConfigurationEditor
          agent={selectedAgent}
          isOpen={showConfigEditor}
          onClose={() => {
            setShowConfigEditor(false);
            setSelectedAgent(null);
          }}
          onSave={() => {
            setShowConfigEditor(false);
            setSelectedAgent(null);
            onRefresh();
          }}
          systemInfo={systemInfo}
        />
      )}
    </div>
  );
}