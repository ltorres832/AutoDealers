import {persistVehicleDescription,DescriptionError,type DescriptionActor} from './vehicle-description-persistence';
import {equipmentFromSpecifications} from '@autodealers/shared/vehicle-equipment';
import type {SuggestedFeature} from '@autodealers/shared/vehicle-description';
import { createHash, randomUUID } from 'node:crypto';
import { getFirestore } from '@autodealers/shared';
import { isFeatureEnabled } from '@autodealers/core';
import { DEFAULT_DESCRIPTION_CONFIG, officialVehicleDescription, descriptionInputKey, hasDescriptionData, type DescriptionVehicle, type DescriptionMeta, type VehicleDescriptionConfig } from '@autodealers/shared/vehicle-description';
import { generateConfirmedDescription } from './vehicle-description-provider';
export type {DescriptionActor} from './vehicle-description-persistence';
export {DescriptionError} from './vehicle-description-persistence';
const db=()=>getFirestore();
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const vehicleRef=(tenantId:string,id:string)=>db().collection('tenants').doc(tenantId).collection('vehicles').doc(id);
const drafts=(tenantId:string)=>db().collection('tenants').doc(tenantId).collection('vehicle_description_drafts');
const now=()=>new Date().toISOString();
export function assertDescriptionAccess(actor:DescriptionActor,tenantId:string,vehicle?:Record<string,any>){
 if(!actor.userId||!['admin','dealer','master_dealer','dealer_admin','manager','fi_manager','seller'].includes(actor.role))throw new DescriptionError('forbidden',403);
 if(actor.role!=='admin'&&actor.tenantId!==tenantId&&!actor.allowedTenantIds?.includes(tenantId))throw new DescriptionError('forbidden',403);
 if(vehicle&&actor.role==='seller'&&![vehicle.sellerId,vehicle.assignedTo,vehicle.createdBy].includes(actor.userId))throw new DescriptionError('forbidden',403);
}
export function normalizeDescriptionConfig(data:Record<string,any>={}):VehicleDescriptionConfig{
 const out={...DEFAULT_DESCRIPTION_CONFIG};
 for(const k of ['aiVehicleDescriptionsEnabled','automaticGeneration','emojis','allowManualEdit','allowRegeneration'] as const)if(typeof data[k]==='boolean')out[k]=data[k];
 const choices={rollout:['development','staging','internal','selected','all'],language:['es','en'],length:['short','medium','long'],tone:['professional','friendly','direct'],bulletFormat:['bullet','dash','check']};
 for(const [k,values]of Object.entries(choices))if(values.includes(data[k]))(out as any)[k]=data[k];
 for(const k of ['internalUserIds','tenantIds','forbiddenWords']as const)if(Array.isArray(data[k]))out[k]=data[k].filter((v:any)=>typeof v==='string').map((v:string)=>v.trim().slice(0,150)).filter(Boolean).slice(0,200);
 if(Number.isFinite(data.maxCharacters))out.maxCharacters=Math.min(10000,Math.max(600,Math.round(data.maxCharacters)));
 if(typeof data.cta==='string')out.cta=data.cta.trim().slice(0,350);
 if(typeof data.baseTemplate==='string'&&data.baseTemplate.length<=2500&&['title','introduction','commercial','features','important','cta'].every(k=>data.baseTemplate.includes('{'+k+'}')))out.baseTemplate=data.baseTemplate;
 return out;
}
export async function getVehicleDescriptionConfig(){return normalizeDescriptionConfig((await db().collection('system').doc('vehicle_descriptions').get()).data());}
export function descriptionRolloutAllowed(config:VehicleDescriptionConfig,actor:DescriptionActor,environment=process.env.APP_ENV||(process.env.NODE_ENV==='production'?'production':'development')){
 if(!config.aiVehicleDescriptionsEnabled)return false;
 switch(config.rollout){case'all':return true;case'internal':return config.internalUserIds.includes(actor.userId);case'selected':return config.tenantIds.includes(actor.tenantId)||config.internalUserIds.includes(actor.userId);default:return config.rollout===environment;}
}
export async function descriptionAvailability(actor:DescriptionActor){
 const config=await getVehicleDescriptionConfig();
 const enabled=descriptionRolloutAllowed(config,actor)&&await isFeatureEnabled(actor.role==='seller'?'seller':'dealer','aiVehicleDescriptionsEnabled');
 return {enabled,automaticGeneration:config.automaticGeneration,allowManualEdit:config.allowManualEdit,allowRegeneration:config.allowRegeneration,maxCharacters:config.maxCharacters};
}
async function audit(tenantId:string,data:Record<string,unknown>){await db().collection('tenants').doc(tenantId).collection('vehicle_description_audit').add({...data,createdAt:now()});}
export function stripDescriptionMetadata(value:Record<string,any>){for(const k of ['descriptionHistory','descriptionRevision','descriptionSource','descriptionFactHash','descriptionNeedsReview','descriptionUpdatedBy','descriptionUpdatedAt','descriptionDraftId','descriptionMeta','suggestedFeatures'])delete value[k];}
export class VehicleDescriptionService{
 static async generateDescription(actor:DescriptionActor,input:DescriptionVehicle,requestId:string,options:{vehicleId?:string;regenerate?:boolean;confirmedReplace?:boolean}={}){
  assertDescriptionAccess(actor,actor.tenantId);
  if(!/^[a-zA-Z0-9_-]{12,100}$/.test(requestId))throw new DescriptionError('invalid_request_id');
  const config=await getVehicleDescriptionConfig();
  if(!descriptionRolloutAllowed(config,actor)||!await isFeatureEnabled(actor.role==='seller'?'seller':'dealer','aiVehicleDescriptionsEnabled'))throw new DescriptionError('feature_disabled',403);
  if(options.regenerate&&!config.allowRegeneration)throw new DescriptionError('regeneration_disabled',403);
  if(!options.regenerate&&!config.automaticGeneration)throw new DescriptionError('automatic_generation_disabled',403);
  if(!hasDescriptionData(input))throw new DescriptionError('insufficient_vehicle_data');
  let baseRevision=0;
  if(options.vehicleId){const snap=await vehicleRef(actor.tenantId,options.vehicleId).get();if(!snap.exists)throw new DescriptionError('not_found',404);const current=snap.data()!;assertDescriptionAccess(actor,actor.tenantId,current);baseRevision=current.descriptionRevision||0;if(officialVehicleDescription(current)&&!options.confirmedReplace)throw new DescriptionError('replace_confirmation_required',409);}
  const inputHash=hash(descriptionInputKey(input)),ref=drafts(actor.tenantId).doc(hash(actor.userId+':'+requestId));
  const quota=db().collection('tenants').doc(actor.tenantId).collection('vehicle_description_limits').doc(actor.userId);
  const prior=await db().runTransaction(async tx=>{
   const [s,l]=await Promise.all([tx.get(ref),tx.get(quota)]);const previous=s.data();
   if(previous){if(previous.inputHash!==inputHash)throw new DescriptionError('request_conflict',409);if(previous.status==='complete')return previous;if(Date.now()-Number(previous.startedAt)<60000)throw new DescriptionError('generation_in_progress',409);}
   const budget=l.data(),fresh=budget&&Date.now()-budget.startedAt<3600000,count=fresh?Number(budget.count)||0:0;if(count>=30)throw new DescriptionError('generation_limit',429);
   tx.set(quota,{startedAt:fresh?budget.startedAt:Date.now(),count:count+1});tx.set(ref,{userId:actor.userId,tenantId:actor.tenantId,vehicleId:options.vehicleId||null,inputHash,baseRevision,status:'running',startedAt:Date.now(),expiresAt:Date.now()+86400000});return null;
  });
  if(prior)return{draftId:ref.id,text:prior.text,inputHash,model:prior.model};
  try{
   const generated=await generateConfirmedDescription(actor.tenantId,input,config);
   const result={...generated,userId:actor.userId,source:options.regenerate?'regeneration':'ai',status:'complete',inputHash,baseRevision,vehicleId:options.vehicleId||null,createdAt:now(),expiresAt:Date.now()+86400000};
   await ref.set(result,{merge:true});await audit(actor.tenantId,{userId:actor.userId,vehicleId:options.vehicleId||null,action:result.source,status:'success',draftId:ref.id,model:generated.model,usage:generated.usage});
   return{draftId:ref.id,text:generated.text,inputHash,model:generated.model};
  }catch{await ref.set({status:'error',errorCode:'provider_failed'},{merge:true});await audit(actor.tenantId,{userId:actor.userId,vehicleId:options.vehicleId||null,action:'generation',status:'error',errorCode:'provider_failed',draftId:ref.id});throw new DescriptionError('provider_failed',503);}
 }
 static regenerateDescription(actor:DescriptionActor,input:DescriptionVehicle,requestId:string,vehicleId?:string,confirmedReplace=false){return this.generateDescription(actor,input,requestId,{vehicleId,regenerate:true,confirmedReplace});}
 /** Integration point for a future visual analyzer. Findings stay private and unconfirmed. */
 static async recordPhotoSuggestions(actor:DescriptionActor,vehicleId:string,photoUrl:string,findings:Array<{label:string;value:string}>){
  const ref=vehicleRef(actor.tenantId,vehicleId);await db().runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new DescriptionError('not_found',404);const vehicle=snap.data()!;assertDescriptionAccess(actor,actor.tenantId,vehicle);if(![...(vehicle.photos||[]),...(vehicle.images||[])].includes(photoUrl))throw new DescriptionError('photo_not_in_vehicle');const suggestions=findings.slice(0,30).filter(f=>typeof f.label==='string'&&typeof f.value==='string').map(f=>({id:randomUUID(),label:f.label.slice(0,90),value:f.value.slice(0,180),status:'suggested',source:'photo',photoUrl}));tx.set(ref.collection('description_private').doc('suggestions'),{suggestedFeatures:suggestions,createdAt:now()});});
 }
 static async confirmSuggestedFeature(actor:DescriptionActor,vehicleId:string,suggestionId:string,expectedRevision:number){
  const ref=vehicleRef(actor.tenantId,vehicleId),suggestionsRef=ref.collection('description_private').doc('suggestions');let equipment:any;
  await db().runTransaction(async tx=>{const [snap,suggestions]=await Promise.all([tx.get(ref),tx.get(suggestionsRef)]);if(!snap.exists)throw new DescriptionError('not_found',404);const vehicle=snap.data()!;assertDescriptionAccess(actor,actor.tenantId,vehicle);if((vehicle.descriptionRevision||0)!==expectedRevision)throw new DescriptionError('description_conflict',409);const rows=(suggestions.data()?.suggestedFeatures||[])as SuggestedFeature[];const item=rows.find(f=>f.id===suggestionId&&f.status==='suggested');if(!item)throw new DescriptionError('suggestion_not_found',404);equipment=equipmentFromSpecifications(vehicle.specifications||{},vehicle.vin||undefined);equipment.fields['manual_photo_'+item.id.replace(/-/g,'_')]={label:item.label,value:item.value,group:'exterior',source:'manual'};item.status='confirmed';item.confirmedBy=actor.userId;item.confirmedAt=now();tx.update(suggestionsRef,{suggestedFeatures:rows});tx.update(ref,{specifications:{...vehicle.specifications,equipment},descriptionNeedsReview:true,descriptionRevision:expectedRevision+1,updatedAt:new Date()});tx.set(db().collection('tenants').doc(actor.tenantId).collection('vehicle_description_audit').doc(),{vehicleId,userId:actor.userId,action:'confirm_photo_feature',suggestionId,createdAt:now(),status:'success'});});return{...await this.history(actor,vehicleId),equipment};
 }
 static async history(actor:DescriptionActor,vehicleId:string){const ref=vehicleRef(actor.tenantId,vehicleId),snap=await ref.get();if(!snap.exists)throw new DescriptionError('not_found',404);assertDescriptionAccess(actor,actor.tenantId,snap.data());const rows=await ref.collection('description_versions').orderBy('revision','desc').limit(100).get();const suggestions=await ref.collection('description_private').doc('suggestions').get();return{suggestedFeatures:suggestions.data()?.suggestedFeatures||[],vehicle:{masterDescription:officialVehicleDescription(snap.data()!),descriptionRevision:snap.data()?.descriptionRevision||0,descriptionNeedsReview:!!snap.data()?.descriptionNeedsReview},versions:rows.docs.map(d=>({id:d.id,...d.data()}))};}
 static async commit(actor:DescriptionActor,vehicleId:string,updates:Record<string,any>,meta:DescriptionMeta={}){
  const ref=vehicleRef(actor.tenantId,vehicleId),config=await getVehicleDescriptionConfig();
  await db().runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new DescriptionError('not_found',404);assertDescriptionAccess(actor,actor.tenantId,snap.data());const patch=await descriptionPatch(tx,ref,snap.data()!,updates,actor,meta,config);tx.update(ref,{...updates,...patch,updatedAt:new Date()});});return this.history(actor,vehicleId);
 }
 static saveManualDescription(actor:DescriptionActor,vehicleId:string,text:string,expectedRevision:number){return this.commit(actor,vehicleId,{masterDescription:text,description:text},{expectedRevision});}
 static async restoreDescriptionVersion(actor:DescriptionActor,vehicleId:string,versionId:string,expectedRevision:number){const old=await vehicleRef(actor.tenantId,vehicleId).collection('description_versions').doc(versionId).get();if(!old.exists)throw new DescriptionError('version_not_found',404);return this.commit(actor,vehicleId,{masterDescription:old.data()!.text},{expectedRevision,restoreVersionId:versionId});}
 static async markDescriptionForReview(actor:DescriptionActor,vehicleId:string){const ref=vehicleRef(actor.tenantId,vehicleId);await db().runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw new DescriptionError('not_found',404);assertDescriptionAccess(actor,actor.tenantId,s.data());tx.update(ref,{descriptionNeedsReview:true,descriptionRevision:(s.data()?.descriptionRevision||0)+1,updatedAt:new Date()});});}
}
export function descriptionPatch(...args:Parameters<typeof persistVehicleDescription> extends [any,...infer Rest]?Rest:never){return persistVehicleDescription(db(),...args);}
export default VehicleDescriptionService;
