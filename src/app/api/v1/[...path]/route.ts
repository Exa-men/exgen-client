import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/v1/${path}${url.search}`;

    // Forward headers, excluding host
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    }

    // Get request body for POST/PUT/PATCH requests
    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await request.text();
    }

    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    });

    // Forward the response - handle headers more carefully
    const responseBody = await response.text();
    
    // Create a new response with only safe headers
    const safeHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      // Only include safe headers that NextResponse can handle
      if (['content-type', 'content-length', 'cache-control'].includes(key.toLowerCase())) {
        safeHeaders.set(key, value);
      }
    }
    
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: safeHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 