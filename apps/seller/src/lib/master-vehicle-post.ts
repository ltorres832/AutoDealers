import type {PostContent} from '@autodealers/messaging';
import {officialVehicleDescription} from '@autodealers/shared/vehicle-description';
import {findSellerVehicleById} from './seller-vehicles';
import type {AuthUser} from './auth';
export async function masterVehiclePost(auth:AuthUser,id:unknown,content:PostContent):Promise<PostContent>{
 const clean={...content};delete clean.vehicleId;delete clean.vehicleTenantId;
 if(!id)return clean;if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(id))throw new Error('Vehículo inválido');
 const found=await findSellerVehicleById(auth,id,{allowDealerInventory:true});if(!found)throw new Error('Vehículo no disponible');const vehicle=found.vehicle;const tenantId=found.tenantId;
 const text=officialVehicleDescription({masterDescription:vehicle.masterDescription,description:vehicle.description});if(!text.trim())throw new Error('Guarda la descripción maestra del vehículo antes de publicar.');return {...clean,text,hashtags:[],vehicleId:id,vehicleTenantId:tenantId};
}
