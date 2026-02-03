export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createFAQ, getActiveFAQs } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const faqs = await getActiveFAQs(auth.tenantId);

    return NextResponse.json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const faq = await createFAQ({
      tenantId: auth.tenantId,
      question: body.question,
      answer: body.answer,
      category: body.category,
      keywords: body.keywords || [],
      isActive: body.isActive !== undefined ? body.isActive : true,
      order: body.order || 1,
    });

    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}





