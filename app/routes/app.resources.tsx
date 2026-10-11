import type { ActionFunctionArgs,LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resourceWorkspace,resourceCommand } from "../lib/resources.server";
export async function loader({request}:LoaderFunctionArgs){const {session,admin}=await authenticate.admin(request);return Response.json(await resourceWorkspace(session.shop,admin),{headers:{"Cache-Control":"no-store"}});}
export async function action({request}:ActionFunctionArgs){const {session,admin}=await authenticate.admin(request);const raw=await request.text();if(raw.length>7100000)return Response.json({error:"Request too large."},{status:413});try{const {intent,payload}=JSON.parse(raw);return Response.json(await resourceCommand(session.shop,intent,payload,admin));}catch(error){return Response.json({error:(error as Error).message},{status:400});}}
