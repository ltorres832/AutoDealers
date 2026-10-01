'use client';
import {useEffect, useState} from 'react';

/** The ordered File array is the upload order and the first file is the cover. */
export default function VehiclePhotoOrder({photos,onChange}:{photos:File[];onChange:(photos:File[])=>void}) {
 const [previews,setPreviews]=useState<string[]>([]);
 const [dragged,setDragged]=useState<number|null>(null);
 useEffect(()=>{const urls=photos.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(url=>URL.revokeObjectURL(url));},[photos]);
 function move(from:number,to:number){if(from===to||from<0||to<0||from>=photos.length||to>=photos.length)return;const next=[...photos];next.splice(to,0,next.splice(from,1)[0]);onChange(next);}
 if(!photos.length)return null;
 return <div className="mt-3">
  <p className="mb-2 text-sm text-gray-600">Ordena las fotos con las flechas o arrástralas. La primera será la portada.</p>
  <ol aria-label="Orden de las fotos" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
   {photos.map((file,index)=><li key={`${file.name}-${file.lastModified}-${index}`} draggable onDragStart={()=>setDragged(index)} onDragEnd={()=>setDragged(null)} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(dragged!==null)move(dragged,index);setDragged(null);}} className="rounded-lg border bg-white p-2">
    {previews[index]&&<img draggable={false} src={previews[index]} alt={`Foto ${index+1}: ${file.name}`} className="h-28 w-full rounded object-contain"/>}
    <p className="my-1 text-xs font-medium">{index===0?'Portada':`Foto ${index+1}`}</p>
    <div className="flex gap-2">
     <button type="button" aria-label={`Mover foto ${index+1} antes`} disabled={index===0} onClick={()=>move(index,index-1)} className="min-h-10 flex-1 rounded border disabled:opacity-30">←</button>
     <button type="button" aria-label={`Mover foto ${index+1} después`} disabled={index===photos.length-1} onClick={()=>move(index,index+1)} className="min-h-10 flex-1 rounded border disabled:opacity-30">→</button>
    </div>
   </li>)}
  </ol>
 </div>;
}
