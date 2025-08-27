"use client";

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

interface Version {
  id?: string; // Add optional id field for version identification
  version: string;
  releaseDate: string;
  downloadUrl?: string;
  isLatest: boolean;
}

interface VersionDropdownProps {
  versions: Version[];
  currentVersion: string;
  isPurchased: boolean;
  onVersionSelect?: (version: string, versionId?: string) => void;
}

export default function VersionDropdown({ 
  versions, 
  currentVersion, 
  isPurchased, 
  onVersionSelect 
}: VersionDropdownProps) {
  // Find the latest version or use the first available version as fallback
  const latestVersion = versions?.find(v => v.isLatest) || versions?.[0];
  
  // Use the latest version as default if no current version is specified
  const defaultVersion = currentVersion || latestVersion?.version || 'N/A';
  
  const [selectedVersion, setSelectedVersion] = useState(defaultVersion);

  // Update selected version when versions or currentVersion changes
  useEffect(() => {
    const latestVersion = versions?.find(v => v.isLatest) || versions?.[0];
    const newDefaultVersion = currentVersion || latestVersion?.version || 'N/A';
    setSelectedVersion(newDefaultVersion);
  }, [versions, currentVersion]);

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
    // Find the version object to get the ID
    const versionObj = versions.find(v => v.version === version);
    onVersionSelect?.(version, versionObj?.id);
  };



  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null; // Return null for invalid dates
      }
      return date.toLocaleDateString('nl-NL');
    } catch {
      return null; // Return null for any date parsing errors
    }
  };

  // Use versions as provided by backend (no frontend sorting)
  // Backend handles all ordering: is_latest first, then release_date, then created_at
  const sortedVersions = versions || [];

  // Handle case where versions array is undefined or empty
  if (!versions || versions.length === 0) {
    return (
      <Badge variant="outline" className="font-mono text-gray-500">
        N/A
      </Badge>
    );
  }

  // If not purchased, only show the latest version as a badge
  if (!isPurchased) {
    const latestVersion = sortedVersions.find(v => v.isLatest) || sortedVersions[0];
    if (!latestVersion) {
      return (
        <Badge variant="outline" className="font-mono text-gray-500">
          N/A
        </Badge>
      );
    }
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
        {sortedVersions.map((version) => (
          <DropdownMenuItem 
            key={version.version}
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => handleVersionSelect(version.version)}
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-medium">{version.version}</span>
              </div>
              {formatDate(version.releaseDate) && (
                <span className="text-xs text-gray-500">
                  {formatDate(version.releaseDate)}
                </span>
              )}
            </div>
            

          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 