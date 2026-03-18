import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for Firebase App Hosting backend
 */
export async function GET(request: NextRequest) {
  try {
    // Basic health check - can be extended to check database connectivity, etc.
    return NextResponse.json({
      status: 'healthy',
      service: 'AutoDealers Admin Panel API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
