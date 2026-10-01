import {onDocumentWrittenWithAuthContext} from 'firebase-functions/v2/firestore';
import {getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {reconcileLegacyVehicleDescription} from '../../../packages/inventory/src/vehicle-description-legacy';

export const reconcileVehicleDescription = onDocumentWrittenWithAuthContext({
 document:'tenants/{tenantId}/vehicles/{vehicleId}', region:'us-central1', retry:true,
},async event=>{
 if(!event.data)return;
 // The Functions runtime may have a named admin app but no default app.
 const app=getApps().find(candidate=>candidate.name==='[DEFAULT]')||initializeApp();
 const database=getFirestore(app);
 try {
  await reconcileLegacyVehicleDescription(database,{...event.data,authId:event.authId,authType:event.authType});
 } catch (error:any) {
  if (error?.status >= 400 && error?.status < 500) {
   await database.collection('tenants').doc(event.params.tenantId).collection('vehicle_description_audit').add({action:'legacy_reconciliation',status:'error',errorCode:error.code||'invalid_data',vehicleId:event.params.vehicleId,userId:event.authId||null,createdAt:new Date().toISOString()});
   return;
  }
  throw error;
 }
});
