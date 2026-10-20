import {list,put,get,del} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {invoiceTotals} from '../lib/money.js';

const prefix='demo-invoices/';
const isId = id => /^[0-9a-f-]{36}$/i.test(id);
function validate(d) {
  if (!d || !String(d.number||'').trim() || !String(d.business||'').trim() || !String(d.customer||'').trim())
    return 'Invoice number, business and customer are required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.issue||'') || !/^\d{4}-\d{2}-\d{2}$/.test(d.due||'') || d.due < d.issue)
    return 'Valid issue and due dates are required.';
  if (!Array.isArray(d.items) || d.items.length===0 || d.items.length>100)
    return 'At least one line item is required.';
  for (const line of d.items) {
    if (!String(line.description||'').trim() || line.quantity==='' || line.price==='' ||
        ![line.quantity,line.price].every(v=>Number.isFinite(Number(v)) && Number(v)>=0))
      return 'Each line needs a description, nonnegative quantity and unit price.';
  }
  if (d.discount==='' || d.tax==='' || !Number.isFinite(Number(d.discount)) || !Number.isFinite(Number(d.tax)))
    return 'Discount and tax must be numbers.';
  if (!Array.isArray(d.fields) || d.fields.length>100)
    return 'Invalid custom fields.';
  try { invoiceTotals(d.items,d.discount,d.tax); }
  catch { return 'Discount must not exceed subtotal and tax must be between 0% and 100%.'; }
  return '';
}
async function read(id) {
  if (!isId(id)) return null;
  const blob=await get(prefix+id+'.json',{access:'private'});
  if (!blob) return null;
  return JSON.parse(await new Response(blob.stream).text());
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try {
    const id=String(req.query.id||'');
    if(req.method==='GET' && !id){
      let cursor, entries=[];
      do {
        const page=await list({prefix,limit:100,cursor});
        entries.push(...page.blobs);
        cursor=page.hasMore?page.cursor:undefined;
      } while(cursor && entries.length<1000);
      const invoices=(await Promise.all(entries.map(async x=>{
        try{return await read(x.pathname.slice(prefix.length,-5));}catch{return null;}
      }))).filter(Boolean);
      return res.status(200).json(invoices.map(x=>({
        id:x.id,number:x.number,customer:x.customer,
        total:invoiceTotals(x.items,x.discount,x.tax).total,updatedAt:x.updatedAt
      })).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
    }
    if(req.method==='GET'){
      const invoice=await read(id);
      return invoice?res.status(200).json(invoice):res.status(404).json({error:'Invoice not found'});
    }
    if(req.method==='POST' || req.method==='PUT'){
      const error=validate(req.body);
      if(error)return res.status(422).json({error});
      if(req.method==='PUT' && !(await read(id)))return res.status(404).json({error:'Invoice not found'});
      const record={...req.body,id:req.method==='PUT'?id:randomUUID(),updatedAt:new Date().toISOString()};
      await put(prefix+record.id+'.json',JSON.stringify(record),{
        access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'
      });
      return res.status(req.method==='POST'?201:200).json(record);
    }
    if(req.method==='DELETE'){
      if(!(await read(id)))return res.status(404).json({error:'Invoice not found'});
      await del(prefix+id+'.json');
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:'Method not allowed'});
  }catch(err){
    console.error('invoice route error',err);
    return res.status(500).json({error:'Invoice storage failed. Check Vercel Blob environment settings.'});
  }
}
