"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  getRolePerformanceMetrics, 
  logRolePerformance, 
  resetRolePerformance 
} from '../../lib/role-performance';

const RolePerformanceDebug: React.FC = () => {
  const [metrics, setMetrics] = useState(getRolePerformanceMetrics());
  const [isVisible, setIsVisible] = useState(false);

  // Update metrics every second
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setMetrics(getRolePerformanceMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Toggle visibility with keyboard shortcut (Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-white/80 backdrop-blur-sm"
        >
          🔍 Role Debug
        </Button>
      </div>
    );
  }

  const cacheHitRate = metrics.totalApiCalls > 0 
    ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 
    : 0;

  const duplicateRate = metrics.totalApiCalls > 0 
    ? (metrics.duplicateRequests / metrics.totalApiCalls) * 100 
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">🔍 Role Performance</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logRolePerformance();
                }}
                className="text-xs"
              >
                Log
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetRolePerformance();
                  setMetrics(getRolePerformanceMetrics());
                }}
                className="text-xs"
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-xs"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {/* API Calls */}
          <div className="flex justify-between items-center">
            <span>API Calls:</span>
            <Badge variant="outline">{metrics.totalApiCalls}</Badge>
          </div>

          {/* Cache Performance */}
          <div className="flex justify-between items-center">
            <span>Cache Hits:</span>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              {metrics.cacheHits}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Cache Misses:</span>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              {metrics.cacheMisses}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Hit Rate:</span>
            <Badge variant="outline" className={cacheHitRate > 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {cacheHitRate.toFixed(1)}%
            </Badge>
          </div>

          {/* Duplicate Requests */}
          <div className="flex justify-between items-center">
            <span>Duplicates:</span>
            <Badge variant="outline" className={duplicateRate < 20 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
              {metrics.duplicateRequests} ({duplicateRate.toFixed(1)}%)
            </Badge>
          </div>

          {/* Response Time */}
          <div className="flex justify-between items-center">
            <span>Avg Response:</span>
            <Badge variant="outline" className={metrics.averageResponseTime < 200 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {metrics.averageResponseTime.toFixed(0)}ms
            </Badge>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last: {new Date(metrics.lastUpdated).toLocaleTimeString()}
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className="text-xs text-gray-400 text-center">
            Ctrl+Shift+R to toggle
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePerformanceDebug;
