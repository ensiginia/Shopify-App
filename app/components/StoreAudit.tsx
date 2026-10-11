import { useEffect, useRef, useState } from "react";
import type { AuditContext, AuditEvent, AuditResult } from "../lib/store-audit";
import { AUDIT_STEPS } from "../lib/store-audit";
import "./store-audit.css";

export default function StoreAudit({onClose,live=false,onBrowse,onPermissions}:{onClose:()=>void;live?:boolean;onBrowse:(query:string)=>void;onPermissions?:()=>Promise<void>}){
  const [context,setContext]=useState<AuditContext|null>(null),[themeId,setThemeId]=useState(""),[handle,setHandle]=useState(""),[shop,setShop]=useState("");
  const [stage,setStage]=useState<"setup"|"password"|"running"|"results"|"error">("setup"),[password,setPassword]=useState(""),[error,setError]=useState(""),[step,setStep]=useState(0),[result,setResult]=useState<AuditResult|null>(null),[loading,setLoading]=useState(true);
  const dialog=useRef<HTMLDialogElement>(null),abort=useRef<AbortController|null>(null),mounted=useRef(true);
  const endpoint=live?"/app/store-audit":"/__store-audit";
  const headers:Record<string,string>={"Content-Type":"application/json",...(!live?{"x-audit-local":"1"}:{})};
  async function load(){setLoading(true);setError("");try{const response=await fetch(endpoint,{headers});const body=await response.json();if(!response.ok)throw new Error(body.error||"Could not load store themes.");if(!mounted.current)return;setContext(body);setThemeId(body.themes.find((t:{role:string})=>t.role==="MAIN")?.id||body.themes[0]?.id||"");setHandle(body.products[0]?.handle||"");setShop(body.shop||"");}catch(e){if(mounted.current)setError((e as Error).message);}finally{if(mounted.current)setLoading(false);}}
  useEffect(()=>{mounted.current=true;dialog.current?.showModal();void load();return()=>{mounted.current=false;abort.current?.abort();};},[]);
  function close(){abort.current?.abort();setPassword("");onClose();}
  async function start(){
    abort.current?.abort();const controller=new AbortController();abort.current=controller;setStage("running");setStep(0);setError("");
    const entered=password;setPassword("");
    try{
      const response=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify({shop,themeId,handle,password:entered}),signal:controller.signal});
      if(!response.ok){const body=await response.json();throw new Error(body.error||"Audit request failed.");}
      const reader=response.body?.getReader();if(!reader)throw new Error("No audit response received.");let pending="",finished=false;const decoder=new TextDecoder();
      const consume=(line:string)=>{if(!line.trim())return;const event=JSON.parse(line) as AuditEvent;if(!mounted.current)return;if(event.type==="progress")setStep(event.step);if(event.type==="password"){finished=true;setStage("password");setError(event.message);}if(event.type==="error"){finished=true;setStage("error");setError(event.message);}if(event.type==="result"){finished=true;setResult(event.result);setStage("results");}};
      while(true){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});const lines=pending.split("\n");pending=lines.pop()||"";lines.forEach(consume);}if(pending)consume(pending);if(!finished)throw new Error("Audit connection ended before a result. Retry the audit.");
    }catch(e){if(controller.signal.aborted||!mounted.current)return;setStage("error");setError((e as Error).message);}
  }
  function exportResult(){if(!result)return;const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download="store-audit.json";link.click();URL.revokeObjectURL(url);}
  return <dialog className="sa-dialog" ref={dialog} onCancel={event=>{event.preventDefault();close();}} aria-labelledby="sa-title">
    <header><h2 id="sa-title">{stage==="setup"?"Run audit":stage==="results"?"Your store audit":stage==="error"?"Audit could not finish":"Auditing your store"}</h2><button className="sa-close" aria-label="Close audit" onClick={close}>×</button></header>
    <div className="sa-body">
      {stage==="setup"&&<form id="sa-setup" onSubmit={e=>{e.preventDefault();void start();}}>
        <p>We will analyze your homepage and a product page, then recommend up to 3 section categories that can improve the shopping experience.</p>
        {!live&&<><label htmlFor="sa-shop">Shopify store domain</label><input id="sa-shop" placeholder="your-store.myshopify.com" value={shop} onChange={e=>setShop(e.target.value.trim().toLowerCase())} required pattern="[a-z0-9][a-z0-9-]*\.myshopify\.com"/><p className="sa-muted">Local preview uses real storefront pages. Enter a store you own or manage. Draft themes require the embedded Shopify app.</p></>}
        <label htmlFor="sa-theme">Theme</label><select id="sa-theme" value={themeId} onChange={e=>setThemeId(e.target.value)} disabled={loading||!context?.themes.length}>{context?.themes.map(theme=><option key={theme.id} value={theme.id}>{theme.role==="MAIN"?"🟢 ":""}{theme.name}{theme.role==="MAIN"?" — Live":" — Draft"}</option>)}</select>
        <label htmlFor="sa-product">Product page</label>{live?<select id="sa-product" value={handle} onChange={e=>setHandle(e.target.value)} required><option value="">Select a published product</option>{context?.products.map(product=><option key={product.handle} value={product.handle}>{product.title}</option>)}</select>:<input id="sa-product" placeholder="product-handle" value={handle} onChange={e=>setHandle(e.target.value)} required pattern="[a-zA-Z0-9][a-zA-Z0-9_-]*"/>}
        {live&&context&&!context.products.length&&<p className="sa-error">Publish a product to the Online Store before starting an audit.</p>}
        <h3>Pages analyzed</h3><p className="sa-muted">Homepage and selected product page.</p>
        {loading&&<p role="status">Loading themes and products…</p>}
        {error&&<div role="alert" className="sa-error"><p>{error}</p><button type="button" onClick={()=>void load()}>Retry connection</button>{onPermissions&&<button type="button" onClick={()=>void onPermissions().then(load).catch(e=>setError(e.message))}>Connect theme permissions</button>}</div>}
      </form>}
      {stage==="password"&&<form id="sa-password-form" onSubmit={e=>{e.preventDefault();void start();}}><h3>Your storefront is password-protected</h3><p>Shopify requires the storefront password to load your pages.</p><label htmlFor="sa-password">Storefront password</label><input id="sa-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="off" required autoFocus/><p className="sa-muted">Used only during this request. Never saved in audit results or browser storage.</p>{error!=="Your storefront is password-protected."&&<p role="alert" className="sa-error">{error}</p>}</form>}
      {stage==="running"&&<div role="status" aria-live="polite"><p className="sa-muted">Reading</p><strong className="sa-domain">{shop}</strong><p className="sa-muted">Homepage · Selected product page</p><ol className="sa-progress">{AUDIT_STEPS.map((label,index)=><li key={label} data-state={index<step?"done":index===step?"active":"pending"}><span>{index<step?"✓":""}</span>{label}</li>)}</ol><p className="sa-muted">Progress reflects server work. You can cancel at any time.</p></div>}
      {stage==="error"&&<div role="alert"><h3>We could not analyze these pages</h3><p className="sa-error">{error}</p><p className="sa-muted">No theme changes were made. Check your store domain, product publication and permissions, then try again.</p></div>}
      {stage==="results"&&result&&<><p className="sa-muted">{result.shop} · {result.theme} · {new Date(result.createdAt).toLocaleString()}</p><div className="sa-page-links">{result.pages.map((url,index)=><a href={url} target="_blank" rel="noreferrer" key={url}>{index===0?"View homepage":"View product page"} ↗</a>)}</div>{result.findings.length?<div className="sa-findings">{result.findings.map((finding,index)=><article key={finding.category}><span className="sa-rank">0{index+1}</span><div><h3>{finding.title}</h3><p>{finding.reason}</p><p className="sa-evidence">{finding.evidence}</p><span className="sa-priority">{index===0?"Highest priority":"Recommended"}</span><button onClick={()=>onBrowse(finding.search)}>Explore {finding.category} sections →</button></div></article>)}</div>:<div className="sa-clear"><h3>No major gaps found by these checks</h3><p>All {result.checks} signals were detected. Review your page visually before making changes.</p></div>}<p className="sa-muted sa-coverage">{result.coverage}</p></>}
    </div>
    <footer>{stage==="setup"?<><button onClick={close}>Cancel</button><button className="sa-primary" type="submit" form="sa-setup" disabled={loading||!context||!themeId||!handle||!shop}>Start audit</button></>:stage==="password"?<><button onClick={()=>{setPassword("");setError("");setStage("setup");}}>Back</button><button className="sa-primary" type="submit" form="sa-password-form" disabled={!password.trim()}>Continue</button></>:stage==="running"?<button onClick={close}>Cancel</button>:stage==="error"?<><button onClick={()=>setStage("setup")}>Back</button><button className="sa-primary" onClick={()=>void start()}>Retry audit</button></>:<><button onClick={exportResult}>Download report</button><button className="sa-primary" onClick={()=>{setResult(null);setStage("setup");}}>Run again</button></>}</footer>
  </dialog>;
}
