import type { Plugin } from "vite";
import { resourceWorkspace,resourceCommand } from "../app/lib/resources.server";
export function resourcesLocalAPI():Plugin{return {name:"resources-local-api",configureServer(server){server.middlewares.use("/__resources",async(req,res)=>{
  const send=(status:number,body:unknown)=>{res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
  if(!/^(127\.0\.0\.1|localhost):4173$/.test(req.headers.host||"")||req.headers["x-resources-local"]!=="1"||(req.headers.origin&&!['http://127.0.0.1:4173','http://localhost:4173'].includes(req.headers.origin)))return send(403,{error:"Local same-origin request required."});
  try{if(req.method==="GET")return send(200,await resourceWorkspace("local.preview"));if(req.method!=="POST")return send(405,{error:"Unsupported method."});let raw="";for await(const chunk of req){raw+=chunk.toString();if(raw.length>7100000)return send(413,{error:"Request too large."});}const body=JSON.parse(raw);return send(200,await resourceCommand("local.preview",body.intent,body.payload));}catch(error){send(400,{error:(error as Error).message});}
});}};}
