import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, mergeNotificationPrefs } from '@autodealers/core';

const db = getFirestore();

export const dynamic = 'force-dynamic';

function pushReadiness() {
  const vapid = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '').trim();
  return {
    vapidConfigured: vapid.length > 20,
    messagingSenderId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim()),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data() || {};
    const merged = mergeNotificationPrefs(userData.settings);

    const credDoc = await db.collection('system_settings').doc('credentials').get();
    const cred = credDoc.data() || {};

    return NextResponse.json({
      prefs: {
        ...merged,
        hasPhone: Boolean(String(userData.phone || '').trim()),
      },
      readiness: {
        push: pushReadiness(),
        email: {
          configured: Boolean(cred.emailApiKey || process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY),
          fromAddress: Boolean(cred.emailFromAddress || process.env.EMAIL_FROM_ADDRESS),
        },
        sms: {
          configured: Boolean(
            cred.twilioAccountSid &&
              cred.twilioAuthToken &&
              cred.twilioPhoneNumber
          ),
        },
        whatsapp: {
          configured: Boolean(cred.whatsappAccessToken && cred.whatsappPhoneNumberId),
        },
        profilePhone: Boolean(String(userData.phone || '').trim()),
        tenantIdForRealtime: Boolean(auth.tenantId),
      },
    });
  } catch (error) {
    console.error('GET admin notifications settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userRef = db.collection('users').doc(auth.userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    const current = mergeNotificationPrefs(userData.settings);

    const notifications = {
      ...current.notifications,
      ...(body.notifications || {}),
    };
    const businessNotifications = {
      ...current.businessNotifications,
      ...(body.businessNotifications || {}),
    };

    await userRef.update({
      'settings.notifications': notifications,
      'settings.businessNotifications': businessNotifications,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      prefs: {
        notifications,
        businessNotifications,
        hasPhone: Boolean(String(userData.phone || '').trim()),
      },
    });
  } catch (error) {
    console.error('PATCH admin notifications settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
