const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}, globals = {}) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>dependencies[id]??require(id),console,AbortSignal,...globals});
 return exports;
}
const equipment = load('packages/shared/src/vehicle-equipment.ts');
const marketing = load('packages/shared/src/vehicle-marketing.ts',{'./vehicle-equipment':equipment});
const vin='1HGCM82633A004352';
const vehicle={id:'test',make:'Honda',model:'Accord',year:2003,price:12500,currency:'USD',condition:'used',mileage:50000,mileageUnit:'mi',vin,
 specifications:{vin,equipment:equipment.buildVinEquipment({EngineModel:'V6',TransmissionStyle:'Automatic',DriveType:'FWD/Front-Wheel Drive',Seats:'5',ABS:'Standard',BackupCamera:'Standard',AppleCarPlay:'Yes',ClimateControl:'Dual-zone',ExteriorColor:'Azul',FuelTypePrimary:'Gasoline',CargoVolume:'450 L',BlindSpotMon:'Optional',Navigation:'Unknown',Sunroof:'No',PlantCity:'PRIVATE_FACTORY'},vin),privateCost:9000,internalNotes:'PRIVATE_NOTE'},sellerCommissionFixed:500};
test('rich buyer copy covers known categories and omits unknown, absent, optional and private values',()=>{
 const text=marketing.buildVehicleMarketingPost(vehicle);
 for(const value of ['Honda Accord','V6','Automática','Asientos: 5','ABS','Apple CarPlay','Azul','Gasolina','450 L','USD','millas']) assert.ok(text.includes(value),value);
 assert.doesNotMatch(text,/PRIVATE|punto ciego|Navegación|Techo solar|9000|MXN/);
 assert.ok(text.length<=1850);
});
test('manual confirmations override VIN values and erased entries do not reappear from old specs',()=>{
 const copy=JSON.parse(JSON.stringify(vehicle));
 copy.specifications.equipment.fields.AppleCarPlay={label:'Apple CarPlay',group:'entertainment',value:'',source:'manual'};
 copy.specifications.equipment.fields.BlindSpotMon.value='Sí';
 copy.specifications.equipment.fields.BlindSpotMon.source='manual';
 assert.doesNotMatch(marketing.buildVehicleMarketingPost(copy),/Apple CarPlay/);
 assert.match(marketing.buildVehicleMarketingPost(copy),/punto ciego/);
});
test('legacy decoded records are supported without inventing missing units or free prices',()=>{
 const text=marketing.buildVehicleMarketingPost({make:'Toyota',model:'Corolla',price:0,mileage:0,specifications:{decoded:{ABS:'Standard',Seats:'5'}}});
 assert.match(text,/ABS/);assert.match(text,/Asientos: 5/);assert.match(text,/0 \(unidad por confirmar\)/);assert.doesNotMatch(text,/Precio:|USD|MXN|CarPlay/);
});
test('AI data excludes VIN, private financial details, photos and arbitrary inventory keys',()=>{
 const prompt=marketing.vehicleMarketingPrompt(vehicle);
 assert.doesNotMatch(prompt,/1HGCM|PRIVATE|privateCost|Commission|9000/);
 assert.match(prompt,/AppleCarPlay/);
});
test('untrusted AI IDs and introduction cannot inject invented claims into generated copy',()=>{
 const text=marketing.buildVehicleMarketingPost(vehicle,{highlightedIds:['invented free warranty'],lead:'Garantía gratis sin accidentes'});
 assert.doesNotMatch(text,/gratis|accidentes|invented/);assert.match(text,/V6/);
});
function service(fetch, enabled=true) {
 return load('packages/core/src/social-ai.ts',{
  '@autodealers/shared/vehicle-marketing':marketing,
  './credentials':{getOpenAIApiKey:async()=> 'test-key'},
  './ai-config':{getAIConfig:async()=>({enabled,provider:'openai',contentSettings:{enabled}}),getAIApiKey:async()=> 'test-key',getAIModel:async()=> 'gpt-4o-mini'},
  './membership-ai-gate':{tenantCanGenerateContent:async()=>true},
 },{fetch});
}
test('social preparation uses saved master exactly and never calls a separate AI provider',async()=>{
 const master='Texto oficial completo.\n'+ 'Detalle confirmado. '.repeat(100);
 const post=await service(async()=>{throw Error('must not call');}).generateSocialPost({...vehicle,masterDescription:master,description:'Legacy'});
 assert.equal(post.text,master);assert.equal(post.optimizedFor.facebook.text,master);assert.equal(post.optimizedFor.instagram.caption,master);assert.deepEqual(Array.from(post.hashtags),[]);
});
test('legacy text is reused even when AI is disabled; absent description stays empty',async()=>{
 const api=service(async()=>{throw Error('must not call');},false);
 assert.equal((await api.generateSocialPost({...vehicle,description:'Legacy'})).text,'Legacy');
 assert.equal((await api.generateSocialPost(vehicle)).text,'');
});

test('sharing preserves the exact saved description without truncation or generated facts',()=>{
 const description='Texto del vendedor.\n'+ 'Información confirmada. '.repeat(100);
 assert.equal(marketing.vehicleShareDescription({...vehicle,description}),description);
 assert.equal(marketing.vehicleShareDescription(vehicle),'');
});
