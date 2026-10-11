import type { Plugin } from "vite";
import { auditStream, auditContext } from "../app/lib/store-audit.server";
export function auditLocalAPI():Plugin{return {name:"store-audit-local-api",configureServer(server){server.middlewares.use("/__store-audit",async(req,res)=>{
  const send=(status:number,body:unknown)=>{res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
  if(!/^(127\.0\.0\.1|localhost):4173$/.test(req.headers.host||"")||req.headers["x-audit-local"]!=="1"||(req.headers.origin&&!['http://127.0.0.1:4173','http://localhost:4173'].includes(req.headers.origin)))return send(403,{error:"Local same-origin request required."});
  if(req.method==="GET")return send(200,await auditContext(""));
  if(req.method!=="POST")return send(405,{error:"Unsupported method."});
  try{let raw="";for await(const chunk of req){raw+=chunk.toString();if(raw.length>4096)return send(413,{error:"Request too large."});}const body=JSON.parse(raw);if(typeof body.shop!=="string"||typeof body.themeId!=="string"||typeof body.handle!=="string"||(body.password!==undefined&&typeof body.password!=="string"))return send(400,{error:"Invalid audit request."});
    const abort=new AbortController();res.on("close",()=>abort.abort());const response=auditStream(body,undefined,abort.signal);res.setHeader("Content-Type","application/x-ndjson");res.setHeader("Cache-Control","no-store");const reader=response.body!.getReader();while(true){const {done,value}=await reader.read();if(done)break;res.write(Buffer.from(value));}res.end();
  }catch{send(400,{error:"Audit request could not be processed."});}
});}};}
