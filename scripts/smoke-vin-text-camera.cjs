// Browser integration smoke: real OCR, synthetic camera frames, both portal components.
// Run: node scripts/smoke-vin-text-camera.cjs
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const webpack = require('next/dist/compiled/webpack/webpack').webpack;
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vin-camera-smoke-'));
const local = (relative) => JSON.stringify(path.join(root, relative));
fs.writeFileSync(path.join(temp, 'loader.cjs'), `const ts = require(${JSON.stringify(require.resolve('typescript'))}); module.exports = function(source) { return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText; };`);
fs.writeFileSync(path.join(temp, 'auth.js'), `export async function fetchWithAuth(url, options) { window.decodeCalls.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => ({ result: { make: 'Test Motor', model: 'Sedan', year: 2003 } }) }; }`);
fs.writeFileSync(path.join(temp, 'entry.js'), `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Dealer from ${local('apps/dealer/src/components/VinDecodeField.tsx')};
import Seller from ${local('apps/seller/src/components/VinDecodeField.tsx')};
window.decodeCalls = [];
function App() {
  const [vin, setVin] = useState('');
  const Field = location.search.includes('seller') ? Seller : Dealer;
  return React.createElement(Field, { value: vin, onChange: setVin, onDecoded: result => { window.decoded = result; } });
}
createRoot(document.getElementById('root')).render(React.createElement(App));
`);
async function main() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', target: 'web', context: root, entry: path.join(temp, 'entry.js'),
    output: { path: temp, filename: 'bundle.js', publicPath: '/' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules')], alias: {
      '@/lib/fetch-with-auth': path.join(temp, 'auth.js'),
      '@autodealers/core/vin-camera-scan': path.join(root, 'packages/core/src/vin-camera-scan.ts'),
    } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(temp, 'loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const server = http.createServer((req, res) => {
    const filename = path.basename(new URL(req.url, 'http://localhost').pathname);
    if (!filename) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<div id="root" style="max-width:500px"></div><script src="/bundle.js"></script>'); return; }
    const ocrAsset = req.url.startsWith('/vin-ocr/');
    const file = ocrAsset ? path.join(root, 'apps/dealer/public/vin-ocr', filename) : path.join(temp, filename);
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', filename.endsWith('.wasm') ? 'application/wasm' : filename.endsWith('.gz') ? 'application/octet-stream' : 'text/javascript; charset=utf-8'); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const portal of ['dealer', 'seller']) {
      const page = await browser.newPage();
      await page.route('https://**/*', route => route.abort());
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
          const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
          const ctx = canvas.getContext('2d');
          const draw = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1920, 1080); ctx.fillStyle = '#111'; ctx.font = '80px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1HGCM82633A004352', 960, 540); };
          draw();
          const stream = canvas.captureStream(5);
          const interval = setInterval(draw, 150);
          const track = stream.getVideoTracks()[0]; const stop = track.stop.bind(track);
          track.stop = () => { clearInterval(interval); stop(); };
          window.cameraTrack = track;
          return stream;
        } });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/?${portal}`);
      assert.equal(await page.getByRole('combobox').inputValue(), 'text');
      await page.getByRole('button', { name: 'Cámara', exact: true }).click();
      await page.waitForFunction(() => window.decoded || document.querySelector('[role="alert"]'), null, { timeout: 90000 });
      const state = await page.evaluate(() => ({ decoded: window.decoded, calls: window.decodeCalls, track: window.cameraTrack?.readyState, value: document.querySelector('input').value, error: document.querySelector('[role="alert"]')?.textContent }));
      assert.equal(state.error, undefined, state.error);
      assert.equal(state.value, '1HGCM82633A004352');
      assert.equal(state.calls.length, 1);
      assert.equal(state.calls[0].body.vin, state.value);
      assert.equal(state.decoded.make, 'Test Motor');
      assert.equal(state.track, 'ended');
      assert.deepEqual(errors, []);
      console.log(`${portal}: real text OCR -> VIN -> automatic vehicle lookup; camera stopped; PASS`);
      await page.getByRole('button', { name: 'Cámara', exact: true }).click();
      await page.getByRole('button', { name: 'Detener', exact: true }).click();
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.cameraTrack.readyState), 'ended');
      console.log(`${portal}: cancel scan releases camera; PASS`);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
