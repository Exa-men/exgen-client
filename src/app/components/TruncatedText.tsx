"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface TruncatedTextProps {
  text: string;
  maxWords?: number;
  className?: string;
  showExpandButton?: boolean;
}

export default function TruncatedText({ 
  text, 
  maxWords = 30, 
  className = "",
  showExpandButton = true 
}: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Split text into words
  const words = text.trim().split(/\s+/);
  const shouldTruncate = words.length > maxWords;
  
  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }

  const truncatedWords = words.slice(0, maxWords);
  const truncatedText = truncatedWords.join(' ');
  const remainingWords = words.slice(maxWords);
  const remainingText = remainingWords.join(' ');

  if (showExpandButton) {
    return (
      <div className={className}>
        <span>
          {truncatedText}
          {!isExpanded && (
            <>
              <span className="text-gray-500">...</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 ml-1 text-examen-cyan hover:text-examen-cyan-600"
                onClick={() => setIsExpanded(true)}
              >
                Meer lezen
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </>
          )}
        </span>
        
        {isExpanded && (
          <div className="mt-2">
            <span>{remainingText}</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-1 text-examen-cyan hover:text-examen-cyan-600"
              onClick={() => setIsExpanded(false)}
            >
              Minder
              <ChevronUp className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Tooltip version for table cells
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${className} cursor-help`}>
            {truncatedText}
            <span className="text-gray-500">...</span>
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-3 bg-gray-900 text-white"
        >
          <p className="text-sm leading-relaxed">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 