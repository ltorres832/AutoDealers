const test=require('node:test'),assert=require('node:assert/strict');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8188';
const admin=require('firebase-admin');admin.initializeApp({projectId:'demo-vehicle-descriptions'});const db=admin.firestore();
const {load}=require('./description-test-loader.cjs');
const equipment=load('packages/shared/src/vehicle-equipment.ts');const marketing=load('packages/shared/src/vehicle-marketing.ts',{'./vehicle-equipment':equipment});const shared=load('packages/shared/src/vehicle-description.ts',{'./vehicle-marketing':marketing,'./vehicle-equipment':equipment});
const core={isFeatureEnabled:async()=>true,isValidVin:v=>/^[A-HJ-NPR-Z0-9]{17}$/.test(v),normalizeVin:v=>String(v||'').trim().toUpperCase(),toVinNormalized:v=>String(v||'').trim().toUpperCase()};
const service=load('packages/inventory/src/vehicle-description-service.ts',{'@autodealers/shared/vehicle-equipment':equipment,'@autodealers/shared':{getFirestore:()=>db},'@autodealers/core':core,'@autodealers/shared/vehicle-description':shared,'./vehicle-description-persistence':load('packages/inventory/src/vehicle-description-persistence.ts',{'@autodealers/shared/vehicle-description':shared}),'./vehicle-description-provider':{generateConfirmedDescription:async()=>({text:'Descripción IA confirmada',model:'test-only',usage:{totalTokens:1}})}});
const inventory=load('packages/inventory/src/vehicles.ts',{'./vehicle-description-service':service,'@autodealers/shared/vehicle-equipment':equipment,'@autodealers/shared/vehicle-description':shared,'@autodealers/shared':{getFirestore:()=>db,getFirestoreFieldValue:()=>admin.firestore.FieldValue},'@autodealers/core':core});
const actor={userId:'seller',role:'seller',tenantId:'emulator-description'};let id;
test('real Firestore create, regenerate, history, simultaneous edits and legacy migration',async()=>{
 await db.doc('system/vehicle_descriptions').set({...shared.DEFAULT_DESCRIPTION_CONFIG,aiVehicleDescriptionsEnabled:true,rollout:'all'});
 const car=await inventory.createVehicle(actor.tenantId,{vin:'1HGCM82633A004352',year:2003,make:'Honda',model:'Accord',price:12000,mileage:18450,mileageUnit:'mi',condition:'used',description:'Manual inicial',stockNumber:'TEST-DESCRIPTION',photos:[],specifications:{engine:'V6',vin:'1HGCM82633A004352'}},actor.userId,actor);id=car.id;
 assert.equal(car.masterDescription,'Manual inicial');
 let history=await service.VehicleDescriptionService.history(actor,id);assert.equal(history.versions.length,1);
 const fresh=(await db.doc(`tenants/${actor.tenantId}/vehicles/${id}`).get()).data();
 const draft=await service.VehicleDescriptionService.regenerateDescription(actor,fresh,'request_real_emulator',id,true);
 await inventory.updateVehicle(actor.tenantId,id,{masterDescription:draft.text,descriptionMeta:{expectedRevision:1,draftId:draft.draftId}},actor);
 history=await service.VehicleDescriptionService.history(actor,id);assert.equal(history.versions.length,2);assert.equal(history.vehicle.descriptionNeedsReview,false);
 const results=await Promise.allSettled([service.VehicleDescriptionService.saveManualDescription(actor,id,'Sesión A',2),service.VehicleDescriptionService.saveManualDescription(actor,id,'Sesión B',2)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await inventory.updateVehicle(actor.tenantId,id,{price:15000,descriptionMeta:{expectedRevision:3}},actor);history=await service.VehicleDescriptionService.history(actor,id);assert.equal(history.vehicle.descriptionNeedsReview,true);
 const legacy=db.doc(`tenants/${actor.tenantId}/vehicles/legacy`);await legacy.set({sellerId:'seller',year:2020,make:'Toyota',model:'Corolla',description:'Anterior'});await service.VehicleDescriptionService.saveManualDescription(actor,'legacy','Actual',0);assert.equal((await service.VehicleDescriptionService.history(actor,'legacy')).versions.length,2);
});
test('actual Firestore rules protect drafts, versions, settings and master from clients',async()=>{
 const {initializeApp,deleteApp}=require('firebase/app');const {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,terminate}=require('firebase/firestore');
 for(const role of ['anonymous','seller','outsider']){const app=initializeApp({projectId:'demo-vehicle-descriptions',apiKey:'emulator-only'},role);const client=getFirestore(app);connectFirestoreEmulator(client,'127.0.0.1',8188,role==='anonymous'?{}:{mockUserToken:{sub:role,role:'seller',tenantId:role==='seller'?actor.tenantId:'other'}});
 try{assert.ok((await getDoc(doc(client,`tenants/${actor.tenantId}/vehicles/${id}`))).exists());for(const path of [`tenants/${actor.tenantId}/vehicles/${id}/description_versions/private`,`tenants/${actor.tenantId}/vehicle_description_drafts/private`,`tenants/${actor.tenantId}/vehicle_description_audit/private`,'system/vehicle_descriptions']){await assert.rejects(getDoc(doc(client,path)),e=>e.code==='permission-denied');await assert.rejects(setDoc(doc(client,path),{text:'hacked'}),e=>e.code==='permission-denied');}await assert.rejects(updateDoc(doc(client,`tenants/${actor.tenantId}/vehicles/${id}`),{masterDescription:'hacked'}),e=>e.code==='permission-denied');}finally{await terminate(client);await deleteApp(app);}}
});
test('legacy mobile saves use canonical history, ignore duplicates and never replace newer edits',async()=>{
 const {reconcileLegacyVehicleDescription:reconcile}=require('../functions/lib/inventory/description-runtime/vehicle-description-legacy');
 const ref=db.doc('tenants/emulator-description/vehicles/mobile');
 const empty=await ref.get();await ref.set({sellerId:'seller',make:'Toyota',model:'Corolla',year:2020,mileage:200,description:'Desde móvil'});const created=await ref.get();
 await reconcile(db,{before:empty,after:created,authId:'seller'});let saved=await ref.get();assert.equal(saved.data().masterDescription,'Desde móvil');assert.equal(saved.data().descriptionUpdatedBy,'seller');
 await reconcile(db,{before:empty,after:created,authId:'seller'});assert.equal((await ref.collection('description_versions').get()).size,1);
 const before=saved;await ref.update({description:'Edición móvil',mileage:201});const after=await ref.get();await reconcile(db,{before,after,authId:'seller'});saved=await ref.get();assert.equal(saved.data().masterDescription,'Edición móvil');assert.equal((await ref.collection('description_versions').get()).size,2);
 await reconcile(db,{before:after,after:saved,authId:'service-account'});assert.equal((await ref.collection('description_versions').get()).size,2);
 const staleBefore=saved;await ref.update({description:'Viejo'});const staleAfter=await ref.get();await ref.update({description:'Más reciente'});await reconcile(db,{before:staleBefore,after:staleAfter,authId:'seller'});assert.equal((await ref.get()).data().description,'Más reciente');
 const latest=await ref.get();await reconcile(db,{before:staleAfter,after:latest,authId:'seller'});const reviewed=await ref.get();await ref.update({price:25000});await reconcile(db,{before:reviewed,after:await ref.get(),authId:'seller'});assert.equal((await ref.get()).data().descriptionNeedsReview,true);
});
test.after(async()=>{await db.terminate();await admin.app().delete();});
