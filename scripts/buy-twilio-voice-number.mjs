// Compra un número de Twilio con capacidad de voz, lo apunta al webhook
// twilioVoiceInbound y actualiza system_settings/credentials.twilioPhoneNumber.
// Prioriza números de Puerto Rico (787/939); si no hay, usa uno de EE.UU.
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
  const doc = await res.json();
  const f = doc.fields || {};
  return {
    accountSid: f.twilioAccountSid?.stringValue,
    authToken: f.twilioAuthToken?.stringValue,
  };
}

async function updateFirestorePhone(phoneNumber) {
  const token = gcloudToken();
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/system_settings/credentials?updateMask.fieldPaths=twilioPhoneNumber`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { twilioPhoneNumber: { stringValue: phoneNumber } } }),
    }
  );
  if (!res.ok) throw new Error(`Firestore update ${res.status}: ${await res.text()}`);
}

async function main() {
  const { accountSid, authToken } = await getTwilioCreds();
  const auth = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  let candidate = null;
  for (const areaCode of ['787', '939', '']) {
    const qs = new URLSearchParams({ VoiceEnabled: 'true', PageSize: '5' });
    if (areaCode) qs.set('AreaCode', areaCode);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?${qs}`,
      { headers: { Authorization: auth } }
    );
    if (!res.ok) {
      console.warn(`Búsqueda ${areaCode || 'US'} falló: ${res.status}`);
      continue;
    }
    const json = await res.json();
    const nums = json.available_phone_numbers || [];
    if (nums.length > 0) {
      candidate = nums[0];
      console.log(`Disponible (${areaCode || 'US'}): ${candidate.phone_number} — ${candidate.friendly_name}`);
      break;
    }
    console.log(`Sin números disponibles para área ${areaCode || 'US'}`);
  }

  if (!candidate) {
    console.error('No se encontraron números disponibles.');
    process.exit(1);
  }

  const body = new URLSearchParams({
    PhoneNumber: candidate.phone_number,
    VoiceUrl: INBOUND_URL,
    VoiceMethod: 'POST',
    FriendlyName: 'AutoDealers Voice Agent',
  });
  const buy = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body }
  );
  if (!buy.ok) {
    console.error(`Compra falló: ${buy.status} ${await buy.text()}`);
    process.exit(1);
  }
  const purchased = await buy.json();
  console.log(`Comprado: ${purchased.phone_number} (sid ${purchased.sid})`);
  console.log(`VoiceUrl: ${purchased.voice_url} (${purchased.voice_method})`);

  await updateFirestorePhone(purchased.phone_number);
  console.log('Firestore system_settings/credentials.twilioPhoneNumber actualizado.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
