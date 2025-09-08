import React from 'react';

interface ThinkingDotsProps {
  className?: string;
}

export const ThinkingDots: React.FC<ThinkingDotsProps> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

