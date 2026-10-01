const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require: id => dependencies[id] ?? require(id), console, setTimeout, clearTimeout, AbortController, ...globals });
  return exports;
}
const equipment = load('packages/shared/src/vehicle-equipment.ts');
const details = load('packages/inventory/src/vin-details.ts', { '@autodealers/shared/vehicle-equipment': equipment });
const vin = '1HGCM82633A004352';
const otherVin = '1M8GDM9AXKP042788';
const raw = { Make: 'HONDA', Model: 'Accord', ModelYear: '2003', BodyClass: 'Sedan/Saloon', EngineCylinders: '6', DisplacementL: '3.0', Seats: '5', SeatRows: '2', Doors: '4', ABS: 'Standard', BlindSpotMon: 'Optional', FuelTypePrimary: 'Gasoline', TransmissionStyle: 'Continuously Variable Transmission (CVT)', DriveType: 'FWD/Front-Wheel Drive', AirBagLocSide: '1st Row (Driver and Passenger)', ErrorCode: '0', Navigation: '', BasePrice: '30000', ErrorText: 'clean', OtherNotes: 'Factory notes' };
const makeForm = () => ({ vin, make: '', model: '', year: 2026, seats: '', doors: '', transmission: '', driveType: '', fuelType: '', equipment: equipment.emptyEquipment(vin) });

test('decodes actual seats separately from rows, CVT and drivetrain enums', () => {
  const result = details.normalizeVpicRecord(raw, vin);
  assert.equal(result.seats, 5);
  assert.equal(result.seatRows, 2);
  assert.equal(result.transmission, 'cvt');
  assert.equal(result.driveType, 'fwd');
  assert.equal(result.bodyType, 'sedan');
  assert.equal(result.equipment.fields.Seats.value, '5');
  assert.equal(details.normalizeVpicRecord({ Make: 'Honda', SeatRows: '2' }, vin).seats, undefined);
});
test('categories include every requested section and do not fabricate unknown equipment', () => {
  const data = equipment.buildVinEquipment(raw, vin);
  assert.equal(data.fields.ABS.group, 'safety');
  assert.equal(data.fields.Seats.group, 'interior');
  assert.equal(data.fields.EngineCylinders.group, 'mechanical');
  assert.match(data.fields.BlindSpotMon.value, /Opcional/);
  assert.match(data.fields.BlindSpotMon.value, /confirmar/);
  assert.equal(data.fields.Navigation, undefined);
  assert.equal(data.fields.BasePrice, undefined);
  assert.equal(data.fields.ErrorText, undefined);
  assert.equal(data.fields.extra_OtherNotes.group, 'other');
  assert.ok(equipment.EQUIPMENT_FIELDS.some(field => field.group === 'entertainment'));
  assert.ok(equipment.EQUIPMENT_FIELDS.length > 100);
  assert.equal(equipment.equipmentText(false), 'No');
  assert.equal(equipment.equipmentText('Unknown'), '');
  assert.equal(equipment.equipmentText('0'), '0');
});
test('decoding fills extended form data and preserves manual corrections on refresh', () => {
  let form = equipment.applyVinDecode(makeForm(), details.normalizeVpicRecord(raw, vin));
  assert.equal(form.make, 'Honda');
  assert.equal(form.seats, '5');
  assert.equal(form.equipment.fields.Seats.source, 'vin');
  const edited = equipment.equipmentForForm(form);
  edited.fields.Seats = { ...edited.fields.Seats, value: '7', source: 'manual' };
  edited.fields.AppleCarPlay = { label: 'Apple CarPlay', group: 'entertainment', value: 'No', source: 'manual' };
  form = equipment.applyEquipmentEdit(form, edited);
  assert.equal(form.seats, '7');
  form = equipment.applyVinDecode(form, details.normalizeVpicRecord(raw, vin));
  assert.equal(form.seats, '7');
  assert.equal(equipment.equipmentForForm(form).fields.Seats.value, '7');
  assert.equal(form.equipment.fields.AppleCarPlay.value, 'No');
});
test('manual blank overrides remain blank after decoding again', () => {
  const decoded = details.normalizeVpicRecord(raw, vin);
  const current = equipment.mergeEquipment(decoded.equipment, decoded.equipment);
  current.fields.ABS = { ...current.fields.ABS, value: '', source: 'manual' };
  assert.equal(equipment.mergeEquipment(current, decoded.equipment).fields.ABS.value, '');
});
test('changing VIN detaches equipment and ignores late responses', () => {
  const decoded = details.normalizeVpicRecord(raw, vin);
  const form = equipment.applyVinDecode(makeForm(), decoded);
  const changed = equipment.changeEquipmentVin(form, otherVin);
  assert.equal(Object.keys(changed.equipment.fields).length, 0);
  assert.equal(equipment.applyVinDecode(changed, decoded), changed);
  assert.equal(Object.keys(equipment.readEquipment(form.equipment, otherVin).fields).length, 0);
});
test('create/save/load/edit keeps categories and unrelated stored specifications', () => {
  const first = { vin, color: 'Blue', customLegacy: { value: 42 }, equipment: equipment.buildVinEquipment(raw, vin) };
  const persisted = JSON.parse(JSON.stringify(first));
  const next = equipment.mergeVehicleSpecifications(persisted, { vin, stockNumber: 'STK-001' }, vin);
  assert.equal(next.customLegacy.value, 42);
  assert.equal(next.equipment.fields.ABS.value, first.equipment.fields.ABS.value);
  const restored = equipment.equipmentFromSpecifications(next, vin);
  assert.equal(restored.fields.Seats.group, 'interior');
  const changed = equipment.mergeVehicleSpecifications(next, { vin: otherVin }, otherVin);
  assert.equal(Object.keys(changed.equipment.fields).length, 0);
});
test('hybrid classification uses electrification without inventing MPG or entertainment', () => {
  const result = details.normalizeVpicRecord({ ...raw, ElectrificationLevel: 'PHEV (Plug-in Hybrid Electric Vehicle)' }, vin);
  assert.equal(result.fuelType, 'plug-in-hybrid');
  assert.equal(result.equipment.fields.MPGCity, undefined);
  assert.equal(result.equipment.fields.AppleCarPlay, undefined);
});
function decoderHarness(cache, payload) {
  let calls = 0, writes = 0;
  const reference = { get: async () => ({ exists: !!cache, data: () => cache }), set: async () => { writes++; } };
  const api = load('packages/inventory/src/bulk-import.ts', {
    '@autodealers/shared': { getFirestore: () => ({ collection: () => ({ doc: () => reference }) }), getFirestoreFieldValue: () => ({ serverTimestamp: () => 'time' }) },
    '@autodealers/core': { normalizeVin: value => value.trim().toUpperCase(), isValidVinFormat: value => /^[A-HJ-NPR-Z0-9]{17}$/.test(value) },
    './vin-details': details, './vehicles': {}, './storage': {}, xlsx: {},
  }, { fetch: async url => { calls++; assert.match(url, /DecodeVinValuesExtended/); return { ok: true, json: async () => ({ Results: [payload] }) }; } });
  return { decode: api.decodeVin, get calls() { return calls; }, get writes() { return writes; } };
}
test('old cache is refreshed so previously decoded cars receive the extended specification sheet', async () => {
  const h = decoderHarness({ result: { make: 'Honda' }, cachedAt: { toMillis: () => Date.now() } }, raw);
  const result = await h.decode(vin);
  assert.equal(result.equipment.fields.SeatRows.value, '2');
  assert.equal(h.calls, 1);
  assert.equal(h.writes, 1);
});
test('fresh versioned cache avoids repeated remote calls', async () => {
  const h = decoderHarness({ version: 2, result: details.normalizeVpicRecord(raw, vin), cachedAt: { toMillis: () => Date.now() } }, raw);
  assert.equal((await h.decode(vin)).seats, 5);
  assert.equal(h.calls, 0);
});
test('unavailable results are retried and never cached permanently', async () => {
  const h = decoderHarness({ version: 2, result: null }, {});
  assert.equal(await h.decode(vin), null);
  assert.equal(await h.decode(vin), null);
  assert.equal(h.calls, 2);
  assert.equal(h.writes, 0);
});

