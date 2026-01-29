import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint für Docker/Kubernetes
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    },
    { status: 200 }
  );
}
