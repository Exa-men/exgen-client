import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Shield, 
  ExternalLink,
  FileText,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';

interface Version {
  version: string;
  isLatest: boolean;
}

interface ExamProduct {
  id: string;
  code: string;
  title: string;
  versions: Version[];
}

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
  product: ExamProduct;
  versionId?: string;
  versionString?: string;
}

interface DownloadInfo {
  download_id: string;
  verification_code: string;
  product_title: string;
  product_code: string;
  version: string;
  package_size: string;
  estimated_time: string;
}

type ModalState = 'processing' | 'complete' | 'error';

export default function DownloadModal({ open, onClose, product, versionId, versionString }: DownloadModalProps) {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const [state, setState] = useState<ModalState>('processing');
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState(1);
  const [processingMessage, setProcessingMessage] = useState('Download wordt voorbereid...');
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setState('processing');
      setDownloadInfo(null);
      setError(null);
      setCopied(false);
      setProgress(0);
      setProcessingPhase(1);
      setProcessingMessage('Download wordt voorbereid...');
      setDownloadCompleted(false);
      startProcessing();
    }
  }, [open]);

  const startProcessing = async () => {
    try {
      // Phase 1: Initial preparation (0-1s)
      setTimeout(() => {
        setProcessingPhase(2);
        setProcessingMessage('Examenpakket wordt gegenereerd...');
        setProgress(25);
      }, 1000);

      // Phase 2: Backend processing (1-2s)
      setTimeout(async () => {
        setProcessingPhase(3);
        setProcessingMessage('Download wordt voorbereid...');
        setProgress(50);
        
        // Start the actual backend call
        await initiateDownload();
      }, 2000);

      // Phase 3: Final preparation (2-3s) - only if download hasn't completed yet
      setTimeout(() => {
        if (state === 'processing' && !downloadCompleted && progress < 80) {
          setProcessingPhase(4);
          setProcessingMessage('Bestand wordt gedownload...');
          setProgress(75);
        }
      }, 3000);

    } catch (err) {
      console.error('Processing failed:', err);
      setError('Er is een fout opgetreden bij het verwerken van de download.');
      setState('error');
    }
  };

  const initiateDownload = async () => {
    try {
      // Prevent multiple simultaneous downloads
      if (downloading) {
        console.log('⚠️ Download already in progress, skipping duplicate request');
        return;
      }
      
      setDownloading(true);
      setError(null);

      // Validate that we have a version ID
      if (!versionId) {
        throw new Error('No version selected for download. Please select a version and try again.');
      }

      console.log('🔍 Starting download with:', {
        productId: product.id,
        versionId: versionId,
        productTitle: product.title
      });

      // Step 1: Initiate download
      const { data: initiateData, error: initiateError } = await api.initiateDownload(product.id, versionId);

      if (initiateError) {
        console.error('❌ Initiate download failed:', initiateError);
        throw new Error(initiateError.detail || 'Failed to initiate download');
      }

      console.log('🔍 Initiate download response:', {
        initiateData,
        type: typeof initiateData,
        keys: initiateData ? Object.keys(initiateData) : 'no data'
      });

      // Extract download ID from the response
      // The backend returns SuccessResponse with data.download_id
      let downloadId;
      if (initiateData && typeof initiateData === 'object' && initiateData !== null) {
        if ('data' in initiateData && (initiateData as any).data && 'download_id' in (initiateData as any).data) {
          downloadId = (initiateData as any).data.download_id;
        } else if ('download_id' in initiateData) {
          downloadId = (initiateData as any).download_id;
        } else {
          console.error('❌ Unexpected response structure:', initiateData);
          throw new Error('Unexpected response structure from server');
        }
      }
      
      // Validate that we got a download ID
      if (!downloadId) {
        console.error('❌ No download ID received from server');
        console.error('❌ Response data:', initiateData);
        throw new Error('Failed to get download ID from server');
      }
      
      console.log('✅ Download initiated successfully:', {
        downloadId: downloadId,
        productId: product.id,
        versionId: versionId
      });
      
      // Step 2: Get download package - this now directly returns the ZIP file
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/v1/catalog/download/${product.id}/package/${downloadId}?version_id=${versionId}`, {
        headers: {
          'Authorization': `Bearer ${await api.getCachedToken?.() || ''}`,
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If we can't parse JSON, create a fallback error
          errorData = { 
            detail: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            statusText: response.statusText
          };
        }
        
        console.error('❌ Download package request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Handle different error response formats
        let errorMessage = 'Failed to get download package';
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.status && errorData.statusText) {
            errorMessage = `HTTP ${errorData.status}: ${errorData.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // The response is now the actual ZIP file
      const blob = await response.blob();
      
      // Create a temporary link and click it to download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product.code}-${product.title}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
      
      // Add a small delay to ensure download log is created in the backend
      console.log('⏳ Waiting for download log to be created...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the real verification code from the backend BEFORE setting completion state
      let verificationCode = 'N/A';
      console.log('🔍 Attempting to get real verification code for:', { productId: product.id, downloadId, versionId });
      
      try {
        const { data: verificationData, error: verificationError } = await api.getDownloadVerification(
          product.id, 
          downloadId, 
          versionId
        );
        
        console.log('🔍 Verification API response:', { verificationData, verificationError });
        console.log('🔍 Verification data type:', typeof verificationData);
        console.log('🔍 Verification data keys:', verificationData ? Object.keys(verificationData) : 'no data');
        console.log('🔍 Full verification data:', JSON.stringify(verificationData, null, 2));
        
        if (verificationError) {
          console.warn('Failed to get verification code:', verificationError);
          // Fallback to initiate data
          if (initiateData && typeof initiateData === 'object') {
            if ('verification_code' in initiateData) {
              verificationCode = (initiateData as any).verification_code;
            } else if ('data' in initiateData && (initiateData as any).data && 'verification_code' in (initiateData as any).data) {
              verificationCode = (initiateData as any).data.verification_code;
            }
          }
        } else if (verificationData && typeof verificationData === 'object') {
          // Check if verificationData has a 'data' property (SuccessResponse structure)
          if ('data' in verificationData && (verificationData as any).data) {
            verificationCode = (verificationData as any).data.verification_code || 'N/A';
          } else {
            verificationCode = (verificationData as any).verification_code || 'N/A';
          }
          console.log('✅ Got real verification code:', verificationCode);
        }
      } catch (error) {
        console.warn('Failed to get verification code:', error);
        // Fallback to initiate data
        if (initiateData && typeof initiateData === 'object') {
          if ('verification_code' in initiateData) {
            verificationCode = (initiateData as any).verification_code;
          } else if ('data' in initiateData && (initiateData as any).data && 'verification_code' in (initiateData as any).data) {
            verificationCode = (initiateData as any).data.verification_code;
          }
        }
      }
      
      console.log('🔍 Final verification code to display:', verificationCode);
      
              // Set download info for completion state with the real verification code
        setDownloadInfo({
          download_id: downloadId,
          verification_code: verificationCode,
          product_title: product.title,
          product_code: product.code,
          version: versionString || versionId || 'Unknown',
          package_size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
          estimated_time: 'Completed'
        });
      
      // Set state to complete and stop downloading
      setState('complete');
      setDownloading(false);
      
      toast.success('Download completed successfully!');
      
      // Don't close immediately - let user see completion state
      // onClose will be called when user clicks close button
      
    } catch (err) {
      console.error('Download failed:', err);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Download failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as any).message;
      }
      
      // Log additional context for debugging
      console.error('Download error context:', {
        productId: product.id,
        versionId: versionId,
        error: err,
        errorMessage: errorMessage
      });
      
      setError(errorMessage);
      setDownloading(false);
    }
  };

  const copyToClipboard = async () => {
    if (downloadInfo?.verification_code) {
      try {
        await navigator.clipboard.writeText(downloadInfo.verification_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };



  const openVerificationPage = () => {
    window.open('/verificatie', '_blank');
  };

  const renderContent = () => {
    switch (state) {
      case 'processing':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-examen-cyan mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{processingMessage}</h3>
            <p className="text-gray-600 mb-4">
              {processingPhase === 1 && 'Voorbereiden van download...'}
              {processingPhase === 2 && 'Examenpakket wordt gegenereerd...'}
              {processingPhase === 3 && 'Download wordt voorbereid...'}
              {processingPhase === 4 && 'Bestand wordt gedownload...'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-examen-cyan h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{progress}% voltooid</p>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Download Succesvol!</h3>
              <p className="text-gray-600">Uw examenpakket is gedownload</p>
            </div>

            {/* Product Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Product:</span>
                    <span className="font-medium">{downloadInfo?.product_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Code:</span>
                    <span className="font-mono">{downloadInfo?.product_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Versie:</span>
                    <span className="font-medium">{downloadInfo?.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Grootte:</span>
                    <span className="font-medium">{downloadInfo?.package_size}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Belangrijk:</p>
                  <p>Dit examenproduct is persoonsgebonden. Verspreid het niet buiten de verantwoordelijkheid van de betreffende examencommissie.</p>
                </div>
              </div>
            </div>

            {/* Verification Code Section */}
            <Card className="border-2 border-examen-cyan">
              <CardContent className="pt-4">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="h-5 w-5 text-examen-cyan" />
                    <h4 className="font-semibold text-lg">Track & trace</h4>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Uw track & trace code:</p>
                    <div className="font-mono text-2xl font-bold text-examen-dark bg-white p-3 rounded border-2 border-examen-cyan">
                      {downloadInfo?.verification_code}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="mt-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Gekopieerd!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Code Kopiëren
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Deze code komt terug op het scoreblad voor de cijferadministratie, zodat gecontroleerd kan worden wie het product heeft gebruikt enof het ongewijzigd is gebleven.</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openVerificationPage}
                      className="text-examen-cyan hover:text-examen-cyan-600"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Controleer op: exa.men/verificatie
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Close Button */}
            <div className="text-center">
              <Button
                onClick={onClose}
                size="lg"
                className="bg-examen-cyan hover:bg-examen-cyan-600 text-white px-8"
              >
                Sluiten
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">!</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-red-600">Fout opgetreden</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={initiateDownload} variant="outline">
                Opnieuw proberen
              </Button>
              <Button onClick={onClose} variant="ghost">
                Sluiten
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {state === 'processing' && 'Download Verwerken'}
            {state === 'complete' && 'Download Voltooid'}
            {state === 'error' && 'Fout opgetreden'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 