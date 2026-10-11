import { build } from "esbuild";
import assert from "node:assert/strict";
const built=await build({entryPoints:["app/lib/store-audit.server.ts"],bundle:true,platform:"node",format:"esm",write:false});
const {runAudit}=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const input=()=>({shop:"fixture.myshopify.com",themeId:"live",handle:"sample"});
const signal=()=>new AbortController().signal;
async function run(fetcher,body=input()){const events=[];await runAudit(body,undefined,e=>events.push(e),signal(),fetcher);return events;}
let calls=0;
await assert.rejects(()=>run(async()=>{calls++;return new Response("");},{...input(),shop:"127.0.0.1"}),/valid myshopify/);assert.equal(calls,0);
const gate=await run(async()=>new Response('<form action="/password"></form>'));assert.equal(gate.at(-1).type,"password");assert.ok(!JSON.stringify(gate).includes("secret"));
let unlocked=false;
const success=await run(async(url,options)=>{if(new URL(url).pathname==="/password"){assert.equal(new URLSearchParams(options.body).get("password"),"fixture-secret");unlocked=true;return new Response("ok",{headers:{"Set-Cookie":"storefront_digest=fixture; Path=/; Secure"}});}if(!unlocked)return new Response('<form action="/password"></form>');assert.match(options.headers.Cookie,/storefront_digest=fixture/);return new Response('<h1>Product</h1><p>Useful item.</p>');},{...input(),password:"fixture-secret"});
assert.equal(success.at(-1).type,"result");assert.equal(success.at(-1).result.findings.length,3);assert.ok(!JSON.stringify(success).includes("fixture-secret"));
const wrong=await run(async()=>new Response('<form action="/password"></form>'),{...input(),password:"wrong"});assert.equal(wrong.at(-1).type,"password");assert.match(wrong.at(-1).message,/not accepted/);
await assert.rejects(()=>run(async()=>new Response("",{status:302,headers:{Location:"http://127.0.0.1/private"}})),/custom domain/);
await assert.rejects(()=>run(async()=>new Response("missing",{status:404})),/404/);
const complete=await run(async()=>new Response('<h1>Store</h1><p>Customer reviews. FAQ. Benefits. Shipping. '+"Details ".repeat(150)+"</p>"));assert.equal(complete.at(-1).result.findings.length,0);
const controller=new AbortController();controller.abort();await assert.rejects(()=>runAudit(input(),undefined,()=>{},controller.signal,async()=>{controller.signal.throwIfAborted();return new Response("");}));
console.log("Store audit: input isolation, password gate, wrong password, cookie unlock, real results, no-gap state, redirect isolation, HTTP errors and cancellation passed.");
