// Build only this function's pure shared persistence dependencies; never include an AI key/provider.
const fs=require('fs'),path=require('path'),ts=require('typescript');
const repo=path.resolve(__dirname,'..');const output=path.join(__dirname,'lib/inventory/description-runtime');fs.mkdirSync(output,{recursive:true});
for(const relative of ['packages/shared/src/vehicle-equipment.ts','packages/shared/src/vehicle-marketing.ts','packages/shared/src/vehicle-description.ts','packages/inventory/src/vehicle-description-persistence.ts','packages/inventory/src/vehicle-description-legacy.ts']){
 const source=fs.readFileSync(path.join(repo,relative),'utf8').replaceAll("'@autodealers/shared/vehicle-description'","'./vehicle-description'");
 fs.writeFileSync(path.join(output,path.basename(relative,'.ts')+'.js'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText);
}
const source=fs.readFileSync(path.join(__dirname,'src/inventory/vehicle-description-compat.ts'),'utf8').replace('../../../packages/inventory/src/vehicle-description-legacy','./description-runtime/vehicle-description-legacy');
fs.writeFileSync(path.join(__dirname,'lib/inventory/vehicle-description-compat.js'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText);
console.log('Legacy vehicle description bridge built.');
