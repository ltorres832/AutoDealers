import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Root API route handler for Firebase App Hosting backend
 * Provides health check and API information
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      service: 'AutoDealers Admin Panel API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        dashboard: '/api/dashboard',
        leads: '/api/leads',
        vehicles: '/api/vehicles',
        appointments: '/api/appointments',
        webhooks: {
          stripe: '/api/webhooks/stripe',
          whatsapp: '/api/webhooks/whatsapp',
          facebook: '/api/webhooks/facebook',
          instagram: '/api/webhooks/instagram',
        },
      },
      documentation: 'https://docs.autodealers.com',
    });
  } catch (error) {
    console.error('Error in root API route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        status: 'error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to access API information.' },
    { status: 405 }
  );
}
