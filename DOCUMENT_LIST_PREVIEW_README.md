# DocumentList Preview Functionality

This document explains how to use the enhanced DocumentList component with document preview functionality.

## Overview

The DocumentList component now supports:
1. **Setting ONE document as preview** - Only one document can be preview at a time
2. **Viewing preview documents** - Integrated with the existing PDF viewer
3. **Managing preview status** - Easy toggle between preview and non-preview documents

## Backend Changes

### New API Endpoints

1. **GET `/api/v1/catalog/preview/{product_id}`** - Get preview document info
2. **GET `/api/v1/catalog/preview/{product_id}/content`** - Serve the actual preview document
3. **PATCH `/api/v1/catalog/documents/{document_id}/preview`** - Set document preview status

### New Database Methods

- `get_document_by_id()` - Get document by ID
- `get_documents_by_version()` - Get all documents for a version
- `create_version_document()` - Create new document with preview support
- `get_preview_document_for_product()` - Get preview document for a product

### File Storage Service

- Added `serve_file()` method to serve files directly from S3

## Frontend Integration

### Basic Usage

```tsx
import DocumentList from '../components/DocumentList';

// State for documents and preview
const [documents, setDocuments] = useState<Document[]>([]);
const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

// Handlers
const handleSetPreview = (documentId: string) => {
  setDocuments(prev => prev.map(doc => ({
    ...doc,
    isPreview: doc.id === documentId
  })));
};

const handlePreviewDocument = (document: Document) => {
  setSelectedDocument(document);
  setDocumentPreviewOpen(true);
};

// Component usage
<DocumentList
  documents={documents}
  versionId={versionId}
  onDelete={handleDeleteDocument}
  onSetPreview={handleSetPreview}
  onPreviewDocument={handlePreviewDocument}
/>

// PDF viewer for document previews
{selectedDocument && (
  <PDFViewer
    isOpen={documentPreviewOpen}
    onClose={() => {
      setDocumentPreviewOpen(false);
      setSelectedDocument(null);
    }}
    pdfUrl={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/catalog/preview/${productId}/content`}
    title={`Document Preview: ${selectedDocument.name}`}
  />
)}
```

### Document Interface

```tsx
interface Document {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  isPreview?: boolean;
  s3Status?: 'available' | 'missing' | 'checking';
}
```

### Props

- `documents` - Array of documents to display
- `versionId` - ID of the version these documents belong to
- `onDelete` - Callback when a document is deleted
- `onSetPreview` - Callback when preview status changes
- `onS3StatusUpdate` - Callback for S3 verification status updates
- `onPreviewDocument` - Callback when user wants to view a preview document

## Features

### Preview Management
- Only ONE document can be preview at a time
- Automatically unsets other preview documents when setting a new one
- Visual indicators for preview status
- Toast notifications for status changes

### Multiple Preview Prevention
- **Automatic cleanup**: When setting a document as preview, all other preview documents are automatically unset
- **Cross-version consistency**: Ensures only one preview document exists across ALL versions of a product
- **Data integrity**: Prevents the issue where multiple documents could be marked as preview simultaneously
- **Cleanup API**: Provides endpoint to fix any existing data inconsistencies

### S3 Integration
- Built-in S3 verification
- Status indicators for file availability
- Bulk verification for all documents

### User Experience
- Clear visual feedback for preview status
- Separate buttons for setting preview and viewing preview
- Responsive design with proper loading states
- Error handling with user-friendly messages

## Integration with Existing System

The new DocumentList functionality works alongside the existing "Inkijken" button:

1. **Existing "Inkijken" button** - Continues to work as before, showing the product preview
2. **DocumentList preview** - Allows granular control over which specific document is preview
3. **PDF viewer** - Shared between both systems for consistent user experience

### "Inkijken" Button in Catalog

The "Inkijken" (Preview) button appears in the main catalog for users who haven't purchased an exam:

- **Visibility**: Only shows when `!product.isPurchased && product.hasPreviewDocument`
- **Purpose**: Allows users to preview exam content before purchasing
- **Functionality**: Opens the PDF viewer with the preview document
- **Integration**: Uses the same PDF viewer component as the DocumentList

#### Button Logic

```tsx
{!product.isPurchased && product.hasPreviewDocument && (
  <Button onClick={() => handleReview(product)}>
    <Eye className="h-4 w-4 mr-1" />
    Inkijken
  </Button>
)}
```

#### Backend Support

The `hasPreviewDocument` field is automatically determined by:
1. Loading all versions of a product
2. Checking if any version has documents marked as `is_preview = True`
3. Setting the field accordingly in the API response

## Security

- All endpoints require authentication
- Users can only access documents for products they have access to
- S3 files are served with proper access controls
- Preview status changes are logged and validated

## Error Handling

- Graceful fallbacks for missing documents
- User-friendly error messages
- Automatic retry for temporary failures
- Proper logging for debugging

## Future Enhancements

- Batch preview operations
- Preview document ordering
- Preview document expiration
- Advanced preview permissions
- Preview analytics and usage tracking

## Troubleshooting

### Multiple Preview Documents Issue

If you encounter multiple documents showing as preview simultaneously:

1. **Automatic Fix**: The system will automatically fix this when setting a new preview document
2. **Manual Cleanup**: Use the cleanup API endpoint: `POST /api/v1/catalog/products/{product_id}/cleanup-preview`
3. **Frontend Integration**: The DocumentList component automatically calls cleanup when setting preview status

### Testing the Fix

You can test the preview cleanup functionality using the provided test script:

```bash
cd Server
python test_preview_cleanup.py
```

This will verify that the cleanup methods work correctly and show you the current state of preview documents.
