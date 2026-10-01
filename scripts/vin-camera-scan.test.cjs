const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const zxing = require('@zxing/library');
const root = path.resolve(__dirname, '..');
function load(relative, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (id) => dependencies[id] ?? require(id), ...globals });
  return exports;
}
const vin = load('packages/core/src/vin.ts');
const good = '1HGCM82633A004352';
const other = '1M8GDM9AXKP042788';
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(setImmediate); };
function harness({ results = [], camera, createWorker, mode = 'text', barcodeResults = [] } = {}) {
  const timers = new Map();
  let id = 0, stops = 0, terminations = 0, reads = 0;
  const track = { stop: () => { stops++; }, getCapabilities: () => ({}) };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = { srcObject: null, readyState: 2, videoWidth: 1920, videoHeight: 1080, setAttribute() {}, play: async () => {} };
  const worker = { terminate: async () => { terminations++; }, setParameters: async () => {}, recognize: async () => {
    reads++;
    const data = results.shift() ?? { text: '', confidence: 0 };
    return typeof data === 'function' ? data() : { data };
  } };
  const found = [], errors = [], statuses = [];
  let timeouts = 0;
  class Reader {
    reset() {}
    decode() {
      const value = barcodeResults.shift();
      if (!value) throw new zxing.NotFoundException();
      return { getText: () => value };
    }
  }
  const scanner = load('packages/core/src/vin-camera-scan.ts', {
    './vin': vin,
    'tesseract.js': { createWorker: () => createWorker ? createWorker(worker) : Promise.resolve(worker), PSM: { SINGLE_LINE: '7' } },
    '@zxing/library': { ...zxing, BrowserMultiFormatReader: Reader },
  }, {
    navigator: { mediaDevices: { getUserMedia: () => camera ? camera(stream) : Promise.resolve(stream) } },
    document: { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) },
    setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; },
    clearTimeout: (key) => timers.delete(key),
  });
  const handle = scanner.startVinCameraScan({ video, mode, onDetected: (v) => found.push(v), onError: (e) => errors.push(e), onStatus: (s) => statuses.push(s), onTimeout: () => { timeouts++; } });
  return { handle, found, errors, video, statuses, get stops() { return stops; }, get terminations() { return terminations; }, get reads() { return reads; }, get timeouts() { return timeouts; },
    async next(ms) { const entry = [...timers].find(([, t]) => t.ms === ms); assert.ok(entry, `timer ${ms}`); timers.delete(entry[0]); entry[1].fn(); await flush(); },
  };
}
test('VIN extraction preserves boundaries, labels and spaced text', () => {
  assert.equal(vin.extractVinFromBarcodeText(good), good);
  assert.equal(vin.extractVinFromBarcodeText('VIN: ' + good), good);
  assert.equal(vin.extractVinFromBarcodeText('VIN' + good), good);
  assert.equal(vin.extractVinFromBarcodeText(good.split('').join(' ')), good);
  assert.equal(vin.extractVinFromBarcodeText(JSON.stringify({ vin: good })), good);
  assert.equal(vin.extractVinFromBarcodeText('A' + good + 'B'), null);
  assert.equal(vin.extractVinFromBarcodeText(good + '\n' + other), null);
  assert.equal(vin.extractVinFromBarcodeText(good.slice(0, 8) + 'I' + good.slice(8)), null);
});
test('text scanning only autofills after two matching confident frames and stops camera', async () => {
  const h = harness({ results: [{ text: good, confidence: 90 }, { text: good, confidence: 92 }] });
  await flush();
  assert.equal(h.found.length, 0);
  await h.next(300);
  assert.deepEqual(h.found, [good]);
  assert.equal(h.stops, 1);
  assert.equal(h.terminations, 1);
  assert.equal(h.video.srcObject, null);
  h.handle.stop();
  assert.equal(h.stops, 1);
});
test('low confidence and different frames cannot autofill', async () => {
  const h = harness({ results: [{ text: good, confidence: 30 }, { text: good, confidence: 90 }, { text: other, confidence: 95 }, { text: good, confidence: 95 }] });
  await flush();
  for (let i = 0; i < 3; i++) await h.next(300);
  assert.equal(h.found.length, 0);
  h.handle.stop();
});
test('cancelling before camera permission resolves releases the late stream', async () => {
  let resolveCamera;
  const h = harness({ camera: (stream) => new Promise((resolve) => { resolveCamera = () => resolve(stream); }) });
  h.handle.stop();
  resolveCamera();
  await flush();
  assert.equal(h.stops, 1);
  assert.equal(h.reads, 0);
  assert.equal(h.video.srcObject, null);
});
test('cancelling while OCR loads terminates the late worker', async () => {
  let resolveWorker;
  const h = harness({ createWorker: (worker) => new Promise((resolve) => { resolveWorker = () => resolve(worker); }) });
  await flush();
  h.handle.stop();
  resolveWorker();
  await flush();
  assert.equal(h.stops, 1);
  assert.equal(h.terminations, 1);
  assert.equal(h.reads, 0);
});
test('cancelling in-flight recognition ignores its result', async () => {
  let resolveResult;
  const h = harness({ results: [() => new Promise((resolve) => { resolveResult = () => resolve({ data: { text: good, confidence: 90 } }); })] });
  await flush();
  h.handle.stop();
  resolveResult();
  await flush();
  assert.equal(h.found.length, 0);
  assert.equal(h.errors.length, 0);
});
test('timeout stops scanning and reports no result', async () => {
  const h = harness();
  await flush();
  await h.next(45000);
  assert.equal(h.timeouts, 1);
  assert.equal(h.stops, 1);
  assert.equal(h.terminations, 1);
});
test('OCR preparation timeout is a visible loading error', async () => {
  let resolveWorker;
  const h = harness({ createWorker: (worker) => new Promise((resolve) => { resolveWorker = () => resolve(worker); }) });
  await flush();
  await h.next(45000);
  assert.equal(h.errors.length, 1);
  assert.equal(h.timeouts, 0);
  resolveWorker();
  await flush();
  assert.equal(h.terminations, 1);
});
test('camera denial reports error without starting recognition', async () => {
  const h = harness({ camera: async () => { throw 'NotAllowedError'; } });
  await flush();
  assert.equal(h.errors.length, 1);
  assert.equal(h.reads, 0);
});
test('barcode mode continues after empty and irrelevant codes', async () => {
  const h = harness({ mode: 'barcode', barcodeResults: [null, '12345', 'VIN: ' + good] });
  await flush();
  await h.next(150);
  assert.equal(h.found.length, 0);
  await h.next(150);
  assert.deepEqual(h.found, [good]);
  assert.equal(h.stops, 1);
  assert.equal(h.errors.length, 0);
});
