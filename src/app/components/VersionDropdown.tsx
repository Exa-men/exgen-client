"use client";

import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

interface Version {
  version: string;
  releaseDate: string;
  downloadUrl?: string;
  isLatest: boolean;
}

interface VersionDropdownProps {
  versions: Version[];
  currentVersion: string;
  isPurchased: boolean;
  onVersionSelect?: (version: string) => void;
  onDownload?: (version: string, downloadUrl: string) => void;
}

export default function VersionDropdown({ 
  versions, 
  currentVersion, 
  isPurchased, 
  onVersionSelect,
  onDownload 
}: VersionDropdownProps) {
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
    onVersionSelect?.(version);
  };

  const handleDownload = (version: string, downloadUrl: string) => {
    onDownload?.(version, downloadUrl);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  // Handle case where versions array is undefined or empty
  if (!versions || versions.length === 0) {
    return (
      <Badge variant="outline" className="font-mono">
        {currentVersion}
      </Badge>
    );
  }

  // If not purchased, only show the latest version as a badge
  if (!isPurchased) {
    const latestVersion = versions.find(v => v.isLatest) || versions[0];
    return (
      <Badge variant="outline" className="font-mono">
        {latestVersion.version}
      </Badge>
    );
  }

  // For purchased products, show dropdown with all versions
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-auto p-2 font-mono"
        >
          <span className="mr-2">{selectedVersion}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-500 border-b border-gray-200">
          Beschikbare versies
        </div>
        {versions?.map((version) => (
          <DropdownMenuItem 
            key={version.version}
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => handleVersionSelect(version.version)}
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-medium">{version.version}</span>
                {version.isLatest && (
                  <Badge variant="secondary" className="text-xs">Nieuwste</Badge>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {formatDate(version.releaseDate)}
              </span>
            </div>
            
            {version.downloadUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(version.version, version.downloadUrl!);
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 