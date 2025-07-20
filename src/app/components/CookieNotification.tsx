'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

export function CookieNotification() {
  const [isVisible, setIsVisible] = useState(false);

  const handleDownload = (fileName: string) => {
    const emptyPdfBlob = new Blob([''], {
      type: 'application/pdf'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(emptyPdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAccept = () => {
    setIsVisible(false);
    localStorage.setItem('cookieConsent', 'accepted');
  };

  const handleReject = () => {
    setIsVisible(false);
    localStorage.setItem('cookieConsent', 'rejected');
  };

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  // Don't render anything if user has already made a choice
  const consent = typeof window !== 'undefined' ? localStorage.getItem('cookieConsent') : null;
  if (consent) {
    return null;
  }

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/30 backdrop-blur-sm border-t border-gray-200 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-700">
          Exa.men gebruikt cookies voor een betere beleving.{' '}
          <button 
            onClick={() => handleDownload('cookies.pdf')}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Cookie beleid
          </button>{' '}
          voor meer details.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            className="text-sm"
          >
            Weigeren
          </Button>
          <Button
            onClick={handleAccept}
            className="text-sm bg-blue-600 hover:bg-blue-700"
          >
            Accepteren
          </Button>
        </div>
      </div>
    </div>
  );
} 