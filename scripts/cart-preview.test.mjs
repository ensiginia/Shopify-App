import test from 'node:test';
import assert from 'node:assert/strict';
import {cartPreviewTotals, normalizeQuantity, rewardProgress} from '../app/lib/cart-preview.ts';
const products=[{id:'a',price:60,compare:75},{id:'b',price:85,compare:85}];
test('quantity changes update actual total separately from compare-at prices',()=>{
  assert.deepEqual(cartPreviewTotals(products,{a:1,b:3},[]),{total:315,compare:330,discount:0,subtotal:315,count:4});
});
test('empty cart clears count, discounted totals and compare-at totals',()=>{
  assert.deepEqual(cartPreviewTotals(products,{a:2,b:3},['SAVE10'],true),{total:0,compare:0,discount:0,subtotal:0,count:0});
});
test('sample discount is not stacked and monetary rounding uses cents',()=>{
  assert.equal(cartPreviewTotals([{id:'a',price:0.29,compare:0.29}],{a:3},['save10','WELCOME10']).subtotal,0.78);
});
test('next reward follows sorted thresholds and handles all rewards unlocked',()=>{
  const tiers=[{id:'b',title:'Gift',threshold:200,kind:'gift'},{id:'a',title:'Shipping',threshold:100,kind:'shipping'}];
  const progress=rewardProgress(tiers,145);
  assert.equal(progress.next.id,'b');assert.equal(progress.remaining,55);assert.equal(progress.unlocked.length,1);
  assert.equal(rewardProgress(tiers,250).percent,100);assert.equal(rewardProgress(tiers,250).next,undefined);
});
test('quantity input rejects non-finite values, fractions and out-of-range quantities',()=>{
  assert.equal(normalizeQuantity(NaN),0);assert.equal(normalizeQuantity(-2),0);assert.equal(normalizeQuantity(2.9),2);assert.equal(normalizeQuantity(1000),999);
});
