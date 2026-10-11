import type { AdminClient } from "./ab-shopify.server";
import { graphql } from "./ab-shopify.server";
import { AI_THEMES, readFile } from "./ai-shopify.server";
import { analyzeStorePages } from "./store-audit";
import type { AuditContext, AuditEvent, AuditTheme } from "./store-audit";

export const AUDIT_PRODUCTS = `#graphql
query AuditProducts { products(first: 50, query: "status:active") { nodes { title handle publishedAt } } }`;
export async function auditContext(shop: string, admin?: AdminClient): Promise<AuditContext> {
  if (!admin) return {shop, themes:[{id:"live", name:"Published theme",role:"MAIN"}],products:[],local:true};
  const [themes, products] = await Promise.all([
    graphql<{themes:{nodes:AuditTheme[]}}>(admin, AI_THEMES),
    graphql<{products:{nodes:{title:string;handle:string;publishedAt:string|null}[]}}>(admin,AUDIT_PRODUCTS),
  ]);
  return {shop, themes:themes.themes.nodes, products:products.products.nodes.filter(p=>p.publishedAt),local:false};
}

export async function runAudit(input: {shop:string;themeId:string;handle:string;password?:string}, admin: AdminClient | undefined, emit:(event:AuditEvent)=>void, signal:AbortSignal, fetcher:typeof fetch=fetch) {
  const {shop,themeId,handle}=input;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) || shop.length>100) throw new Error("Enter a valid myshopify.com store domain.");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(handle) || handle.length>200) throw new Error("Select a product or enter its product handle.");
  const context=await auditContext(shop,admin);
  const theme=context.themes.find(t=>t.id===themeId);
  if(!theme) throw new Error("Selected theme is no longer available. Refresh the theme list.");
  let cookies="";
  const origin="https://"+shop;
  const read=async(path:string,init:RequestInit={})=>{
    let url=new URL(path,origin);
    for(let redirects=0;redirects<6;redirects++){
      if(url.origin!==origin) throw new Error("Store redirected to a custom domain. Use the embedded app's theme template analysis or review the store domain configuration.");
      const response=await fetcher(url,{...init,redirect:"manual",signal:AbortSignal.any([signal,AbortSignal.timeout(25000)]),headers:{...init.headers,Cookie:cookies,"User-Agent":"SectionAudit/1.0"}});
      const setCookies=response.headers.getSetCookie?.() || [];
      if(setCookies.length) cookies=[cookies,...setCookies.map(c=>c.split(";")[0])].filter(Boolean).join("; ");
      if(response.status>=300&&response.status<400){const location=response.headers.get("location");if(!location)throw new Error("Invalid storefront redirect.");url=new URL(location,url);init={};continue;}
      if(!response.ok)throw new Error(`Storefront returned ${response.status}. Check that the product is published to the Online Store.`);
      const reader=response.body?.getReader();let html="";const decoder=new TextDecoder();
      if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;html+=decoder.decode(value,{stream:true});if(html.length>2500000)throw new Error("Store page is too large to analyze.");}}finally{await reader.cancel();}}else html=await response.text();
      return {html,url};
    }
    throw new Error("Too many storefront redirects.");
  };
  const query=themeId==="live"?"":"?preview_theme_id="+encodeURIComponent(themeId.split("/").pop()!);
  emit({type:"progress",step:0});
  let home=await read("/"+query);
  const gated=(page:{html:string;url:URL})=>page.url.pathname==="/password"||/<form[^>]+(?:action=["'][^"']*\/password|id=["']login_form)/i.test(page.html);
  if(gated(home)){
    if(!input.password){emit({type:"password",message:"Your storefront is password-protected."});return;}
    await read("/password",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({form_type:"storefront_password",utf8:"\u2713",password:input.password})});
    input.password="";
    home=await read("/"+query);
    if(gated(home)){emit({type:"password",message:"The password was not accepted. Check it and try again."});return;}
  }
  const product=await read("/products/"+encodeURIComponent(handle)+query);
  if(gated(product))throw new Error("Product page could not be unlocked. Retry the audit.");
  emit({type:"progress",step:1});
  let themeText="";
  if(admin){const index=await readFile(admin,themeId,"templates/index.json");themeText=index.content||"";}
  signal.throwIfAborted();emit({type:"progress",step:2});
  const findings=analyzeStorePages(home.html,product.html,themeText);
  emit({type:"progress",step:3});signal.throwIfAborted();emit({type:"progress",step:4});
  emit({type:"result",result:{shop,theme:theme.name,pages:[home.url.href,product.url.href],createdAt:new Date().toISOString(),findings,checks:6,coverage:"Evidence-based checks of server-rendered HTML and available homepage theme sections. JavaScript-only widgets may be missed. Priority is a heuristic, not measured revenue uplift."}});
}

export function auditStream(input: Parameters<typeof runAudit>[0],admin:AdminClient|undefined,signal:AbortSignal){
  const encoder=new TextEncoder();let cancelled=false;
  const stream=new ReadableStream({async start(controller){const emit=(event:AuditEvent)=>{if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify(event)+"\n"));};try{await runAudit(input,admin,emit,signal);}catch(error){if(!signal.aborted)emit({type:"error",message:(error as Error).message});}finally{input.password="";if(!cancelled)controller.close();}},cancel(){cancelled=true;}});
  return new Response(stream,{headers:{"Content-Type":"application/x-ndjson","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
