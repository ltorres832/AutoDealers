// Automatización IA por tenant (seguimientos, escalación) según ai_config

import { getFirestore } from '@autodealers/shared';
import { getAIApiKey } from './ai-config';
import { tenantCanUseAI } from './membership-ai-gate';
import { getLeads } from '@autodealers/crm';

export async function processTenantAiAutomation(): Promise<void> {
  const db = getFirestore();
  const tenantsSnap = await db.collection('tenants').get();

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    if (tenantId.startsWith('_')) continue;

    try {
      const canAi = await tenantCanUseAI(tenantId);
      if (!canAi) continue;

      const aiConfigSnap = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('ai_config')
        .get();
      const cfg = aiConfigSnap.data();
      if (!cfg?.enabled) continue;

      const apiKey = await getAIApiKey(tenantId);
      if (!apiKey) continue;

      const automation = cfg.advancedAutomation || {};
      if (automation.enabled !== true) continue;

      if (automation.autoEscalateLeads === true) {
        const { autoEscalateCriticalLeads } = await import('@autodealers/ai');
        const escalated = await autoEscalateCriticalLeads(tenantId, apiKey);
        if (escalated?.escalatedLeads?.length) {
          for (const item of escalated.escalatedLeads) {
            await db
              .collection('tenants')
              .doc(tenantId)
              .collection('leads')
              .doc(item.leadId)
              .set(
                {
                  aiEscalation: {
                    reason: item.reason,
                    priority: item.priority,
                    escalatedAt: new Date(),
                  },
                },
                { merge: true }
              );
          }
        }
      }

      if (cfg.autoFollowups?.enabled === true) {
        const leads = await getLeads(tenantId, { status: 'contacted' });
        const { suggestFollowUpsWithTenantConfig } = await import('@autodealers/ai');
        for (const lead of leads.slice(0, 5)) {
          const last =
            lead.interactions?.[lead.interactions.length - 1]?.content || 'Sin interacciones';
          const suggestions = await suggestFollowUpsWithTenantConfig(
            tenantId,
            lead.status,
            last
          );
          if (suggestions.length > 0) {
            await db
              .collection('tenants')
              .doc(tenantId)
              .collection('leads')
              .doc(lead.id)
              .set(
                {
                  aiSuggestedFollowUps: suggestions.slice(0, 3),
                  aiFollowUpsUpdatedAt: new Date(),
                },
                { merge: true }
              );
          }
        }
      }
    } catch (error) {
      console.warn(`tenant AI automation skipped for ${tenantDoc.id}:`, error);
    }
  }
}
