import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'health';

  try {
    const backendUrl = `https://exgen-api-5ox6m4ijja-ez.a.run.app/api/v1/${endpoint}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer frontend-secret-key',
      },
    });

    const data = await response.text();
    
    return NextResponse.json({
      status: response.status,
      data: data,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'generate';

  try {
    const backendUrl = `https://exgen-api-5ox6m4ijja-ez.a.run.app/api/v1/${endpoint}`;
    
    // For file uploads, we need to forward the FormData as-is
    const formData = await request.formData();
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer frontend-secret-key',
      },
      body: formData,
    });

    const data = await response.text();
    
    return NextResponse.json({
      status: response.status,
      data: data,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 