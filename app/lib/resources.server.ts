import prisma from "../db.server";
import { createHash } from "node:crypto";
import type { AdminClient } from "./ab-shopify.server";
import { graphql } from "./ab-shopify.server";
import { AI_THEMES, AI_FILE, AI_TEMPLATES, upsertFiles } from "./ai-shopify.server";
import { mergeAppSections, parseThemeTemplate } from "./theme-migration";
import type { AuditTheme } from "./store-audit";

export async function resourceWorkspace(shop:string,admin?:AdminClient){
  const entries=await prisma.resourceEntry.findMany({where:{shop},orderBy:{createdAt:"desc"},take:100});
  let themes:AuditTheme[]=[],themeError="";
  if(admin){try{themes=(await graphql<{themes:{nodes:AuditTheme[]}}>(admin,AI_THEMES)).themes.nodes;}catch{themeError="Theme access is unavailable. Grant read_themes and retry.";}}
  return {shop,entries:entries.map(entry=>({...entry,body:JSON.parse(entry.body)})),themes,themeError,live:!!admin,supportEmail:process.env.SUPPORT_EMAIL||"",referralUrl:process.env.AFFILIATE_SIGNUP_URL||"",referralCode:createHash("sha256").update(shop).digest("hex").slice(0,16)};
}
function text(value:unknown,label:string,max=5000){if(typeof value!=="string"||!value.trim()||value.length>max)throw new Error(label+" is required and must be shorter than "+max+" characters.");return value.trim();}
export async function resourceCommand(shop:string,intent:string,payload:Record<string,unknown>,admin?:AdminClient){
  if(intent==="create"){
    const kind=text(payload.kind,"Type",20);if(!["support","idea","showcase","referral"].includes(kind))throw new Error("Unknown request type.");
    const title=text(payload.title,"Title",160);const description=text(payload.description,"Description");
    const email=payload.email?text(payload.email,"Email",254):"";if((kind==="support"||kind==="referral")&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Enter a valid email address.");
    const body:Record<string,unknown>={description,email,section:typeof payload.section==="string"?payload.section.slice(0,100):"",theme:typeof payload.theme==="string"?payload.theme.slice(0,100):"",category:typeof payload.category==="string"?payload.category.slice(0,60):"",votes:0,voted:false};
    if(payload.image){const image=text(payload.image,"Image",7000000);if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image))throw new Error("Upload a PNG, JPEG or WebP image up to 5 MB.");if(Buffer.from(image.split(",")[1],"base64").length>5000000)throw new Error("Image must be smaller than 5 MB.");body.image=image;}
    if(kind==="showcase"&&!body.image)throw new Error("Add a screenshot of your section.");
    const count=await prisma.resourceEntry.count({where:{shop,kind:{in:["support","idea","showcase","referral"]},createdAt:{gte:new Date(Date.now()-3600000)}}});if(count>=30)throw new Error("Too many submissions. Try again later.");
    const entry=await prisma.resourceEntry.create({data:{shop,kind,title,body:JSON.stringify(body)}});return {id:entry.id,status:entry.status};
  }
  if(intent==="vote"){
    const id=text(payload.id,"Idea",100);const entry=await prisma.resourceEntry.findFirst({where:{id,shop,kind:"idea"}});if(!entry)throw new Error("Idea is unavailable.");const body=JSON.parse(entry.body);body.voted=!body.voted;body.votes=body.voted?1:0;const changed=await prisma.resourceEntry.updateMany({where:{id,shop,version:entry.version},data:{body:JSON.stringify(body),version:{increment:1}}});if(!changed.count)throw new Error("Idea changed. Refresh and try again.");return {id};
  }
  if(intent==="migration-plan"||intent==="migrate"){
    if(!admin)throw new Error("Connect the embedded Shopify app to migrate between themes.");
    const from=text(payload.from,"Source theme",100),to=text(payload.to,"Target theme",100);if(from===to)throw new Error("Select two different themes.");
    const themes=(await graphql<{themes:{nodes:AuditTheme[]}}>(admin,AI_THEMES)).themes.nodes;const source=themes.find(t=>t.id===from),target=themes.find(t=>t.id===to);if(!source||!target)throw new Error("Theme is unavailable.");if(target.role==="MAIN")throw new Error("Migration to the published theme is disabled. Duplicate it first.");
    let after:string|null=null;const names:string[]=[];
    for(let page=0;page<20;page++){const data:{theme:{files:{nodes:{filename:string}[];pageInfo:{hasNextPage:boolean;endCursor:string}}}|null}=await graphql(admin,AI_TEMPLATES,{id:from,after});if(!data.theme)throw new Error("Source theme is unavailable.");names.push(...data.theme.files.nodes.map(f=>f.filename).filter(name=>/^(sections|assets|snippets)\/aip-[a-z0-9._-]+$/.test(name)||/^templates\/[a-zA-Z0-9_./-]+\.json$/.test(name)));if(!data.theme.files.pageInfo.hasNextPage)break;after=data.theme.files.pageInfo.endCursor;if(page===19)throw new Error("Source theme has too many files to scan.");}
    const files:{filename:string;body:{content?:string}}[]=[];
    for(let offset=0;offset<names.length;offset+=50){const data=await graphql<{theme:{files:{nodes:{filename:string;body:{content?:string}}[]}}}>(admin,AI_FILE,{id:from,filenames:names.slice(offset,offset+50)});files.push(...data.theme.files.nodes);}
    files.sort((a,b)=>a.filename.localeCompare(b.filename));
    const dependencies=files.filter(f=>/^(sections|assets|snippets)\/aip-/.test(f.filename));
    const templates=files.filter(f=>f.filename.startsWith("templates/")&&f.body.content).filter(f=>{try{const template=parseThemeTemplate(f.body.content!);return Object.values(template.sections).some(section=>/^aip-/.test(section.type));}catch{return false;}});
    const hash=createHash("sha256").update(JSON.stringify(files)).digest("hex");
    const pages=templates.map(file=>({filename:file.filename,label:file.filename.replace("templates/","").replace(".json","").replace(/[-_.]/g," "),sections:Object.values(parseThemeTemplate(file.body.content!).sections).filter(section=>/^aip-/.test(section.type)).length}));
    if(intent==="migration-plan")return {source:source.name,target:target.name,files:dependencies.map(f=>f.filename),pages,planHash:hash,unchanged:0};
    if(payload.confirm!==true||payload.planHash!==hash)throw new Error("Source files changed or the plan was not reviewed. Open the migration again.");
    if(!Array.isArray(payload.pages)||!payload.pages.length||payload.pages.some(name=>typeof name!=="string"||!templates.some(f=>f.filename===name)))throw new Error("Select at least one valid page to migrate.");
    const selected=templates.filter(f=>(payload.pages as string[]).includes(f.filename));
    const wanted=[...dependencies,...selected];if(wanted.length>50)throw new Error("Select fewer pages. A migration supports up to 50 files.");
    const targetFiles=await graphql<{theme:{files:{nodes:{filename:string;body:{content?:string}}[]}}}>(admin,AI_FILE,{id:to,filenames:wanted.map(f=>f.filename)});
    const existing=new Map(targetFiles.theme.files.nodes.map(f=>[f.filename,f.body.content]));
    const output:Record<string,string>={};
    for(const file of dependencies){if(file.body.content===undefined)throw new Error("A dependency could not be read.");if(existing.has(file.filename)&&existing.get(file.filename)!==file.body.content)throw new Error("A different version of "+file.filename+" exists on the target. Use a clean draft theme.");if(!existing.has(file.filename))output[file.filename]=file.body.content;}
    for(const file of selected){const targetContent=existing.get(file.filename);if(!targetContent&&!/\.aip-/.test(file.filename))throw new Error("The target theme is missing "+file.filename+". Create a compatible template first.");output[file.filename]=mergeAppSections(file.body.content!,targetContent||null);}
    const fresh=(await graphql<{themes:{nodes:AuditTheme[]}}>(admin,AI_THEMES)).themes.nodes.find(t=>t.id===to);if(!fresh||fresh.role==="MAIN")throw new Error("Target theme was published or removed. Migration stopped.");
    await upsertFiles(admin,to,output);
    return {completed:true,files:Object.keys(output),pages:payload.pages};
  }
  throw new Error("Unknown resource action.");
}
