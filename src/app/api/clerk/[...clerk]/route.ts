import { NextRequest, NextResponse } from 'next/server'

// Handle all HTTP methods for Clerk's authentication flows
export async function GET(request: NextRequest) {
  // Extract the path after /api/clerk/
  const pathname = request.nextUrl.pathname
  const clerkPath = pathname.replace('/api/clerk/', '')
  
  // For now, just return a 200 response to prevent 405 errors
  // Clerk will handle the actual authentication on the client side
  return NextResponse.json({ 
    message: `Clerk API endpoint: ${clerkPath}`,
    method: 'GET'
  })
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const clerkPath = pathname.replace('/api/clerk/', '')
  
  // Handle POST requests (like factor-one)
  return NextResponse.json({ 
    message: `Clerk API endpoint: ${clerkPath}`,
    method: 'POST'
  })
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ message: 'PUT handled' })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ message: 'DELETE handled' })
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: 'PATCH handled' })
}