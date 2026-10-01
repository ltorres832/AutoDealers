import type {PostContent} from '@autodealers/messaging';
import {officialVehicleDescription} from '@autodealers/shared/vehicle-description';
import {getFirestore} from '@autodealers/core';
import type {AuthUser} from './auth';
export async function masterVehiclePost(auth:AuthUser,id:unknown,content:PostContent):Promise<PostContent>{
 const clean={...content};delete clean.vehicleId;delete clean.vehicleTenantId;
 if(!id)return clean;if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(id))throw new Error('Vehículo inválido');
 let vehicle:Record<string,any>|undefined;let tenantId=auth.tenantId!;for(const scope of [...new Set([auth.tenantId,auth.dealerId].filter(Boolean))] as string[]){const snap=await getFirestore().collection('tenants').doc(scope).collection('vehicles').doc(id).get();if(snap.exists){vehicle=snap.data();tenantId=scope;break;}}if(!vehicle)throw new Error('Vehículo no disponible');
 const text=officialVehicleDescription(vehicle);if(!text.trim())throw new Error('Guarda la descripción maestra del vehículo antes de publicar.');return {...clean,text,hashtags:[],vehicleId:id,vehicleTenantId:tenantId};
}
