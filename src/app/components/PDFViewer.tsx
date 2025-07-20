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
  const [pdfData, setPdfData] = useState<string | null>(null);

  // Load PDF when modal opens
  useEffect(() => {
    console.log('🔄 PDFViewer useEffect triggered:', { isOpen, pdfUrl });
    
    if (isOpen && pdfUrl) {
      console.log('📥 Loading PDF from URL:', pdfUrl);
      setCurrentPage(1);
      setScale(1);
      setRotation(0);
      setLoading(true);
      
      // Load PDF data
      fetch(pdfUrl)
        .then(response => {
          console.log('📡 PDF fetch response:', response.status, response.statusText);
          if (!response.ok) throw new Error('Failed to load PDF');
          return response.text();
        })
        .then(data => {
          console.log('✅ PDF data loaded, length:', data.length);
          setPdfData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('❌ Error loading PDF:', error);
          setLoading(false);
        });
    }
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
            <div 
              className="bg-white shadow-lg"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {/* PDF Content */}
              <div className="w-[800px] h-[1100px] p-8 border border-gray-300">
                {pdfData ? (
                  // In a real implementation, you would use a PDF.js or similar library
                  // For now, we show a mock representation
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">{title}</h1>
                    <p className="text-gray-600 mb-4">PDF Preview - Pagina {currentPage}</p>
                    <div className="bg-gray-100 p-4 rounded border">
                      <p className="text-sm text-gray-500">
                        Dit is een voorbeeld van het examen document. 
                        In de echte implementatie zou hier de PDF van het examen staan.
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        PDF data geladen: {pdfData.substring(0, 50)}...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold mb-2">{title}</h1>
                  <p className="text-gray-600">Voorbeeld PDF Document</p>
                </div>
                
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <h2 className="text-lg font-semibold mb-2">Instructies</h2>
                    <p className="text-gray-700">
                      Dit is een voorbeeld van het examen document. In de echte implementatie zou hier de PDF van het examen staan.
                    </p>
                  </div>
                  
                  <div className="border-b border-gray-200 pb-4">
                    <h2 className="text-lg font-semibold mb-2">Vraag 1</h2>
                    <p className="text-gray-700 mb-3">
                      Wat is de hoofdstad van Nederland?
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input type="radio" name="q1" id="q1a" className="mr-2" />
                        <label htmlFor="q1a">Amsterdam</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="q1" id="q1b" className="mr-2" />
                        <label htmlFor="q1b">Den Haag</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="q1" id="q1c" className="mr-2" />
                        <label htmlFor="q1c">Rotterdam</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="q1" id="q1d" className="mr-2" />
                        <label htmlFor="q1d">Utrecht</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-b border-gray-200 pb-4">
                    <h2 className="text-lg font-semibold mb-2">Vraag 2</h2>
                    <p className="text-gray-700 mb-3">
                      Welke kleur heeft de Nederlandse vlag?
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input type="radio" name="q2" id="q2a" className="mr-2" />
                        <label htmlFor="q2a">Rood, wit en blauw</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="q2" id="q2b" className="mr-2" />
                        <label htmlFor="q2b">Oranje, wit en blauw</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="q2" id="q2c" className="mr-2" />
                        <label htmlFor="q2c">Groen, wit en rood</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center text-gray-500 mt-8">
                    <p>Pagina {currentPage} van {totalPages}</p>
                    <p className="text-sm mt-2">Dit is een voorbeeld document voor demonstratie doeleinden.</p>
                  </div>
                </div>
                  </>
                )}
              </div>
            </div>
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