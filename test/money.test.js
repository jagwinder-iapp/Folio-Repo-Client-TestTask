import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceTotals, roundUSD} from '../lib/money.js';

test('exercise acceptance example: $99', () => {
  assert.equal(invoiceTotals([{quantity:2,price:50}],10,10).total,99);
});
test('each line is rounded before subtotal', () => {
  assert.equal(invoiceTotals([{quantity:1,price:.105},{quantity:1,price:.105}]).subtotal,.22);
});
test('tax applied after fixed discount', () => {
  assert.deepEqual(invoiceTotals([{quantity:2,price:50}],10,10),{subtotal:100,discount:10,tax:9,total:99});
});
test('discount cannot exceed subtotal', () => {
  assert.throws(()=>invoiceTotals([{quantity:1,price:5}],6,0));
});
test('no negative discounts',()=>assert.throws(()=>invoiceTotals([{quantity:1,price:5}],-1,0)));
test('no negative tax rates',()=>assert.throws(()=>invoiceTotals([{quantity:1,price:5}],0,-1)));
test('custom fields do not affect money',()=>{
  const invoice={items:[{quantity:1,price:100}],fields:[{label:'PO',value:'ABCD',visible:true}]};
  assert.equal(invoiceTotals(invoice.items,0,10).total,110);
});
