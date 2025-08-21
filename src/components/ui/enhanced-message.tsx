import React, { useState, useEffect } from 'react';
import { ThinkingDots } from './thinking-dots';
import { Typewriter } from './typewriter';

interface EnhancedMessageProps {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  isTyping?: boolean;
  onTypingComplete?: () => void;
  className?: string;
}

export const EnhancedMessage: React.FC<EnhancedMessageProps> = ({
  id,
  content,
  sender,
  timestamp,
  isTyping = false,
  onTypingComplete,
  className = ''
}) => {
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [showThinking, setShowThinking] = useState(isTyping);

  useEffect(() => {
    if (sender === 'agent' && content) {
      // Show thinking first, then typewriter
      setShowThinking(true);
      
      // After a short delay, show the typewriter effect
      const timer = setTimeout(() => {
        setShowThinking(false);
        setShowTypewriter(true);
      }, 1000); // 1 second thinking time

      return () => clearTimeout(timer);
    }
  }, [content, sender]);

  const handleTypingComplete = () => {
    setShowTypewriter(false);
    onTypingComplete?.();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4 ${className}`}>
      <div className={`max-w-[80%] ${sender === 'user' ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold mb-2 ${
          sender === 'user' 
            ? 'bg-blue-500 ml-2' 
            : 'bg-green-500 mr-2'
        }`}>
          {sender === 'user' ? 'U' : 'AI'}
        </div>
      </div>
      
      <div className={`max-w-[80%] ${sender === 'user' ? 'order-1' : 'order-2'}`}>
        {/* Message Content */}
        <div className={`rounded-lg px-4 py-3 ${
          sender === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}>
          {showThinking && (
            <div className="flex items-center space-x-2">
              <ThinkingDots />
              <span className="text-sm text-gray-500">AI denkt na...</span>
            </div>
          )}
          
          {showTypewriter && (
            <Typewriter
              text={content}
              speed={30}
              onComplete={handleTypingComplete}
              showCursor={true}
            />
          )}
          
          {!showThinking && !showTypewriter && (
            <div className="whitespace-pre-wrap">{content}</div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${
          sender === 'user' ? 'text-right' : 'text-left'
        }`}>
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
};

