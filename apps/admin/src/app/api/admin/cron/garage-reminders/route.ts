import { NextRequest, NextResponse } from 'next/server';
import { listDueGarageReminders, getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const due = await listDueGarageReminders(50);
  const db = getFirestore();
  let processed = 0;
  for (const reminder of due) {
    const garage = await db.collection('customer_garage').doc(reminder.garageId).get();
    const email = garage.data()?.email;
    const phone = garage.data()?.phone;
    await db.collection('garage_reminders').doc(reminder.id).set(
      {
        status: 'sent',
        sentAt: new Date(),
        contactEmail: email || null,
        contactPhone: phone || null,
      },
      { merge: true }
    );
    processed += 1;
  }
  return NextResponse.json({ processed, due: due.length });
}
