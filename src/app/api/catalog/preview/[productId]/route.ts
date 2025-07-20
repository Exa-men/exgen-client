import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  console.log('🌐 PDF Preview API called for productId:', params.productId);
  
  try {
    const { productId } = params;

    // TODO: Replace with actual PDF serving logic
    // This would typically:
    // 1. Fetch the PDF file from storage/database
    // 2. Stream the PDF content
    // 3. Set appropriate headers to prevent download
    
    // For now, return a mock response
    // In production, you would stream the actual PDF file
    
    console.log(`Serving PDF preview for product: ${productId}`);

    // Mock PDF content - replace with actual PDF streaming
    const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Exam Preview) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

    // Set headers to prevent download and force inline viewing
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', 'inline; filename="exam-preview.pdf"');
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Prevent right-click and other download methods
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');

    return new NextResponse(mockPdfContent, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving PDF preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to serve PDF preview' },
      { status: 500 }
    );
  }
} 