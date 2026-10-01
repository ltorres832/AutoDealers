/** Support identity belongs to the tab, never the browser's normal Firebase session. */
export const SUPPORT_TAB_KEY='autodealers.support.tab';
export function getSupportTabToken():string {
 if(typeof window==='undefined')return '';
 try{return sessionStorage.getItem(SUPPORT_TAB_KEY)||'';}catch{return '';}
}
export function clearSupportTab(){if(typeof window!=='undefined')sessionStorage.removeItem(SUPPORT_TAB_KEY);}

/** Install before child effects, including legacy callers that still use raw fetch. */
export function installSupportTabFetch(){
 if(typeof window==='undefined'||(window as any).__supportTabFetch)return;
 (window as any).__supportTabFetch=true;
 const original=window.fetch.bind(window);
 window.fetch=(input,init)=>{
  const token=getSupportTabToken();
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,window.location.origin);
  if(!token||url.origin!==window.location.origin||!url.pathname.startsWith('/api/'))return original(input,init);
  const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
  headers.set('Authorization',`Bearer ${token}`);
  headers.delete('X-Dealer-Tenant-Id');
  return original(input,{...init,headers,credentials:'include'});
 };
}
