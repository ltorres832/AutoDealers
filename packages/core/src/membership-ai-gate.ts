// Validación de features de membresía para IA y automatización

import { canExecuteFeature, type FeatureAction } from './feature-executor';

export async function tenantCanUseAI(tenantId: string): Promise<boolean> {
  const check = await canExecuteFeature(tenantId, 'useAI');
  return check.allowed;
}

export async function tenantCanClassifyLeads(tenantId: string): Promise<boolean> {
  const [ai, classify] = await Promise.all([
    canExecuteFeature(tenantId, 'useAI'),
    canExecuteFeature(tenantId, 'classifyLead'),
  ]);
  return ai.allowed && classify.allowed;
}

export async function tenantCanAutoRespond(tenantId: string): Promise<boolean> {
  const [ai, auto] = await Promise.all([
    canExecuteFeature(tenantId, 'useAI'),
    canExecuteFeature(tenantId, 'useAutoResponse'),
  ]);
  return ai.allowed && auto.allowed;
}

export async function tenantCanGenerateContent(tenantId: string): Promise<boolean> {
  const [ai, content] = await Promise.all([
    canExecuteFeature(tenantId, 'useAI'),
    canExecuteFeature(tenantId, 'generateContent'),
  ]);
  return ai.allowed && content.allowed;
}

export async function assertMembershipFeature(
  tenantId: string,
  action: FeatureAction
): Promise<{ allowed: boolean; reason?: string }> {
  const check = await canExecuteFeature(tenantId, action);
  return { allowed: check.allowed, reason: check.reason };
}
