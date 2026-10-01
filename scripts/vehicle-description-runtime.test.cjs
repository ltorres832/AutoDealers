const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./description-test-loader.cjs');
test('Functions runtime with a named app initializes and passes the default app explicitly',async()=>{
 const named={name:'__admin__'},app={name:'[DEFAULT]'},db={};let initialized=0,called=0;
 const runtime=load('functions/src/inventory/vehicle-description-compat.ts',{
  'firebase-functions/v2/firestore':{onDocumentWrittenWithAuthContext:(_,handler)=>handler},
  'firebase-admin/app':{getApps:()=>[named],initializeApp:()=>{initialized++;return app}},
  'firebase-admin/firestore':{getFirestore:actual=>{assert.equal(actual,app);return db}},
  '../../../packages/inventory/src/vehicle-description-legacy':{reconcileLegacyVehicleDescription:async(actual,event)=>{assert.equal(actual,db);assert.equal(event.authId,'seller');called++}},
 });
 await runtime.reconcileVehicleDescription({data:{before:{},after:{}},authId:'seller'});
 assert.equal(initialized,1);assert.equal(called,1);
});