test('legacy inventory specifications appear without requiring another VIN lookup', () => {
  const data = equipment.equipmentFromSpecifications({ vin, engine: 'V6', transmission: 'automatic', seats: 5, color: 'Azul', mpgCity: 20 }, vin);
  assert.equal(data.fields.EngineModel.value, 'V6');
  assert.equal(data.fields.Seats.value, '5');
  assert.equal(data.fields.MPGCity.value, '20 MPG');
  assert.equal(data.fields.ExteriorColor.source, 'manual');
  assert.equal(Object.keys(equipment.equipmentFromSpecifications({ vin, engine: 'V6' }, otherVin).fields).length, 0);
});
test('cleared equipment is never restored from a legacy specification', () => {
  const data = equipment.emptyEquipment(vin);
  data.fields.Seats = { label: 'Asientos', group: 'interior', value: '', source: 'manual' };
  const result = equipment.equipmentFromSpecifications({ vin, seats: 7, equipment: data }, vin);
  assert.equal(result.fields.Seats.value, '');
});

test('public equipment reads its own VIN when the legacy VIN field is missing',()=>{
 const saved=equipment.buildVinEquipment(raw,vin);
 assert.equal(equipment.equipmentFromSpecifications({equipment:saved}).fields.Seats.value,'5');
 assert.equal(equipment.equipmentFromSpecifications({equipment:saved},otherVin).fields.Seats,undefined);
});
