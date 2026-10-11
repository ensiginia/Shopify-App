import type {ActionFunctionArgs,LoaderFunctionArgs} from "react-router";
import {authenticate} from "../shopify.server";
import {conversionWorkspace,saveConversionDraft,saveConversionTranslation} from "../lib/conversion.server";
export async function loader({request}:LoaderFunctionArgs){const {session}=await authenticate.admin(request);return Response.json(await conversionWorkspace(session.shop),{headers:{"Cache-Control":"no-store"}});}
export async function action({request}:ActionFunctionArgs){const {session}=await authenticate.admin(request);try{const raw=await request.text();if(raw.length>60000)throw new Error("Settings are too large.");const input=JSON.parse(raw);return Response.json(await (input.intent==="translate"?saveConversionTranslation:saveConversionDraft)(session.shop,input));}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
