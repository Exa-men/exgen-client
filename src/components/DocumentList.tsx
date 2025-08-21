import React from 'react';
import { FileText, Eye, Trash2, CheckCircle, AlertCircle, Loader2, EyeOff } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Badge } from '../app/components/ui/badge';
import { useS3Verification, S3VerificationSummary } from '../hooks/use-s3-verification';
import { useApi } from '../hooks/use-api';
import { toast } from 'sonner';

/*
 * DocumentList Component with Preview Functionality
 * 
 * This component allows users to:
 * 1. Set ONE document as preview (automatically unsets others)
 * 2. View the preview document using the existing PDF viewer
 * 3. Manage document preview status
 * 
 * Usage with existing PDF viewer:
 * 
 * const [documents, setDocuments] = useState<Document[]>([]);
 * const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
 * const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
 * 
 * const handleSetPreview = (documentId: string) => {
 *   setDocuments(prev => prev.map(doc => ({
 *     ...doc,
 *     isPreview: doc.id === documentId
 *   })));
 * };
 * 
 * const handlePreviewDocument = (document: Document) => {
 *   setSelectedDocument(document);
 *   setPdfViewerOpen(true);
 * };
 * 
 * <DocumentList
 *   documents={documents}
 *   versionId={versionId}
 *   productId={productId}
 *   onDelete={handleDelete}
 *   onSetPreview={handleSetPreview}
 *   onPreviewDocument={handlePreviewDocument}
 * />
 * 
 * {selectedDocument && (
 *   <PDFViewer
 *     isOpen={pdfViewerOpen}
 *     onClose={() => {
 *       setPdfViewerOpen(false);
 *       setSelectedDocument(null);
 *     }}
 *     pdfUrl={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/catalog/preview/${productId}/content`}
 *     title={`Preview: ${selectedDocument.name}`}
 *   />
 * )}
 */
interface Document {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  isPreview?: boolean;
  s3Status?: 'available' | 'missing' | 'checking';
}

interface DocumentListProps {
  documents: Document[];
  versionId: string;
  productId: string; // Add product ID for cleanup operations
  onDelete: (documentId: string) => void;
  onSetPreview: (documentId: string) => void;
  onS3StatusUpdate?: (documentId: string, status: 'available' | 'missing') => void;
  onPreviewDocument?: (document: Document) => void; // New prop for preview functionality
}

export function DocumentList({ 
  documents, 
  versionId, 
  productId,
  onDelete, 
  onSetPreview,
  onS3StatusUpdate,
  onPreviewDocument
}: DocumentListProps) {
  const { verifyAllDocuments, verifying } = useS3Verification();
  const api = useApi();

  const handleVerifyAll = async () => {
    try {
      const result = await verifyAllDocuments(versionId);
      
      // Update document statuses based on verification results
      if (result && result.data && onS3StatusUpdate) {
        // The backend returns SuccessResponse with data field, so we need to access result.data.data
        const responseData = result.data as any;
        if (responseData && responseData.data && responseData.data.documents) {
          const verificationData = responseData.data as S3VerificationSummary;
          verificationData.documents.forEach((doc: any) => {
            onS3StatusUpdate(doc.document_id, doc.exists_in_s3 ? 'available' : 'missing');
          });
        }
      }
    } catch (error) {
      // console.error('S3 verification failed:', error);
    }
  };

  const handleSetPreview = async (documentId: string, isPreview: boolean) => {
    try {
      // First, clean up any existing preview inconsistencies
      if (isPreview) {
        try {
          await api.cleanupProductPreview(productId);
          // console.log('Cleaned up preview inconsistencies for product:', productId);
        } catch (cleanupError) {
          // console.warn('Failed to cleanup preview inconsistencies:', cleanupError);
          // Continue with setting preview status even if cleanup fails
        }
      }
      
      const result = await api.setPreviewDocument(documentId, isPreview);
      
      if (result.error) {
        toast.error(`Failed to set preview status: ${result.error.detail}`);
        return;
      }
      
      // Call the parent callback to update the document list
      onSetPreview(documentId);
      
      if (isPreview) {
        toast.success('Document set as preview');
      } else {
        toast.success('Document preview disabled');
      }
    } catch (error) {
      // console.error('Failed to set preview status:', error);
      toast.error('Failed to set preview status');
    }
  };

  const handlePreviewDocument = (document: Document) => {
    if (onPreviewDocument) {
      onPreviewDocument(document);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'missing':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Eye className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'available':
        return 'Beschikbaar';
      case 'missing':
        return 'Niet gevonden';
      case 'checking':
        return 'Controleren...';
      default:
        return 'Status onbekend';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600';
      case 'missing':
        return 'text-red-600';
      case 'checking':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium">Geüploade Documenten</h4>
        <button
          onClick={handleVerifyAll}
          disabled={verifying}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          {verifying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Check upload status
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50">
        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Nog geen documenten geüpload</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                className={`border rounded-lg p-3 bg-white transition-opacity ${
                  doc.s3Status === 'missing' ? 'opacity-50 bg-red-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm">{doc.name}</span>
                    {doc.isPreview && (
                      <Badge variant="secondary" className="text-xs">
                        Preview
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    {/* Preview Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetPreview(doc.id, !doc.isPreview)}
                      className={`${
                        doc.isPreview 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={doc.isPreview ? 'Preview uitschakelen' : 'Preview inschakelen'}
                    >
                      {doc.isPreview ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </Button>
                    
                    {/* View Preview Button - only show if document is preview */}
                    {doc.isPreview && onPreviewDocument && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewDocument(doc)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Preview bekijken"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(doc.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Document verwijderen"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mb-2">
                  Geüpload op {new Date(doc.uploadedAt).toLocaleDateString('nl-NL')}
                </p>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.s3Status)}
                  <span className={`text-xs ${getStatusColor(doc.s3Status)}`}>
                    {getStatusText(doc.s3Status)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 