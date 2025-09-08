"use client";

import { useState, useEffect } from 'react';
import { useAdminAgents, AgentSummary } from '../../../hooks/use-admin-agents';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Activity, Users, Settings, AlertTriangle, Cpu, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';
import SystemDashboard from './SystemDashboard';

interface AdminAgentViewProps {
  onBackToChat?: () => void;
}

export default function AdminAgentView({ onBackToChat }: AdminAgentViewProps) {
  const { 
    getSystemInfo, 
    isLoading, 
    error 
  } = useAdminAgents();
  
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tools');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    try {
      // Load system info only
      const systemData = await getSystemInfo();
      
      if (systemData) {
        setSystemInfo(systemData);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };


  return (
    <div className="h-full flex flex-col bg-white/5 backdrop-blur-md rounded-lg border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/20">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-black">System Settings</h1>
          {onBackToChat && (
            <Button variant="outline" onClick={onBackToChat}>
              Back to Chat
            </Button>
          )}
        </div>
        
      </div>

      {/* Quick Stats */}
      {systemInfo && (
        <div className="p-6 border-b border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-black/70">Total Agents</p>
                    <p className="text-xl font-bold text-black">{systemInfo.agent_stats?.total || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Activity className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm text-black/70">Active Agents</p>
                    <p className="text-xl font-bold text-black">{systemInfo.agent_stats?.active || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Settings className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-sm text-black/70">Available Tools</p>
                    <p className="text-xl font-bold text-black">{systemInfo.available_tools?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Cpu className="w-8 h-8 text-orange-400" />
                  <div>
                    <p className="text-sm text-black/70">LLM Models</p>
                    <p className="text-xl font-bold text-black">{systemInfo.available_models?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="flex w-full bg-white/10 border border-white/20">
            <TabsTrigger value="tools" className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Available Tools
            </TabsTrigger>
            <TabsTrigger value="models" className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              LLM Models
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Recent Activity
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="mt-6 h-full">
            <Card className="bg-white/10 border-white/20 h-full">
              <CardHeader>
                <CardTitle className="text-black">Available Tools</CardTitle>
              </CardHeader>
              <CardContent>
                {systemInfo?.available_tools?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemInfo.available_tools.map((tool: any, index: number) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-start space-x-3">
                          <Settings className="w-5 h-5 text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-black font-medium">{tool.name.replace('_', ' ')}</h4>
                            <p className="text-black/60 text-sm mt-1">{tool.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-black/60 text-center py-8">No tools available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="models" className="mt-6 h-full">
            <Card className="bg-white/10 border-white/20 h-full">
              <CardHeader>
                <CardTitle className="text-black">Available LLM Models</CardTitle>
              </CardHeader>
              <CardContent>
                {systemInfo?.available_models?.length > 0 ? (
                  <div className="space-y-3">
                    {systemInfo.available_models.map((model: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center space-x-3">
                          <Cpu className="w-5 h-5 text-purple-400" />
                          <div>
                            <h4 className="text-black font-medium">{model.name}</h4>
                            <p className="text-black/60 text-sm">{model.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-black/70">
                          Available
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-black/60 text-center py-8">No models configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="mt-6 h-full">
            <Card className="bg-white/10 border-white/20 h-full">
              <CardHeader>
                <CardTitle className="text-black">Recent Admin Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {systemInfo?.recent_activity?.length > 0 ? (
                  <div className="space-y-3">
                    {systemInfo.recent_activity.map((activity: any, index: number) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        {(() => {
                          switch (activity.action.toLowerCase()) {
                            case 'created':
                            case 'create':
                              return <CheckCircle className="w-4 h-4 text-green-400" />;
                            case 'updated':
                            case 'update':
                              return <RefreshCw className="w-4 h-4 text-blue-400" />;
                            case 'deleted':
                            case 'delete':
                              return <XCircle className="w-4 h-4 text-red-400" />;
                            case 'activated':
                            case 'deactivated':
                              return <Activity className="w-4 h-4 text-yellow-400" />;
                            default:
                              return <Settings className="w-4 h-4 text-gray-400" />;
                          }
                        })()}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-black font-medium">{activity.admin}</span>
                            <span className="text-black/60">{activity.action}</span>
                            <Badge className={activity.success ? 'text-green-400' : 'text-red-400'}>
                              {activity.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                          {activity.timestamp && (
                            <p className="text-black/50 text-sm">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-black/40 mx-auto mb-4" />
                    <p className="text-black/60">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}