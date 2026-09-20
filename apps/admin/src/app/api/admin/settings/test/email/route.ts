export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getEmailCredentials } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

function resolveProvider(apiKey: string): 'resend' | 'sendgrid' {
  return apiKey.includes('re_') || apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
}

function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return 'configured';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatBrandedFrom(from: string): string {
  const trimmed = from.trim();
  if (!trimmed) return 'AutoDealersOnline <noreply@autodealers-online.com>';
  const parsed = parseFromAddress(trimmed);
  return `AutoDealersOnline <${parsed.email}>`;
}

function parseFromAddress(from: string): { email: string; name?: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { email: from.trim() };
  const name = match[1]?.trim().replace(/^"|"$/g, '');
  return { email: match[2]!.trim(), ...(name ? { name } : {}) };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const to = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ success: false, error: 'Email de prueba inválido' }, { status: 400 });
    }

    const creds = await getEmailCredentials();
    const apiKey = creds.apiKey || '';
    const from = formatBrandedFrom(creds.fromAddress || 'noreply@autodealers-online.com');

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email API Key no configurada',
          from,
        },
        { status: 400 }
      );
    }

    const subject = 'Prueba de email AutoDealersOnline';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
          <h2 style="color: #4f46e5;">Prueba de email AutoDealersOnline</h2>
          <p>Si recibes este correo, Resend/SendGrid está funcionando con el remitente configurado.</p>
          <p style="font-size: 13px; color: #6b7280;">From: ${from}</p>
        </div>
      `;
    const provider = resolveProvider(apiKey);
    const result =
      provider === 'resend'
        ? await sendTestWithResend({ apiKey, from, to, subject, html })
        : await sendTestWithSendGrid({ apiKey, from, to, subject, html });

    if (!result.sent) {
      return NextResponse.json(
        {
          success: false,
          provider,
          from,
          apiKey: mask(apiKey),
          error: result.error || 'El proveedor rechazó el envío',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      provider,
      from,
      apiKey: mask(apiKey),
      externalId: result.externalId || null,
    });
  } catch (error) {
    console.error('test email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno al probar email',
      },
      { status: 500 }
    );
  }
}

async function sendTestWithResend(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; externalId?: string; error?: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: string };
  if (!response.ok) {
    return { sent: false, error: data.message || data.error || `Resend error ${response.status}` };
  }
  return { sent: true, externalId: data.id };
}

async function sendTestWithSendGrid(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; externalId?: string; error?: string }> {
  const parsedFrom = parseFromAddress(input.from);
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: parsedFrom,
      subject: input.subject,
      content: [{ type: 'text/html', value: input.html }],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { sent: false, error: text || `SendGrid error ${response.status}` };
  }
  return { sent: true, externalId: response.headers.get('x-message-id') || undefined };
}
