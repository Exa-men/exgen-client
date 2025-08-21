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
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onSelect(id)}
    >
      <div className="flex items-start space-x-3">
        {/* Agent Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar name={name} size={48} />
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {name}
          </h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
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
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Configure Agent"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
