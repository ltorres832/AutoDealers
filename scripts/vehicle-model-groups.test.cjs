const test=require('node:test'),assert=require('assert/strict'),{load}=require('./description-test-loader.cjs');
const {groupSellerInventoryByMakeAndModel:group}=load('apps/public-web/src/lib/seller-inventory-grouping.ts');
test('one brand has separate model sections and trims stay with their model',()=>{
 const car=(id,make,model)=>({id,make,model,year:2025,price:10000,currency:'USD',condition:'used'});
 const result=group([car('a','Toyota','Corolla'),car('b','Toyota','Camry'),car('c','Toyota','Camry SE'),car('d','Honda','Civic')]);
 assert.equal(result.length,2);const toyota=result.find(x=>x.make==='Toyota');assert.equal(toyota.models.length,2);assert.deepEqual(toyota.models.map(x=>x.model),['Camry','Corolla']);assert.equal(toyota.models[0].totalCount,2);assert.equal(result.find(x=>x.make==='Honda').models[0].model,'Civic');
 assert.equal(result.flatMap(x=>x.models.flatMap(m=>m.variants.flatMap(v=>v.vehicles))).length,4);
});
