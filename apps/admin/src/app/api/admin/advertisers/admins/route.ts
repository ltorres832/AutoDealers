import { NextRequest, NextResponse } from 'next/server';

import { verifyAuth } from '@/lib/auth';

import { getFirestore } from '@autodealers/core';



const db = getFirestore();



/** Lista admins de plataforma para asignar cuentas de anunciantes. */

export async function GET(request: NextRequest) {

  try {

    const auth = await verifyAuth(request);

    if (!auth || auth.role !== 'admin') {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    }



    const byId = new Map<string, { id: string; name: string; email: string }>();



    const [usersSnap, adminUsersSnap] = await Promise.all([

      db.collection('users').where('role', '==', 'admin').get(),

      db.collection('admin_users').get(),

    ]);



    for (const doc of usersSnap.docs) {

      const data = doc.data();

      byId.set(doc.id, {

        id: doc.id,

        name: (data.name as string) || (data.email as string) || doc.id,

        email: (data.email as string) || '',

      });

    }



    for (const doc of adminUsersSnap.docs) {

      if (byId.has(doc.id)) continue;

      const data = doc.data();

      byId.set(doc.id, {

        id: doc.id,

        name: (data.name as string) || (data.email as string) || doc.id,

        email: (data.email as string) || '',

      });

    }



    const admins = Array.from(byId.values()).sort((a, b) =>

      a.name.localeCompare(b.name, 'es')

    );



    return NextResponse.json({ admins });

  } catch (error: unknown) {

    const message = error instanceof Error ? error.message : 'Error interno';

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

