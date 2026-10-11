import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { aiService } from "../lib/ai-service.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  await db.abExperiment.updateMany({where: {shop, OR: [{status: {not: "Ended"}}, {rolloutVariant: {not: null}}]}, data: {status: "Ended", endedAt: new Date(), activeTargetKey: null, rolloutVariant: null, rolloutUntil: null, operationAt: null, version: {increment: 1}}});

  const aiJobs = await db.aiGeneration.findMany({where:{shop,status:"running"}});
  for(const job of aiJobs)await aiService.settle(job.id,false);
  await db.aiPage.updateMany({where:{shop,status:"generating"},data:{status:"failed",error:"App uninstalled; generation canceled.",operationAt:null}});

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
