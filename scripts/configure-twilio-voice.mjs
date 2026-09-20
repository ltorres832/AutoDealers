// Configura los números de Twilio para el agente de voz:
// apunta VoiceUrl al webhook twilioVoiceInbound (POST).
// Uso: node scripts/configure-twilio-voice.mjs
import { execSync } from 'child_process';

const PROJECT = 'autodealers-7f62e';
const INBOUND_URL = `https://us-central1-${PROJECT}.cloudfunctions.net/twilioVoiceInbound`;

function gcloudToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function getTwilioCreds() {
  const token = gcloudToken();
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/system_settings/credentials`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  const doc = await res.json();
  const f = doc.fields || {};
  return {
    accountSid: f.twilioAccountSid?.stringValue,
    authToken: f.twilioAuthToken?.stringValue,
    phoneNumber: f.twilioPhoneNumber?.stringValue,
  };
}

async function main() {
  const { accountSid, authToken, phoneNumber } = await getTwilioCreds();
  if (!accountSid || !authToken) {
    console.error('Faltan credenciales de Twilio en system_settings/credentials');
    process.exit(1);
  }
  const auth = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const listRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=50`,
    { headers: { Authorization: auth } }
  );
  if (!listRes.ok) throw new Error(`Twilio list ${listRes.status}: ${await listRes.text()}`);
  const list = await listRes.json();
  const numbers = list.incoming_phone_numbers || [];
  console.log(`Números en la cuenta: ${numbers.length}`);

  for (const n of numbers) {
    console.log(`- ${n.phone_number} (${n.friendly_name}) VoiceUrl actual: ${n.voice_url || '(vacío)'}`);
    const body = new URLSearchParams({
      VoiceUrl: INBOUND_URL,
      VoiceMethod: 'POST',
    });
    const upd = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${n.sid}.json`,
      { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body }
    );
    if (!upd.ok) {
      console.error(`  ERROR actualizando ${n.phone_number}: ${upd.status} ${await upd.text()}`);
    } else {
      const updated = await upd.json();
      console.log(`  OK -> VoiceUrl: ${updated.voice_url} (${updated.voice_method})`);
    }
  }

  console.log(`\nNúmero de plataforma configurado en Firestore: ${phoneNumber || '(ninguno)'}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
