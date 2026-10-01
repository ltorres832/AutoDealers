'use client';
import {useEffect,useRef,useState} from 'react';
import {DESCRIPTION_FAILURE,descriptionInputKey,hasDescriptionData,type DescriptionVehicle,type DescriptionMeta,type DescriptionVersion,type SuggestedFeature} from '../vehicle-description';
type Settings={enabled:boolean;automaticGeneration:boolean;allowManualEdit:boolean;allowRegeneration:boolean;maxCharacters:number};
type AdditionalData=Pick<DescriptionVehicle,'packages'|'accessories'|'modifications'|'confirmedNotes'>;
export default function VehicleDescriptionEditor({vehicle,vehicleId,value,onChange,onMetaChange,request,onConfirmedEquipment,onAdditionalDataChange,disabled=false}:{vehicle:DescriptionVehicle;vehicleId?:string;value:string;onChange:(text:string)=>void;onMetaChange:(meta:DescriptionMeta)=>void;request:(url:string,init?:RequestInit)=>Promise<Response>;onAdditionalDataChange?:(data:Partial<AdditionalData>)=>void;onConfirmedEquipment?:(equipment:any)=>void;disabled?:boolean}){
 const [config,setConfig]=useState<Settings>({enabled:false,automaticGeneration:false,allowManualEdit:true,allowRegeneration:false,maxCharacters:30000});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[versions,setVersions]=useState<DescriptionVersion[]>([]),[prior,setPrior]=useState<string|null>(null);
 const [suggestions,setSuggestions]=useState<SuggestedFeature[]>([]);
 const [needsReview,setNeedsReview]=useState(!!vehicle.descriptionNeedsReview);
 const meta=useRef<DescriptionMeta>({expectedRevision:vehicle.descriptionRevision||0});
 const started=useRef(false),mounted=useRef(true),sequence=useRef(0),baseline=useRef(descriptionInputKey(vehicle));
 const latest=useRef({value,vehicle,onChange,onMetaChange,request});latest.current={value,vehicle,onChange,onMetaChange,request};
 const inputKey=descriptionInputKey(vehicle);
 const setMeta=(next:DescriptionMeta)=>{meta.current=next;latest.current.onMetaChange(next);};
 useEffect(()=>{mounted.current=true;let alive=true;latest.current.request('/api/vehicles/description'+(vehicleId?'?vehicleId='+encodeURIComponent(vehicleId):''),{}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();if(!alive)return;setConfig(data.config);setVersions(data.versions||[]);setSuggestions(data.suggestedFeatures||[]);if(data.vehicle){setNeedsReview(data.vehicle.descriptionNeedsReview);setMeta({expectedRevision:data.vehicle.descriptionRevision});}else setMeta({expectedRevision:0});}).catch(()=>{if(alive)setMessage('La generación no está disponible. Puedes continuar con la descripción.');});return()=>{alive=false;mounted.current=false;sequence.current++;};},[vehicleId]);
 useEffect(()=>{if(value&&inputKey!==baseline.current)setNeedsReview(true);},[inputKey,value]);
 async function generate(automatic=false){
  if(busy||disabled||!hasDescriptionData(latest.current.vehicle))return;
  const before=latest.current.value;
  if(!automatic&&before&&!window.confirm('La descripción actual será reemplazada. ¿Quieres continuar? Podrás restaurar la versión anterior.'))return;
  const key=descriptionInputKey(latest.current.vehicle),turn=++sequence.current;setBusy(true);setMessage('');
  try{const response=await latest.current.request('/api/vehicles/description',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:automatic?'generate':'regenerate',vehicleId,vehicle:latest.current.vehicle,requestId:crypto.randomUUID(),confirmedReplace:!automatic})});
   const data=await response.json();if(!response.ok)throw Error(data.error||DESCRIPTION_FAILURE);
   if(!mounted.current||turn!==sequence.current)return;
   if(latest.current.value!==before||descriptionInputKey(latest.current.vehicle)!==key){setMessage('La información cambió durante la generación. Conservamos tus cambios; puedes regenerar.');setNeedsReview(true);return;}
   setPrior(before);latest.current.onChange(data.result.text);setMeta({expectedRevision:meta.current.expectedRevision,draftId:data.result.draftId});baseline.current=key;setNeedsReview(false);setMessage('Descripción preparada. Guarda el vehículo para usarla en la web y en redes.');
  }catch(error){if(mounted.current)setMessage(error instanceof Error?error.message:DESCRIPTION_FAILURE);}finally{if(mounted.current)setBusy(false);}
 }
 useEffect(()=>{if(!config.enabled||!config.automaticGeneration||started.current||value.trim()||disabled||!hasDescriptionData(vehicle))return;const timer=setTimeout(()=>{started.current=true;void generate(true);},1500);return()=>clearTimeout(timer);},[config.enabled,config.automaticGeneration,inputKey,value,disabled]);
 function edit(text:string){sequence.current++;onChange(text);setMeta({expectedRevision:meta.current.expectedRevision});}
 return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-label="Descripción maestra del vehículo">
  <label className="block text-sm font-semibold">Descripción maestra del vehículo
   <textarea value={value} onChange={e=>edit(e.target.value)} readOnly={!config.allowManualEdit} disabled={disabled} rows={9} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm" />
  </label>
  {onAdditionalDataChange&&<details><summary className="cursor-pointer text-sm font-medium">Información adicional confirmada</summary><div className="mt-3 grid gap-3 md:grid-cols-2">{(['packages','accessories','modifications']as const).map(key=><label key={key} className="text-sm">{{packages:'Paquetes',accessories:'Accesorios',modifications:'Modificaciones'}[key]} (uno por línea)<textarea rows={2} className="mt-1 w-full rounded border p-2" disabled={disabled} value={(vehicle[key]||[]).join('\n')} onChange={e=>onAdditionalDataChange({[key]:e.target.value.split('\n')})}/></label>)}<label className="text-sm">Información confirmada por el vendedor<textarea rows={2} className="mt-1 w-full rounded border p-2" disabled={disabled} value={vehicle.confirmedNotes||''} onChange={e=>onAdditionalDataChange({confirmedNotes:e.target.value})}/></label></div></details>}
  <p className="text-xs text-slate-500">Este mismo texto se utiliza en la ficha pública y en las nuevas publicaciones en redes.</p>
  {busy&&<p role="status">Generando descripción...</p>}
  {needsReview&&<p role="status" className="text-sm text-amber-800">La información del vehículo cambió. Puedes regenerar la descripción.</p>}
  {message&&<p role="status" className="text-sm text-slate-700">{message}</p>}
  <div className="flex flex-wrap gap-2">
   {config.enabled&&config.allowRegeneration&&<button type="button" disabled={busy||disabled||!hasDescriptionData(vehicle)} onClick={()=>void generate()} className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white disabled:opacity-50">Regenerar descripción con IA</button>}
   <button type="button" disabled={!value} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>navigator.clipboard.writeText(value).then(()=>setMessage('Descripción copiada.')).catch(()=>setMessage('No se pudo copiar la descripción.'))}>Copiar descripción</button>
   {prior!==null&&config.allowManualEdit&&<button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>{if(window.confirm('¿Restaurar la descripción anterior?')){const text=prior;setPrior(value);edit(text);}}}>Restaurar versión anterior</button>}
   <button type="submit" disabled={disabled} className="rounded-lg border border-primary-600 px-3 py-2 text-sm text-primary-700">Guardar vehículo</button>
  </div>
  {vehicleId&&suggestions.some(f=>f.status==='suggested')&&<div className="space-y-2 border-t pt-3"><h3 className="text-sm font-semibold">Posibles características en fotos (sin confirmar)</h3>{suggestions.filter(f=>f.status==='suggested').map(feature=><div key={feature.id} className="flex flex-wrap items-center gap-2 text-sm"><span>{feature.label}: {feature.value}</span><button type="button" disabled={busy||disabled||!onConfirmedEquipment} className="rounded border px-2 py-1 text-primary-700" onClick={async()=>{setBusy(true);try{const r=await request('/api/vehicles/description',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'confirmFeature',vehicleId,suggestionId:feature.id,expectedRevision:meta.current.expectedRevision})});const data=await r.json();if(!r.ok)throw Error(data.error);onConfirmedEquipment?.(data.result.equipment);setSuggestions(data.result.suggestedFeatures);setMeta({expectedRevision:data.result.vehicle.descriptionRevision});setNeedsReview(true);}catch(e){setMessage(e instanceof Error?e.message:DESCRIPTION_FAILURE);}finally{setBusy(false);}}}>Confirmar característica</button></div>)}</div>}
  {versions.length>0&&<details><summary className="cursor-pointer text-sm font-medium">Historial de descripciones ({versions.length})</summary><ul className="mt-3 max-h-72 space-y-3 overflow-auto">{versions.map(version=><li key={version.id} className="rounded-lg border p-3 text-sm"><p>{new Date(version.createdAt).toLocaleString()} · {version.source} · {version.userId}</p><p className="my-2 whitespace-pre-wrap">{version.text}</p><button type="button" disabled={disabled||busy||!config.allowManualEdit} onClick={()=>{if(window.confirm('¿Restaurar esta versión? Se aplicará al guardar el vehículo.')){setPrior(value);onChange(version.text);setMeta({expectedRevision:meta.current.expectedRevision,restoreVersionId:version.id});setNeedsReview(true);}}} className="font-medium text-primary-700">Restaurar esta versión</button></li>)}</ul></details>}
 </section>;
}
