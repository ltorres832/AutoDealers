import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Eliminar cookie
  response.cookies.delete('authToken');
  
  return response;
}

