import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, mergeNotificationPrefs } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data() || {};
    const merged = mergeNotificationPrefs(userData.settings);

    return NextResponse.json({
      prefs: {
        ...merged,
        hasPhone: Boolean(userData.phone?.trim()),
      },
    });
  } catch (error) {
    console.error('GET notifications settings:', error);
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

    await userRef.set(
      {
        'settings.notifications': notifications,
        'settings.businessNotifications': businessNotifications,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      prefs: {
        notifications,
        businessNotifications,
        hasPhone: Boolean(userData.phone?.trim()),
      },
    });
  } catch (error) {
    console.error('PATCH notifications settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
