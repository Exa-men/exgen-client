"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import AgentCard from './AgentCard';
import Avatar from './Avatar';

interface Agent {
  id: string;
  name: string;
  description: string;
}

interface AgentsSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  isAdmin: boolean;
  onSelectAgent: (agentId: string) => void;
  onConfigureAgent: (agentId: string) => void;
}

export default function AgentsSidebar({
  agents,
  selectedAgentId,
  isAdmin,
  onSelectAgent,
  onConfigureAgent
}: AgentsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`relative bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-600" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-600" />
        )}
      </button>

      {/* Sidebar Content */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Agents</h2>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          )}
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isCollapsed ? (
            <div className="space-y-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  id={agent.id}
                  name={agent.name}
                  description={agent.description}
                  isSelected={selectedAgentId === agent.id}
                  isAdmin={isAdmin}
                  onSelect={onSelectAgent}
                  onConfigure={onConfigureAgent}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`relative p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedAgentId === agent.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => onSelectAgent(agent.id)}
                  title={`${agent.name} - ${agent.description}`}
                >
                  <Avatar name={agent.name} size={32} />
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfigureAgent(agent.id);
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                      title="Configure Agent"
                    >
                      <span className="text-xs">⚙️</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
