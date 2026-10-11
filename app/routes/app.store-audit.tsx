import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { auditContext, auditStream } from "../lib/store-audit.server";
export async function loader({request}:LoaderFunctionArgs){
  const {session,admin}=await authenticate.admin(request);
  try{return Response.json(await auditContext(session.shop,admin),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Could not load themes. Grant read_themes access and retry."},{status:403});}
}
export async function action({request}:ActionFunctionArgs){
  const {session,admin}=await authenticate.admin(request);
  if(Number(request.headers.get("content-length")||0)>4096)return Response.json({error:"Request too large."},{status:413});
  const raw=await request.text();if(raw.length>4096)return Response.json({error:"Request too large."},{status:413});
  try{const body=JSON.parse(raw);if(typeof body.themeId!=="string"||typeof body.handle!=="string"||(body.password!==undefined&&typeof body.password!=="string"))throw new Error();return auditStream({shop:session.shop,themeId:body.themeId,handle:body.handle,password:body.password},admin,request.signal);}catch{return Response.json({error:"Invalid audit request."},{status:400});}
}
