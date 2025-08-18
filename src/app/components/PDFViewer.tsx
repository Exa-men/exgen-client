"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, Printer, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import dynamic from 'next/dynamic';

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), {
  ssr: false,
  loading: () => <div className="text-center text-gray-400 p-8">PDF laden...</div>
});

const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), {
  ssr: false
});

// Set up PDF.js worker only on client side
if (typeof window !== 'undefined') {
  const { pdfjs } = require('react-pdf');
  // Use the local worker file with version check
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
  
  // Log version for debugging
  console.log('PDF.js API version:', pdfjs.version);
}

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export default function PDFViewer({ isOpen, onClose, pdfUrl, title }: PDFViewerProps) {
  const { getToken } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Calculate container width
  const calculateWidth = () => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth - 32; // Account for padding
      setContainerWidth(Math.max(400, Math.min(800, width)));
    }
  };

  // Update width on resize
  useEffect(() => {
    calculateWidth();
    window.addEventListener('resize', calculateWidth);
    return () => window.removeEventListener('resize', calculateWidth);
  }, [isOpen]);

  // Load PDF when modal opens
  useEffect(() => {
    if (isOpen && pdfUrl) {
      setCurrentPage(1);
      setScale(1);
      setRotation(0);
      setLoading(true);
      setPdfError(null);
      setPdfData(null);
      
      // Recalculate width after modal opens
      setTimeout(calculateWidth, 100);
      
      const loadPDF = async () => {
        try {
          const token = await getToken();
          const response = await fetch(pdfUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            throw new Error('PDF niet gevonden of niet toegankelijk.');
          }
          
          const blob = await response.blob();
          
          // Check if blob is a PDF
          if (blob.type !== 'application/pdf') {
            setPdfError('Het bestand is geen geldig PDF-document.');
            setLoading(false);
            return;
          }
          
          // Convert blob to data URL for react-pdf
          const reader = new FileReader();
          reader.onload = () => {
            setPdfData(reader.result as string);
            setLoading(false);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          setPdfError(error instanceof Error ? error.message : 'PDF kon niet geladen worden.');
          setLoading(false);
        }
      };
      
      loadPDF();
    }
  }, [isOpen, pdfUrl, getToken]);

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setPdfError('PDF kon niet geladen worden. Probeer de pagina te verversen.');
    setLoading(false);
  };

  if (!isOpen) {
    return null;
  }

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

        {/* Yellow Notification Banner */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800 leading-relaxed">
                Dit inkijkexamplaar toont (een deel van) de verantwoording van het exameninstrument. Naast dit document leveren wij een instructie voor de kandidaat, instructie beoordelaar, hulpdocumenten en een{' '}
                <strong className="font-semibold">digitaal interactief beoordelingsformulier</strong>.
              </p>
            </div>
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
          
          <div ref={containerRef} className="w-full h-full overflow-auto bg-gray-100 flex justify-center p-4">
            {loading ? (
              <div className="text-center text-gray-400">PDF laden...</div>
            ) : pdfError ? (
              <div className="text-center text-red-500 p-8">
                <div className="mb-4">{pdfError}</div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPdfError(null);
                    setLoading(true);
                    // Trigger reload by changing the key
                    const loadPDF = async () => {
                      try {
                        const token = await getToken();
                        const response = await fetch(pdfUrl, {
                          headers: {
                            'Authorization': `Bearer ${token}`,
                          },
                        });
                        
                        if (!response.ok) {
                          throw new Error('PDF niet gevonden of niet toegankelijk.');
                        }
                        
                        const blob = await response.blob();
                        
                        if (blob.type !== 'application/pdf') {
                          setPdfError('Het bestand is geen geldig PDF-document.');
                          setLoading(false);
                          return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = () => {
                          setPdfData(reader.result as string);
                          setLoading(false);
                        };
                        reader.readAsDataURL(blob);
                      } catch (error) {
                        setPdfError(error instanceof Error ? error.message : 'PDF kon niet geladen worden.');
                        setLoading(false);
                      }
                    };
                    loadPDF();
                  }}
                >
                  Opnieuw proberen
                </Button>
              </div>
            ) : pdfData ? (
              <div 
                className="bg-white shadow-lg max-w-full"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <Document
                  file={pdfData}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="text-center text-gray-400 p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-examen-cyan mx-auto mb-2"></div>
                      PDF laden...
                    </div>
                  }
                  error={
                    <div className="text-center text-red-500 p-8">
                      Er is een fout opgetreden bij het laden van de PDF.
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    width={containerWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </div>
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