import {useEffect,useState,type CSSProperties} from "react";
import type {ConversionBlock} from "../lib/conversion-blocks";
export default function ConversionPreview({block,settings,slide=0,compact=false}:{block:ConversionBlock;settings:Record<string,unknown>;slide?:number;compact?:boolean}){
const [tab,setTab]=useState(0),[notice,setNotice]=useState(""),[hidden,setHidden]=useState(false),[now,setNow]=useState(Date.now());useEffect(()=>{if(block.id!=="countdown")return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[block.id]);useEffect(()=>{setHidden(false);setNotice("");setTab(0);},[block.id]);
const text=(id:string)=>String(settings[id]??"");const items=text("items").split('\n').filter(Boolean);const quotes=text("quotes").split('\n').filter(Boolean);const end=Date.parse(text("ends_at"));const seconds=Math.max(0,Math.floor((end-now)/1000));const copy=async()=>{try{await navigator.clipboard.writeText(text("code"));setNotice(text("copied"));}catch{setNotice("Copy: "+text("code"));}};
const style={background:text("background"),color:text("foreground"),padding:compact?10:Number(settings.padding),borderRadius:Number(settings.radius)||8} as CSSProperties;
if(hidden)return <div className="cb-preview-notice">Notice dismissed. <button onClick={()=>setHidden(false)}>Show again</button></div>;
return <div className={`cb-live-preview cb-live-preview-${block.id} ${compact?"is-compact":""}`} style={style}>
{["tabs"].includes(block.id)&&<><div role="tablist">{[text("tab_1"),text("tab_2")].map((label,i)=><button key={i} role="tab" aria-selected={tab===i} onClick={()=>setTab(i)}>{label}</button>)}</div><p role="tabpanel">{text(tab===0?"content_1":"content_2")}</p>{slide>0&&<small>{text("expert")}</small>}</>}
{["atc","sticky","addons","upsell"].includes(block.id)&&<>{["addons","upsell"].includes(block.id)&&<h4>{text("heading")}</h4>}<p>{["addons","upsell"].includes(block.id)?"Complementary product preview":"Your product preview"}</p><button onClick={()=>setNotice("Added to preview cart. No store cart changed.")}>{text("label")} — $39.00</button></>}
{block.id==="video"&&<><h4>{text("heading")}</h4><div className="cb-video-placeholder">▶ {slide===0?"Product video":"Second video"}</div>{!compact&&<p>Choose uploaded videos in Shopify's theme editor.</p>}</>}
{block.id==="shipping"&&<><h4>{text("heading")}</h4><p>{Number(settings.min_days)}–{Number(settings.max_days)} days from today</p><small>{text("note")}</small></>}
{["benefits","benefits-list","badges"].includes(block.id)&&<ul className={slide===1||text("layout")==="vertical"?"vertical":"horizontal"}>{items.map((item,i)=><li key={i}>{block.id==="benefits-list"?"✓ ":slide===2?"◇ ":""}{item}</li>)}</ul>}
{["social","reviews"].includes(block.id)&&<><h4>{text("heading")}</h4><blockquote>{quotes[(tab+slide)%Math.max(1,quotes.length)]}<cite>{text("attribution")}</cite></blockquote>{quotes.length>1&&<button onClick={()=>setTab(n=>n+1)}>Next testimonial</button>}</>}
{block.id==="payments"&&<><h4>{text("heading")}</h4><div className="cb-payment-preview">VISA · Mastercard · PayPal</div><small>{text("custom")}</small></>}
{block.id==="pulse"&&<p className="cb-pulse-preview">● {slide===0?text("label"):text("unavailable")}</p>}
{block.id==="countdown"&&<><h4>{text("heading")}</h4><p>{seconds?`${Math.floor(seconds/86400)}d ${Math.floor(seconds/3600)%24}h ${Math.floor(seconds/60)%60}m ${seconds%60}s`:text("expired")}</p></>}
{block.id==="rating"&&<p>{Number(settings.rating)/10} / 5 · {Number(settings.count)} {text("label")}</p>}
{block.id==="coupon"&&<><small>{text("heading")}</small><button onClick={()=>void copy()}>{text("code")} ⧉</button></>}
{block.id==="wrapper"&&<div className="cb-wrapper-preview"><h4>{text("heading")}</h4><p>{text("content")}</p></div>}
{block.id==="banner"&&<div className="cb-banner-preview"><p>{text("heading")}</p>{!!settings.dismissible&&<button aria-label="Dismiss preview notice" onClick={()=>setHidden(true)}>×</button>}</div>}
{block.id==="space"&&<div style={{paddingBlock:Number(settings.spacing),width:"100%"}}>{!!settings.divider&&<hr/>}</div>}
{notice&&<small role="status">{notice}</small>}
</div>;
}
