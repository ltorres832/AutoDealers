import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScoringConfig, saveScoringConfig, ScoringRule } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

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

    const config = await getScoringConfig(tenantId);
    return NextResponse.json({ rules: config.rules || [] });
  } catch (error: any) {
    console.error('Error fetching scoring rules:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching scoring rules' },
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
    const { tenantId, rule } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const config = await getScoringConfig(tenantId);
    const newRule: ScoringRule = {
      id: `rule_${Date.now()}`,
      tenantId,
      name: rule.name,
      enabled: rule.enabled !== false,
      conditions: rule.conditions || [],
      points: rule.points || 10,
      priority: rule.priority || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedRules = [...(config.rules || []), newRule];
    await saveScoringConfig(tenantId, { rules: updatedRules });

    return NextResponse.json({ rule: newRule }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating scoring rule:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating scoring rule' },
      { status: 500 }
    );
  }
}
