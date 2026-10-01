// Local browser smoke for extended VIN equipment, manual confirmation and public display.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const webpack = require('next/dist/compiled/webpack/webpack').webpack;
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vin-equipment-smoke-'));
const local = file => JSON.stringify(path.join(root, file));
fs.writeFileSync(path.join(temp, 'loader.cjs'), `const ts = require(${JSON.stringify(require.resolve('typescript'))}); module.exports = function(source) { return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText; };`);
fs.writeFileSync(path.join(temp, 'entry.js'), `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import DealerVin from ${local('apps/dealer/src/components/VinDecodeField.tsx')};
import SellerVin from ${local('apps/seller/src/components/VinDecodeField.tsx')};
import Editor from ${local('packages/shared/src/components/VehicleEquipmentEditor.tsx')};
import Details from ${local('packages/shared/src/components/VehicleEquipmentDetails.tsx')};
import Summary from ${local('apps/public-web/src/components/VehicleEquipmentSummary.tsx')};
import { normalizeVpicRecord } from ${local('packages/inventory/src/vin-details.ts')};
import { emptyEquipment, applyVinDecode, applyEquipmentEdit, equipmentForForm, equipmentFromSpecifications, changeEquipmentVin } from ${local('packages/shared/src/vehicle-equipment.ts')};
const vin = '1HGCM82633A004352';
window.decodeCalls=[];
const decoded = normalizeVpicRecord({ Make:'HONDA', Model:'Accord', ModelYear:'2003', Seats:'5', SeatRows:'2', ABS:'Standard', BlindSpotMon:'Optional', Doors:'4', EngineCylinders:'6', DisplacementL:'3', ErrorCode:'0' }, vin);
function App() {
 const [form, setForm] = useState({ vin:'', make:'', model:'', year:2026, seats:'', doors:'', equipment:emptyEquipment(vin) });
 const [view, setView] = useState(false);
 return React.createElement('main', null,
  React.createElement(location.search.includes('seller') ? SellerVin : DealerVin, {value:form.vin,onChange:value=>setForm(prev=>changeEquipmentVin(prev,value)),onDecoded:result=>setForm(prev=>applyVinDecode(prev,result))}),
  React.createElement('button', {onClick: () => { window.saved = JSON.parse(JSON.stringify({vin:form.vin, equipment:equipmentForForm(form)})); }}, 'Guardar'),
  React.createElement('button', {onClick: () => setForm(prev => ({...prev, equipment:equipmentFromSpecifications(window.saved, vin)}))}, 'Volver a editar'),
  React.createElement('button', {onClick: () => setView(prev => !prev)}, 'Vista publica'),
  React.createElement('p', {'data-testid':'identity'}, form.make + ' ' + form.model + ' ' + form.year),
  view ? React.createElement(React.Fragment, null, React.createElement(Summary, {vehicle:{specifications:window.saved,vin}}), React.createElement(Details, {specifications:window.saved, vin})) : React.createElement(Editor, {value:equipmentForForm(form), onChange: value => setForm(prev => applyEquipmentEdit(prev, value))})
 );
}
createRoot(document.getElementById('root')).render(React.createElement(App));
`);
fs.writeFileSync(path.join(temp, 'auth.js'), `import {normalizeVpicRecord} from ${local('packages/inventory/src/vin-details.ts')};export async function fetchWithAuth(url,options){const {vin}=JSON.parse(options.body);window.decodeCalls.push(vin);return {ok:true,json:async()=>({vin,result:normalizeVpicRecord({Make:'HONDA',Model:'Accord',ModelYear:'2003',Seats:'5',SeatRows:'2',ABS:'Standard',BlindSpotMon:'Optional',Doors:'4',EngineCylinders:'6',DisplacementL:'3',TransmissionStyle:'Automatic',DriveType:'FWD/Front-Wheel Drive',ErrorCode:'0'},vin)})};}`);
async function main() {
 const css = await require('postcss')([require('tailwindcss')({ content: [path.join(root, 'packages/shared/src/components/Vehicle*.tsx')], theme: { extend: { colors: { primary: {50:'#fff1f1',100:'#ffe0df',200:'#ffc7c5',600:'#E10600',700:'#bc0500',800:'#9b0a06'} } } } })]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined });
 fs.writeFileSync(path.join(temp, 'style.css'), css.css);
 await new Promise((resolve, reject) => webpack({ mode:'development', target:'web', context:root, entry:path.join(temp,'entry.js'), output:{path:temp,filename:'bundle.js',publicPath:'/'}, resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')],alias:{'@/lib/fetch-with-auth':path.join(temp,'auth.js'),'@autodealers/core/vin-camera-scan':path.join(root,'packages/core/src/vin-camera-scan.ts'),'@autodealers/shared/vehicle-equipment':path.join(root,'packages/shared/src/vehicle-equipment.ts')}}, module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(temp,'loader.cjs')}] } }, (error,stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({all:false,errors:true}))) : resolve()));
 const server = http.createServer((req,res) => {
  const filename = path.basename(new URL(req.url,'http://localhost').pathname);
  if (!filename) { res.setHeader('Content-Type','text/html; charset=utf-8'); res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root" style="max-width:850px;margin:auto;padding:12px"></div><script src="/bundle.js"></script>'); return; }
  const file=path.join(temp,filename); if (!fs.existsSync(file)) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',filename.endsWith('.css')?'text/css':'text/javascript; charset=utf-8');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 let browser;
 try {
  browser=await chromium.launch({headless:true});
  for(const portal of ['dealer','seller']) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?'+portal);
  await page.getByPlaceholder('17 caracteres',{exact:true}).fill('1HGCM82633A004352');
  await page.waitForFunction(()=>window.decodeCalls.length===1);
  await page.getByTestId('identity').filter({hasText:'Honda Accord 2003'}).waitFor();
  assert.equal(await page.getByTestId('identity').textContent(),'Honda Accord 2003');
  assert.match(await page.getByRole('tabpanel').textContent(),/Cilindrada: 3 L/);
  assert.equal(await page.getByRole('tabpanel').locator('input').count(),0);
  assert.equal(await page.getByRole('tab',{selected:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(225, 6, 0)');
  await page.getByRole('tab',{name:'Seguridad',exact:true}).click();
  assert.match(await page.getByRole('tabpanel').textContent(),/Opcional/);
  await page.getByRole('button',{name:'Editar especificaciones',exact:true}).click();
  assert.equal(await page.getByLabel('Frenos antibloqueo (ABS)',{exact:true}).inputValue(),'De serie');
  await page.getByRole('button',{name:'Ver presentación',exact:true}).click();
  await page.getByRole('tab',{name:'Entretenimiento',exact:true}).click();
  assert.match(await page.getByRole('tabpanel').textContent(),/No hay información/);
  await page.getByRole('button',{name:'+ Agregar característica confirmada',exact:true}).click();
  await page.getByLabel('Característica',{exact:true}).selectOption('AppleCarPlay');
  await page.getByLabel('Detalle confirmado',{exact:true}).fill('Confirmado en la unidad');
  await page.getByRole('button',{name:'Agregar a la ficha',exact:true}).click();
  await page.getByRole('button',{name:'Decodificar',exact:true}).click();
  await page.waitForFunction(()=>window.decodeCalls.length===2);
  assert.match(await page.getByRole('tabpanel').textContent(),/Confirmado en la unidad/);
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('button',{name:'Volver a editar',exact:true}).click();
  assert.match(await page.getByRole('tabpanel').textContent(),/Confirmado en la unidad/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('button',{name:'Vista publica',exact:true}).click();
  assert.ok(await page.getByLabel('Resumen de especificaciones').isVisible());
  await page.getByRole('tab',{name:'Entretenimiento',exact:true}).click();
  assert.match(await page.getByRole('tabpanel').textContent(),/Apple CarPlay: Confirmado en la unidad/);
  assert.equal(await page.getByRole('tabpanel').locator('input').count(),0);
  await page.getByRole('tab',{name:'Mecánica',exact:true}).click();
  await page.getByRole('tab',{name:'Mecánica',exact:true}).press('ArrowRight');
  assert.equal(await page.getByRole('tab',{name:'Exterior',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByRole('tab',{name:'Mecánica',exact:true}).click();
  await page.setViewportSize({width:1100,height:760});
  await page.getByRole('region',{name:'Especificaciones detalladas'}).screenshot({path:path.join(root,'.cache/vin-specifications-tabs-'+portal+'.png')});
  assert.deepEqual(errors,[]);
  await page.close();
  console.log(portal+': PASS automatic typed VIN, loaded data, tabs, separate editing, manual preservation, public view and keyboard/mobile layout');
  }
 } finally { if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
