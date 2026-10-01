import {DEFAULT_DESCRIPTION_CONFIG, descriptionInputKey, officialVehicleDescription} from '@autodealers/shared/vehicle-description';
import {persistVehicleDescription} from './vehicle-description-persistence';

/** Bridges older clients that still write description directly. No AI request is made here. */
export async function reconcileLegacyVehicleDescription(database:FirebaseFirestore.Firestore, event:{before:FirebaseFirestore.DocumentSnapshot;after:FirebaseFirestore.DocumentSnapshot;authId?:string;authType?:string}) {
 const {before,after}=event;
 if(!after.exists)return;
 const previous=before.data()||{}, incoming=after.data()!;
 const serverCommit=incoming.descriptionUpdatedAt!==previous.descriptionUpdatedAt && incoming.description===incoming.masterDescription;
 if(serverCommit)return;
 if(before.exists && incoming.description===previous.description && descriptionInputKey(incoming)===descriptionInputKey(previous))return;
 const configSnapshot=await database.collection('system').doc('vehicle_descriptions').get();
 const config={...DEFAULT_DESCRIPTION_CONFIG,...configSnapshot.data()};
 await database.runTransaction(async tx=>{
  const fresh=await tx.get(after.ref);
  // Firestore can deliver duplicate/out-of-order events. Never replace a newer write.
  if(!fresh.exists||!fresh.updateTime?.isEqual(after.updateTime!))return;
  const text=typeof incoming.description==='string'?incoming.description:officialVehicleDescription(incoming);
  const actor={userId:event.authId||`legacy:${event.authType||'unknown'}`,role:'admin',tenantId:after.ref.parent.parent!.id};
  const patch=await persistVehicleDescription(database,tx,after.ref,before.exists?previous:null,{...incoming,masterDescription:text},actor,{},config);
  tx.update(after.ref,patch);
 });
}
