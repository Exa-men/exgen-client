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
    <div className={`relative bg-white/10 backdrop-blur-md border-r border-white/20 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-600" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-600" />
        )}
      </button>

      {/* Sidebar Content */}
      <div className="h-full flex flex-col">
        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-2 pb-0">
          {!isCollapsed ? (
            <div className="space-y-1">
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
            <div className="space-y-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`relative p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedAgentId === agent.id
                      ? 'border-2 border-blue-400 bg-blue-500/20 backdrop-blur-sm'
                      : 'hover:bg-white/10'
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
          <div className="p-2 pt-2 pb-0 border-t border-white/20">
            <p className="text-xs text-white/70 text-center">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
