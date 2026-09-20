// Diagnóstico de la cuenta Twilio: estado, tipo, subcuentas y números.
import { execSync } from 'child_process';

const PROJECT = 'autodealers-7f62e';

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
    phoneNumber: f.twilioPhoneNumber?.stringValue,
  };
}

async function main() {
  const { accountSid, authToken, phoneNumber } = await getTwilioCreds();
  const auth = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const acc = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
    headers: { Authorization: auth },
  });
  if (!acc.ok) {
    console.error(`Credenciales inválidas: ${acc.status} ${await acc.text()}`);
    process.exit(1);
  }
  const account = await acc.json();
  console.log(`Cuenta: ${account.friendly_name} · status=${account.status} · type=${account.type}`);

  const subs = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts.json?PageSize=20`,
    { headers: { Authorization: auth } }
  );
  const subsJson = await subs.json();
  for (const a of subsJson.accounts || []) {
    if (a.sid === accountSid) continue;
    console.log(`Subcuenta: ${a.sid} · ${a.friendly_name} · ${a.status}`);
  }

  if (phoneNumber) {
    const q = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
      { headers: { Authorization: auth } }
    );
    const qJson = await q.json();
    console.log(`Búsqueda de ${phoneNumber} en cuenta principal: ${(qJson.incoming_phone_numbers || []).length} resultado(s)`);
  }

  const balance = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`,
    { headers: { Authorization: auth } }
  );
  if (balance.ok) {
    const b = await balance.json();
    console.log(`Balance: ${b.balance} ${b.currency}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
