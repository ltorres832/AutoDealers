const test=require('node:test'),assert=require('node:assert/strict');const {load}=require('./description-test-loader.cjs');
function tab(token){const store=new Map([['autodealers.support.tab',token]]),calls=[];const storage={getItem:k=>store.get(k)||null,removeItem:k=>store.delete(k)};const window={location:{origin:'https://dealer.test'},fetch:async(input,init)=>{calls.push({input,init});return {status:200}}};const api=load('packages/shared/src/support-tab-session.ts',{}, {window,sessionStorage:storage,Headers,Request,URL});return{api,calls,window,storage};}
test('support tabs retain separate identities and override stale browser credentials only for same-origin APIs',async()=>{
 const a=tab('sup1.accountA'),b=tab('sup1.accountB');for(const t of [a,b])t.api.installSupportTabFetch();
 await a.window.fetch('/api/user',{headers:{Authorization:'Bearer stale','X-Dealer-Tenant-Id':'wrong'}});
 await b.window.fetch('/api/user');await a.window.fetch('/api/vehicles');
 assert.equal(a.calls[0].init.headers.get('Authorization'),'Bearer sup1.accountA');assert.equal(a.calls[0].init.headers.has('X-Dealer-Tenant-Id'),false);
 assert.equal(b.calls[0].init.headers.get('Authorization'),'Bearer sup1.accountB');assert.equal(a.calls[1].init.headers.get('Authorization'),'Bearer sup1.accountA');
 await a.window.fetch('https://external.test/api/user');assert.equal(a.calls[2].init,undefined);
 a.api.clearSupportTab();assert.equal(a.api.getSupportTabToken(),'');assert.equal(b.api.getSupportTabToken(),'sup1.accountB');
});
for(const portal of ['dealer','seller'])test(`${portal}: current tab wins over a different cookie and old Firebase token`,()=>{
 const t=tab('sup1.correct');const auth=load(`apps/${portal}/src/lib/auth-token-client.ts`,{'@autodealers/shared/support-tab-session':t.api,'./dealer-tenant-storage':{DEALER_ACTIVE_TENANT_KEY:'dealerActiveTenantId'}},{window:t.window,sessionStorage:t.storage,localStorage:{getItem:()=>('eyJ'+'x'.repeat(250))},document:{cookie:'authToken=sup1.wrong'},Headers});
 assert.equal(auth.resolveClientAuthToken(),'sup1.correct');assert.equal(auth.authHeaders({Authorization:'Bearer stale'}).get('Authorization'),'Bearer sup1.correct');
});
for(const portal of ['dealer','seller'])test(`${portal}: exiting A cannot terminate B from a shared cookie`,async()=>{
 const ended=[],cleared=[];const response={cookies:{set:(...args)=>cleared.push(args)}};
 const route=load(`apps/${portal}/src/app/api/auth/support-exit/route.ts`,{'next/server':{NextResponse:{json:()=>response}},'@autodealers/core':{endSupportSession:async id=>ended.push(id),tryParseSupportSessionToken:()=>({sid:'B'})},'@/lib/auth':{verifyAuth:async()=>({supportSessionId:'A',supportMode:true})}});
 await route.POST({cookies:{get:()=>({value:'sup1.B'})}});assert.deepEqual(ended,['A']);assert.equal(cleared.length,0);
});
