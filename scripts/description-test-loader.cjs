const fs=require('fs'),vm=require('vm'),ts=require('typescript');
function load(file,deps={},globals={}){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const names=['exports','require',...Object.keys(globals)];vm.runInThisContext('(function('+names.join(',')+'){'+code+'\n})',{filename:file})(exports,id=>id in deps?deps[id]:require(id),...Object.values(globals));return exports;}
module.exports={load};
