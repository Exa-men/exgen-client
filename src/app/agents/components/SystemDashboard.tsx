"use client";

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Activity, 
  Users, 
  Settings, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Database,
  Cpu,
  HardDrive
} from 'lucide-react';

interface SystemDashboardProps {
  systemInfo: any;
  isLoading: boolean;
}

export default function SystemDashboard({ systemInfo, isLoading }: SystemDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-black/70">Loading system information...</p>
        </div>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <p className="text-black">No system information available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const agentStats = systemInfo.agent_stats || {};
  const availableTools = systemInfo.available_tools || [];
  const availableModels = systemInfo.available_models || [];
  const recentActivity = systemInfo.recent_activity || [];

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
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
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="space-y-6">


      {/* Detailed Information Tabs */}
      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20">
          <TabsTrigger value="tools" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Available Tools
          </TabsTrigger>
          <TabsTrigger value="models" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            LLM Models
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Recent Activity
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tools" className="mt-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-black">Available Tools</CardTitle>
            </CardHeader>
            <CardContent>
              {availableTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTools.map((tool: any, index: number) => (
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
        
        <TabsContent value="models" className="mt-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-black">Available LLM Models</CardTitle>
            </CardHeader>
            <CardContent>
              {availableModels.length > 0 ? (
                <div className="space-y-3">
                  {availableModels.map((model: any, index: number) => (
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
        
        <TabsContent value="activity" className="mt-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-black">Recent Admin Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      {getActivityIcon(activity.action)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-black font-medium">{activity.admin}</span>
                          <span className="text-black/60">{activity.action}</span>
                          <Badge className={getStatusColor(activity.success)}>
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

      {/* System Health Card */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-black flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-black font-medium">Database</p>
              <p className="text-green-400 text-sm">Online</p>
            </div>
            
            <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-black font-medium">API Services</p>
              <p className="text-green-400 text-sm">Operational</p>
            </div>
            
            <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-black font-medium">Agent Runtime</p>
              <p className="text-green-400 text-sm">Ready</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}