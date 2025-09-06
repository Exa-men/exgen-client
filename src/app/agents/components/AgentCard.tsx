"use client";

import { Settings } from 'lucide-react';
import Avatar from './Avatar';

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  isSelected: boolean;
  isAdmin: boolean;
  onSelect: (agentId: string) => void;
  onConfigure?: (agentId: string) => void;
}

export default function AgentCard({
  id,
  name,
  description,
  isSelected,
  isAdmin,
  onSelect,
  onConfigure
}: AgentCardProps) {
  return (
    <div
      className={`relative p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-white/10 ${
        isSelected
          ? 'border-blue-400 bg-blue-500/20 backdrop-blur-md'
          : 'border-white/30 bg-white/10 backdrop-blur-md hover:border-white/50 hover:bg-white/20'
      }`}
      onClick={() => onSelect(id)}
    >
      <div className="flex items-start space-x-2">
        {/* Agent Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar name={name} size={48} />
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-black truncate">
            {name}
          </h3>
          <p className="text-xs text-black mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Admin Configuration Gear */}
        {isAdmin && onConfigure && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfigure(id);
            }}
            className="flex-shrink-0 p-1.5 text-black/60 hover:text-black hover:bg-black/10 rounded-full transition-colors"
            title="Configure Agent"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
