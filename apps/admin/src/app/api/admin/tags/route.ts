import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTags, createTag } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const tags = await getTags(tenantId);
    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, tag } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const newTag = await createTag(tenantId, tag);
    return NextResponse.json({ tag: newTag }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating tag' },
      { status: 500 }
    );
  }
}
