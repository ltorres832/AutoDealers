import {NextRequest,NextResponse} from 'next/server';
import {verifyAuth, isDealerPortalRole} from '@/lib/auth';
import {getFirestore} from '@autodealers/core';
import {VehicleDescriptionService,DescriptionError,descriptionAvailability,type DescriptionActor} from '@autodealers/inventory/vehicle-description-service';
import {DESCRIPTION_FAILURE} from '@autodealers/shared/vehicle-description';
export const dynamic='force-dynamic';
async function context(request:NextRequest,id?:string):Promise<DescriptionActor>{const auth=await verifyAuth(request);if(!auth?.tenantId||(!isDealerPortalRole(auth.role)&&auth.role!=='admin'))throw new DescriptionError('forbidden',403);const base={userId:auth.userId,role:auth.role,tenantId:auth.tenantId};if(!id)return base;if(!/^[a-zA-Z0-9_-]{1,150}$/.test(id))throw new DescriptionError('invalid_vehicle_id');for(const tenantId of [...new Set([auth.tenantId,auth.dealerId].filter(Boolean))] as string[]){const snap=await getFirestore().collection('tenants').doc(tenantId).collection('vehicles').doc(id).get();if(snap.exists)return {...base,tenantId};}throw new DescriptionError('not_found',404);}
function failure(error:unknown){const status=error instanceof DescriptionError?error.status:500;const code=error instanceof DescriptionError?error.code:'description_failed';return NextResponse.json({error:code==='description_conflict'?'La descripción cambió en otra sesión. Vuelve a abrir el vehículo antes de guardar.':DESCRIPTION_FAILURE,code},{status});}
export async function GET(request:NextRequest){try{const id=request.nextUrl.searchParams.get('vehicleId')||undefined;const actor=await context(request,id);const config=await descriptionAvailability(actor);return NextResponse.json({config,...(id?await VehicleDescriptionService.history(actor,id):{})});}catch(error){return failure(error);}}
export async function POST(request:NextRequest){try{const body=await request.json();const actor=await context(request,body.vehicleId);let result;
 if(body.action==='confirmFeature'&&body.vehicleId&&typeof body.suggestionId==='string'&&Number.isInteger(body.expectedRevision))result=await VehicleDescriptionService.confirmSuggestedFeature(actor,body.vehicleId,body.suggestionId,body.expectedRevision);
 else if(body.action==='manual'&&body.vehicleId&&typeof body.text==='string'&&Number.isInteger(body.expectedRevision))result=await VehicleDescriptionService.saveManualDescription(actor,body.vehicleId,body.text,body.expectedRevision);
 else if(body.action==='restore'&&body.vehicleId&&typeof body.versionId==='string'&&Number.isInteger(body.expectedRevision))result=await VehicleDescriptionService.restoreDescriptionVersion(actor,body.vehicleId,body.versionId,body.expectedRevision);
 else if(body.action==='generate'||body.action==='regenerate')result=await VehicleDescriptionService.generateDescription(actor,body.vehicle||{},String(body.requestId||''),{vehicleId:body.vehicleId,regenerate:body.action==='regenerate',confirmedReplace:body.confirmedReplace===true});
 else throw new DescriptionError('invalid_action');
 return NextResponse.json({result});}catch(error){return failure(error);}}
