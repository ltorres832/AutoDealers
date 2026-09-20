import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { assertSellerLeadAccess } from '@/lib/seller-workspace';
import { getLeadById } from '@autodealers/crm';
import { getStorage } from '@autodealers/core';
import { getCallLog, getCallLogsForLead, transcriptToPlainText } from '@autodealers/voice';

export const dynamic = 'force-dynamic';

async function signRecordingUrl(storagePath?: string): Promise<string | null> {
  if (!storagePath) return null;
  try {
    const bucket = getStorage().bucket();
    const [url] = await bucket.file(storagePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hora
    });
    return url;
  } catch (error) {
    console.error('[leads/calls seller] Error firmando URL de grabación:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const lead = await getLeadById(auth.tenantId, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const access = await assertSellerLeadAccess(auth, lead);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const callId = request.nextUrl.searchParams.get('callId');

    if (callId) {
      const call = await getCallLog(auth.tenantId, callId);
      if (!call || call.leadId !== leadId) {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }
      const recordingUrl = await signRecordingUrl(call.recordingStoragePath);
      return NextResponse.json({
        call: {
          id: call.id,
          direction: call.direction,
          scenario: call.scenario || null,
          status: call.status,
          startedAt: call.startedAt || null,
          durationSeconds: call.durationSeconds || 0,
          summary: call.summary || '',
          nextSteps: call.nextSteps || [],
          outcome: call.outcome || null,
          transcript: call.transcript || [],
          transcriptText: transcriptToPlainText(call.transcript || []),
          recordingUrl,
          identityConfirmed: call.identityConfirmed === true,
          disclosureGiven: call.disclosureGiven === true,
        },
      });
    }

    const calls = await getCallLogsForLead(auth.tenantId, leadId, 50);
    return NextResponse.json({
      calls: calls.map((c) => ({
        id: c.id,
        direction: c.direction,
        scenario: c.scenario || null,
        status: c.status,
        startedAt: c.startedAt || null,
        durationSeconds: c.durationSeconds || 0,
        summary: c.summary || '',
        outcome: c.outcome || null,
        hasRecording: Boolean(c.recordingStoragePath),
        hasTranscript: Boolean(c.transcript?.length),
      })),
    });
  } catch (error: unknown) {
    console.error('[leads/calls seller] GET', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
