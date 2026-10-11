import {build} from "esbuild";
import assert from "node:assert/strict";
import {mkdir,unlink} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
import {PrismaClient} from "@prisma/client";
await mkdir("work",{recursive:true});
const artifact=resolve("work/resource-tests.mjs");
await build({entryPoints:["app/lib/resources.server.ts"],bundle:true,platform:"node",format:"esm",outfile:artifact,packages:"external"});
const {resourceWorkspace,resourceCommand}=await import(pathToFileURL(artifact));
const prisma=new PrismaClient();const shop="disposable-resource-test-"+Date.now();
try{
 const idea=await resourceCommand(shop,"create",{kind:"idea",title:"Fixture request",description:"A fixture for persistence and isolation."});
 assert.equal((await resourceWorkspace(shop)).entries[0].id,idea.id);
 assert.equal((await resourceWorkspace(shop+"-other")).entries.length,0);
 await assert.rejects(()=>resourceCommand(shop+"-other","vote",{id:idea.id}),/unavailable/);
 await resourceCommand(shop,"vote",{id:idea.id});assert.equal((await resourceWorkspace(shop)).entries[0].body.votes,1);
 await resourceCommand(shop,"vote",{id:idea.id});assert.equal((await resourceWorkspace(shop)).entries[0].body.votes,0);
 await assert.rejects(()=>resourceCommand(shop,"create",{kind:"support",title:"Invalid",description:"Invalid email",email:"bad"}),/valid email/);
 await assert.rejects(()=>resourceCommand(shop,"create",{kind:"showcase",title:"Invalid",description:"No image"}),/screenshot/);
 await assert.rejects(()=>resourceCommand(shop,"create",{kind:"showcase",title:"Invalid",description:"SVG",image:"data:image/svg+xml;base64,PHN2Zz4="}),/PNG/);
 const from="gid://shopify/OnlineStoreTheme/1",to="gid://shopify/OnlineStoreTheme/2";
 const original={sections:{main:{type:"main-product"},audit:{type:"aip-page",settings:{heading:"Customized heading",color:"#123456"}}},order:["main","audit"]};
 const target={sections:{native:{type:"main-product",settings:{title:"Keep me"}},extra:{type:"aip-page",settings:{heading:"Unrelated target section"}}},order:["native","extra"]};
 const files={"sections/aip-page.liquid":"fixture liquid","assets/aip-pages.css":"fixture css","templates/product.json":JSON.stringify(original)};
 let liveTarget=false,writes=0,conflict=false;
 const admin={async graphql(query,{variables:v={}}={}){
  let data;
  if(query.includes("query AIThemes"))data={themes:{nodes:[{id:from,name:"Source",role:"MAIN"},{id:to,name:"Draft",role:liveTarget?"MAIN":"UNPUBLISHED"}]}};
  else if(query.includes("query AITemplates"))data={theme:{files:{nodes:Object.keys(files).map(filename=>({filename})),pageInfo:{hasNextPage:false,endCursor:""}}}};
  else if(query.includes("query AIFile")){const wanted=v.id===from?files:{"templates/product.json":JSON.stringify(target),...(conflict?{"sections/aip-page.liquid":"different"}:{})};data={theme:{files:{nodes:v.filenames.filter(name=>wanted[name]!==undefined).map(filename=>({filename,body:{content:wanted[filename]}}))}}};}
  else if(query.includes("mutation AIUpsert")){writes++;const template=JSON.parse(v.files.find(f=>f.filename==="templates/product.json").body.value);assert.equal(template.sections.native.settings.title,"Keep me");assert.equal(template.sections.extra.settings.heading,"Unrelated target section");assert.equal(template.sections.audit.settings.heading,"Customized heading");assert.equal(template.sections.audit.settings.color,"#123456");data={themeFilesUpsert:{userErrors:[],job:null}};}
  else throw new Error("Unexpected query");return Response.json({data});
 }};
 const plan=await resourceCommand(shop,"migration-plan",{from,to},admin);assert.equal(plan.pages[0].filename,"templates/product.json");
 await assert.rejects(()=>resourceCommand(shop,"migrate",{from,to,confirm:true,planHash:"stale",pages:["templates/product.json"]},admin),/changed/);
 liveTarget=true;await assert.rejects(()=>resourceCommand(shop,"migration-plan",{from,to},admin),/published/);liveTarget=false;
 conflict=true;await assert.rejects(()=>resourceCommand(shop,"migrate",{from,to,confirm:true,planHash:plan.planHash,pages:["templates/product.json"]},admin),/different version/);conflict=false;
 await assert.rejects(()=>resourceCommand(shop,"migrate",{from,to,confirm:true,planHash:plan.planHash,pages:["templates/unrelated.json"]},admin),/valid page/);
 const outcome=await resourceCommand(shop,"migrate",{from,to,confirm:true,planHash:plan.planHash,pages:["templates/product.json"]},admin);assert.equal(outcome.completed,true);assert.equal(writes,1);
 console.log("Resources: database persistence, tenant isolation, vote toggle, input validation, migration page selection, live-target block, stale-source block, conflict block, settings preservation and unrelated target preservation passed.");
}finally{await prisma.resourceEntry.deleteMany({where:{shop}});await prisma.$disconnect();await unlink(artifact);}
