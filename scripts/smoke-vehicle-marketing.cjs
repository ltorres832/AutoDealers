const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const webpack=require('next/dist/compiled/webpack/webpack').webpack;
const root=process.cwd(), temp=fs.mkdtempSync(path.join(os.tmpdir(),'vehicle-marketing-smoke-'));
fs.writeFileSync(path.join(temp,'loader.cjs'),`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(temp,'entry.js'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import {PublishVehicleToSocialModal} from ${JSON.stringify(path.join(root,'packages/shared/src/components/PublishVehicleToSocialModal.tsx'))};
import {buildVinEquipment} from ${JSON.stringify(path.join(root,'packages/shared/src/vehicle-equipment.ts'))};
import {buildVehicleMarketingPost} from ${JSON.stringify(path.join(root,'packages/shared/src/vehicle-marketing.ts'))};
const vin='1HGCM82633A004352';
const vehicle={id:'smoke',make:'Honda',model:'Accord',year:2003,description:'Descripción guardada del vendedor.\\nSegunda línea con información confirmada.',price:12500,currency:'USD',mileage:50000,condition:'used',vin,photos:['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150"><rect width="400" height="150" fill="%23cbd5e1"/></svg>'],specifications:{vin,equipment:buildVinEquipment({EngineModel:'V6',Seats:'5',AppleCarPlay:'Yes',ABS:'Standard',BlindSpotMon:'Optional',ExteriorColor:'Azul'},vin)}};
window.requests=[];
window.fetch=async(url,options={})=>{
 window.requests.push({url,body:options.body?JSON.parse(options.body):null});
 if(url.includes('integrations'))return {ok:true,json:async()=>({integrations:[{type:'facebook',status:'active'},{type:'instagram',status:'active'}]})};
 if(url.includes('ai-generate')) {const text=buildVehicleMarketingPost(vehicle);return {ok:true,json:async()=>({post:{text,hashtags:['Honda'],generationMode:'facts',notice:'Texto preparado con la ficha. IA no disponible.',optimizedFor:{facebook:{text,hashtags:[]},instagram:{text,hashtags:[]}}}})};}
 return {ok:true,json:async()=>({success:true,results:[{platform:'facebook',success:true}]})};
};
createRoot(document.getElementById('root')).render(React.createElement(PublishVehicleToSocialModal,{vehicle,onClose:()=>{},onPublished:()=>{window.published=true}}));
`);
async function main(){
 await new Promise((resolve,reject)=>webpack({mode:'development',target:'web',context:root,entry:path.join(temp,'entry.js'),output:{path:temp,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')]},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(temp,'loader.cjs')}] }},(e,s)=>e||s.hasErrors()?reject(e||new Error(s.toString({all:false,errors:true}))):resolve()));
 const css=await require('postcss')([require('tailwindcss')({content:[path.join(root,'packages/shared/src/components/PublishVehicleToSocialModal.tsx')],theme:{extend:{colors:{primary:{50:'#fff1f1',600:'#E10600',700:'#bc0500',900:'#7c0d09'}}}}})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
 fs.writeFileSync(path.join(temp,'style.css'),css.css);
 const server=http.createServer((req,res)=>{const name=path.basename(new URL(req.url,'http://localhost').pathname);if(!name){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');return;}const file=path.join(temp,name);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript;charset=utf-8');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
 const textarea=page.locator('textarea');const initial=await textarea.inputValue();assert.equal(initial,'Descripción guardada del vendedor.\nSegunda línea con información confirmada.');
 await page.getByRole('button',{name:/Generar alternativa con IA/}).click();await page.getByRole('status').filter({hasText:/IA no disponible/}).waitFor();
 const request=await page.evaluate(()=>window.requests.find(r=>r.url.includes('ai-generate')));assert.equal(request.body.vehicle.specifications.equipment.fields.AppleCarPlay.value,'Sí');assert.equal(request.body.vehicle.currency,'USD');assert.equal(request.body.vehicle.mileageUnit,'mi');
 await textarea.fill((await textarea.inputValue())+'\nConsulta por esta unidad.');
 await page.screenshot({path:path.join(root,'.cache/vehicle-marketing-mobile.png')});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.getByRole('button',{name:'Publicar ahora',exact:true}).click();await page.waitForFunction(()=>window.published===true);
 const publish=await page.evaluate(()=>window.requests.find(r=>r.url.endsWith('/publish')));assert.match(publish.body.content.text,/Apple CarPlay/);assert.match(publish.body.content.text,/Consulta por esta unidad/);assert.deepEqual(errors,[]);
 console.log('PASS: exact saved description, complete AI payload, explicit fallback, editable preview, mocked publishing and mobile layout');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
