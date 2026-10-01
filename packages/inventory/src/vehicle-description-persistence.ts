import {createHash,randomUUID} from 'node:crypto';
import {officialVehicleDescription,descriptionInputKey,type DescriptionMeta,type VehicleDescriptionConfig} from '@autodealers/shared/vehicle-description';
export interface DescriptionActor { userId:string; role:string; tenantId:string; allowedTenantIds?:string[]; }
export class DescriptionError extends Error { constructor(public code:string,public status=400){super(code);} }
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const now=()=>new Date().toISOString();
/** Runs inside inventory's transaction. All reads precede history/audit writes. */
export async function persistVehicleDescription(database:FirebaseFirestore.Firestore,tx:FirebaseFirestore.Transaction,ref:FirebaseFirestore.DocumentReference,existing:Record<string,any>|null,updates:Record<string,any>,actor:DescriptionActor,meta:DescriptionMeta,config:VehicleDescriptionConfig){
 const prior=existing||{},revision=Number(prior.descriptionRevision)||0;
 if(meta.expectedRevision!==undefined&&meta.expectedRevision!==revision)throw new DescriptionError('description_conflict',409);
 const next={...prior,...updates},oldText=officialVehicleDescription(prior);
 const incoming=typeof updates.masterDescription==='string'?updates.masterDescription:typeof updates.description==='string'?updates.description:oldText;
 if(incoming.length>30000)throw new DescriptionError('description_too_long');
 const nextHash=hash(descriptionInputKey(next)),changedFacts=!!existing&&hash(descriptionInputKey(prior))!==nextHash,changedText=incoming!==oldText;
 let source='manual',model:string|null=null,usage:unknown=null,generatedHash:string|null=null;
 if(meta.draftId){if(!/^[a-f0-9]{64}$/.test(meta.draftId))throw new DescriptionError('invalid_draft');const draft=(await tx.get(database.collection('tenants').doc(actor.tenantId).collection('vehicle_description_drafts').doc(meta.draftId) as FirebaseFirestore.DocumentReference)).data();if(!draft||draft.status!=='complete'||draft.userId!==actor.userId||draft.expiresAt<Date.now()||(draft.vehicleId&&draft.vehicleId!==ref.id))throw new DescriptionError('invalid_draft',409);if(existing&&draft.baseRevision!==revision)throw new DescriptionError('description_conflict',409);if(draft.text===incoming){source=draft.source;model=draft.model;usage=draft.usage;generatedHash=draft.inputHash;}}
 if(meta.restoreVersionId){const v=(await tx.get(ref.collection('description_versions').doc(meta.restoreVersionId))).data();if(!v||v.text!==incoming)throw new DescriptionError('version_not_found',404);source='restore';generatedHash=v.factHash||null;}
 if(changedText&&source==='manual'&&!config.allowManualEdit)throw new DescriptionError('manual_edit_disabled',403);
 if(existing&&!prior.descriptionRevision&&oldText)tx.set(ref.collection('description_versions').doc('legacy'),{text:oldText,revision:0,source:'migration',userId:actor.userId,createdAt:now(),factHash:hash(descriptionInputKey(prior))});
 const newRevision=revision+((changedText||changedFacts||!existing||!prior.descriptionRevision||meta.restoreVersionId)?1:0);
 if(changedText||!existing||meta.restoreVersionId){const versionId=randomUUID();tx.set(ref.collection('description_versions').doc(versionId),{text:incoming,revision:newRevision,source,userId:actor.userId,createdAt:now(),model,usage,restoredFrom:meta.restoreVersionId||null,factHash:generatedHash||nextHash});tx.set(database.collection('tenants').doc(actor.tenantId).collection('vehicle_description_audit').doc(),{vehicleId:ref.id,userId:actor.userId,action:source,status:'success',versionId,revision:newRevision,model,usage,createdAt:now()});}
 const review=generatedHash?generatedHash!==nextHash:changedText?false:changedFacts?true:!!prior.descriptionNeedsReview;
 return{masterDescription:incoming,description:incoming,descriptionRevision:newRevision,descriptionNeedsReview:review,descriptionFactHash:generatedHash||nextHash,descriptionSource:changedText||!existing||meta.restoreVersionId?source:prior.descriptionSource||'migration',descriptionUpdatedBy:actor.userId,descriptionUpdatedAt:now()};
}
