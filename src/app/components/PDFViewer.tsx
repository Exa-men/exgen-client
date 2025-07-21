"use client";

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from './ui/button';

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export default function PDFViewer({ isOpen, onClose, pdfUrl, title }: PDFViewerProps) {
  console.log('📖 PDFViewer component rendered with props:', { isOpen, pdfUrl, title });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(3); // Mock total pages
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrlObject, setPdfUrlObject] = useState<string | null>(null);

  // Load PDF when modal opens
  useEffect(() => {
    if (isOpen && pdfUrl) {
      setCurrentPage(1);
      setScale(1);
      setRotation(0);
      setLoading(true);
      setPdfError(null);
      // Clean up previous object URL
      setPdfUrlObject((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return null;
      });
      fetch(pdfUrl)
        .then(response => {
          if (!response.ok) throw new Error('PDF niet gevonden of niet toegankelijk.');
          return response.blob();
        })
        .then(blob => {
          // Check if blob is a PDF
          if (blob.type !== 'application/pdf') {
            setPdfError('Het bestand is geen geldig PDF-document.');
            setLoading(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          setPdfUrlObject(url);
          setLoading(false);
        })
        .catch(error => {
          setPdfError(error.message || 'PDF kon niet geladen worden.');
          setLoading(false);
        });
    }
    // Cleanup on close
    return () => {
      setPdfUrlObject((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return null;
      });
    };
  }, [isOpen, pdfUrl]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        handlePreviousPage();
        break;
      case 'ArrowRight':
        handleNextPage();
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
      case 'r':
        handleRotate();
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, scale, rotation]);

  if (!isOpen) {
    console.log('🚫 PDFViewer not open, returning null');
    return null;
  }

      console.log('🎨 Rendering PDF viewer modal');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <span className="text-sm text-gray-500">
              Pagina {currentPage} van {totalPages}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="flex items-center"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="flex items-center"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            {/* Rotate Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="flex items-center"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            
            {/* Close Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex items-center"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-examen-cyan mx-auto mb-4"></div>
                <p className="text-gray-600">PDF laden...</p>
              </div>
            </div>
          )}
          
          <div className="w-full h-full overflow-auto bg-gray-100 flex items-center justify-center">
            {loading ? (
              <div className="text-center text-gray-400">PDF laden...</div>
            ) : pdfError ? (
              <div className="text-center text-red-500">{pdfError}</div>
            ) : pdfUrlObject ? (
              <iframe
                src={pdfUrlObject}
                title={title}
                className="w-[800px] h-[1100px] border border-gray-300 bg-white shadow-lg"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease-in-out'
                }}
                frameBorder={0}
                allowFullScreen
              />
            ) : (
              <div className="text-center text-gray-400">PDF niet beschikbaar</div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Vorige
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Pagina</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">van {totalPages}</span>
          </div>
          
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="flex items-center"
          >
            Volgende
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
} 