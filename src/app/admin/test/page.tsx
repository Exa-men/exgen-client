"use client"

import React from 'react';

export default function TestPage() {
  console.log('Test page loaded');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Test Page</h1>
        <p className="text-gray-600">This is a test page to check if admin routing works.</p>
      </div>
    </div>
  );
} 