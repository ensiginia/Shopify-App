import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
const path='work/conversion-test.mjs';await fs.mkdir('work',{recursive:true});await build({entryPoints:['app/lib/conversion.server.ts'],outfile:path,bundle:true,format:'esm',platform:'node',packages:'external'});const server=await import('../'+path+'?t='+Date.now());
const compiled=await build({entryPoints:['app/lib/conversion-blocks.ts'],bundle:true,write:false,format:'esm',platform:'node'});const {conversionBlocks,defaultBlockSettings,blockEditorUrl}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const db=new PrismaClient(),shop='conversion-test-'+Date.now()+'.myshopify.com',other='other-'+shop;
try{
assert.equal(conversionBlocks.length,20);assert.equal(new Set(conversionBlocks.map(b=>b.id)).size,20);
for(const block of conversionBlocks){const settings=defaultBlockSettings(block);const data=await server.saveConversionDraft(shop,{id:block.id,settings,version:0});assert.deepEqual(data.drafts[block.id].settings,settings);const file=await fs.readFile('extensions/ab-storefront/blocks/cb-'+block.id+'.liquid','utf8');const schema=JSON.parse(file.match(/{% schema %}\s*([\s\S]*?)\s*{% endschema %}/)[1]);assert.equal(schema.target,'section');assert(schema.settings.some(f=>f.id==='proxy_path'));}
assert.deepEqual((await server.conversionWorkspace(other)).drafts,{});
const coupon=conversionBlocks.find(b=>b.id==='coupon');await assert.rejects(server.saveConversionDraft(shop,{id:'coupon',settings:defaultBlockSettings(coupon),version:0}),/changed/);
await assert.rejects(server.saveConversionDraft(other,{id:'unknown',settings:{},version:0}),/Unknown/);
await assert.rejects(server.saveConversionDraft(other,{id:'coupon',settings:{...defaultBlockSettings(coupon),padding:Infinity},version:0}),/Invalid/);
const shipping=conversionBlocks.find(b=>b.id==='shipping');await assert.rejects(server.saveConversionDraft(other,{id:'shipping',settings:{...defaultBlockSettings(shipping),min_days:10,max_days:2},version:0}),/delivery/);
let translation=await server.saveConversionTranslation(shop,{language:'ur',content:{coupon:{heading:'رعایتی کوڈ',copied:'کاپی ہو گیا'}},version:0});assert.equal(translation.translations.ur.version,1);assert.equal((await server.conversionWorkspace(other)).translations.ur,undefined);
await assert.rejects(server.saveConversionTranslation(shop,{language:'ur',content:{coupon:{code:'INJECT'}},version:1}),/field/);
await assert.rejects(server.saveConversionTranslation(shop,{language:'ur',content:{coupon:{heading:'Stale'}},version:0}),/changed/);
const url=blockEditorUrl('test-shop.myshopify.com','public-client-id','coupon','123');assert(url.includes('addAppBlockId=public-client-id%2Fcb-coupon'));assert(url.includes('/themes/123/editor'));assert.equal(blockEditorUrl('bad.invalid','key','coupon'),'');
console.log('Conversion backend: all 20 schemas/defaults, persistent drafts, tenant isolation, stale-save prevention, validation, translations and native editor links passed.');
}finally{await db.resourceEntry.deleteMany({where:{shop:{in:[shop,other]}}});await db.$disconnect();await fs.unlink(path);}
