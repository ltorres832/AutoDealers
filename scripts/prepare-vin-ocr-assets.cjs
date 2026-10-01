// Serve OCR from the same portal: no runtime third-party worker/language downloads.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.resolve(__dirname,'..');
(async()=>{
 const cache=path.join(root,'packages/core/assets/vin-ocr');fs.mkdirSync(cache,{recursive:true});
 const language=path.join(cache,'eng.traineddata.gz');
 if(!fs.existsSync(language)){
  const response=await fetch('https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Language download failed: '+response.status);
  const data=Buffer.from(await response.arrayBuffer());zlib.gunzipSync(data);fs.writeFileSync(language,data);
 }
 for(const app of ['dealer','seller']){
  const dest=path.join(root,'apps',app,'public/vin-ocr');fs.mkdirSync(dest,{recursive:true});
  fs.copyFileSync(language,path.join(dest,'eng.traineddata.gz'));
  fs.copyFileSync(path.join(root,'node_modules/tesseract.js/dist/worker.min.js'),path.join(dest,'worker.min.js'));
  for(const variant of ['','simd-','relaxedsimd-'])for(const suffix of ['wasm.js','wasm']){
   const file=`tesseract-core-${variant}lstm.${suffix}`;
   fs.copyFileSync(path.join(root,'node_modules/tesseract.js-core',file),path.join(dest,file));
  }
  fs.copyFileSync(path.join(root,'node_modules/tesseract.js/LICENSE.md'),path.join(dest,'LICENSE-tesseract.txt'));
  fs.copyFileSync(path.join(root,'node_modules/tesseract.js-core/LICENSE'),path.join(dest,'LICENSE-core.txt'));
 }
 console.log('Prepared same-origin OCR worker, WebAssembly and accurate English recognition data for both portals.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
