// Activa el Agente de Voz IA en las membresías superiores con límites por nivel.
// Uso: node scripts/enable-voice-memberships.mjs
import { execSync } from 'child_process';

const PROJECT = 'autodealers-7f62e';

const PLANS = [
  {
    id: 'QAPb1CMWNqluThCG0qQ5', // Dealer Professional $249
    name: 'Dealer Professional',
    voice: {
      voiceAIEnabled: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: true,
      voiceServiceCallsEnabled: true,
      voiceCampaignsEnabled: false,
      overageBillingEnabled: true,
      maxVoiceMinutesPerMonth: 300,
      maxVoiceInboundCallsPerMonth: 200,
      maxVoiceOutboundCallsPerMonth: 150,
    },
  },
  {
    id: 'jlzePu4ImFDBWqBc7RKJ', // Dealer Enterprise $499
    name: 'Dealer Enterprise',
    voice: {
      voiceAIEnabled: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: true,
      voiceServiceCallsEnabled: true,
      voiceCampaignsEnabled: true,
      overageBillingEnabled: true,
      maxVoiceMinutesPerMonth: 1000,
      maxVoiceInboundCallsPerMonth: 600,
      maxVoiceOutboundCallsPerMonth: 500,
    },
  },
  {
    id: 'xwyTFcbUioYSZcnL7ts3', // Multi Dealer 1 $599
    name: 'Multi Dealer 1',
    voice: {
      voiceAIEnabled: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: true,
      voiceServiceCallsEnabled: true,
      voiceCampaignsEnabled: true,
      overageBillingEnabled: true,
      maxVoiceMinutesPerMonth: 1200,
      maxVoiceInboundCallsPerMonth: 800,
      maxVoiceOutboundCallsPerMonth: 600,
    },
  },
  {
    id: 'xfh2aWv5iUOl6onepVsp', // Multi Dealer 2 $699
    name: 'Multi Dealer 2',
    voice: {
      voiceAIEnabled: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: true,
      voiceServiceCallsEnabled: true,
      voiceCampaignsEnabled: true,
      overageBillingEnabled: true,
      maxVoiceMinutesPerMonth: 1500,
      maxVoiceInboundCallsPerMonth: 1000,
      maxVoiceOutboundCallsPerMonth: 800,
    },
  },
  {
    id: 'oTmzaFNlKgjBxCfGaPXd', // Multi Dealer 3 $999
    name: 'Multi Dealer 3',
    voice: {
      voiceAIEnabled: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: true,
      voiceServiceCallsEnabled: true,
      voiceCampaignsEnabled: true,
      overageBillingEnabled: true,
      maxVoiceMinutesPerMonth: 2500,
      maxVoiceInboundCallsPerMonth: 1500,
      maxVoiceOutboundCallsPerMonth: 1200,
    },
  },
  {
    id: '8sWzq4soRI3RHjSxufRS', // Vendedor Premium $149
    name: 'Vendedor Premium',
    voice: {
      voiceAIEnabled: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: true,
      voiceServiceCallsEnabled: true,
      voiceCampaignsEnabled: false,
      overageBillingEnabled: true,
      maxVoiceMinutesPerMonth: 200,
      maxVoiceInboundCallsPerMonth: 150,
      maxVoiceOutboundCallsPerMonth: 100,
    },
  },
];

function gcloudToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

function toFirestoreValue(v) {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  return { stringValue: String(v) };
}

async function main() {
  const token = gcloudToken();
  for (const plan of PLANS) {
    const fieldPaths = Object.keys(plan.voice).map((k) => `features.${k}`);
    const qs = fieldPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/memberships/${plan.id}?${qs}&updateMask.fieldPaths=updatedAt`;

    const body = {
      fields: {
        features: {
          mapValue: {
            fields: Object.fromEntries(
              Object.entries(plan.voice).map(([k, v]) => [k, toFirestoreValue(v)])
            ),
          },
        },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`ERROR ${plan.name}: ${res.status} ${await res.text()}`);
    } else {
      console.log(`OK ${plan.name}: voz activada (${plan.voice.maxVoiceMinutesPerMonth} min/mes)`);
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
