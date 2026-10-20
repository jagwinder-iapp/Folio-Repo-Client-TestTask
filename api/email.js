import nodemailer from 'nodemailer';
import {invoiceTotals} from '../lib/money.js';

const escape=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const {invoice,recipient}=req.body||{};
  const allowed=(process.env.DEMO_EMAIL_RECIPIENT||'').trim().toLowerCase();
  if(!process.env.SMTP_USER || !process.env.SMTP_PASS || !allowed)
    return res.status(503).json({error:'Gmail SMTP credentials are not configured.'});
  if(String(recipient||'').trim().toLowerCase()!==allowed)
    return res.status(403).json({error:'Email restricted to the configured demo inbox.'});
  if(!invoice || !invoice.number || !invoice.customer || !invoice.business ||
     !Array.isArray(invoice.items) || !invoice.items.length ||
     invoice.items.some(i=>!String(i.description||'').trim()||![i.quantity,i.price].every(n=>Number.isFinite(Number(n)) && Number(n)>=0)))
    return res.status(422).json({error:'Invoice is incomplete.'});
  let totals;
  try {totals=invoiceTotals(invoice.items,invoice.discount,invoice.tax);}
  catch {return res.status(422).json({error:'Invalid discount or tax.'});}

  const rows=invoice.items.map(i=>'<tr><td style="padding:12px 8px;border-bottom:1px solid #e6ece5">'+escape(i.description)+'</td><td style="text-align:center;border-bottom:1px solid #e6ece5">'+escape(i.quantity)+'</td><td style="text-align:right;border-bottom:1px solid #e6ece5">'+usd(i.price)+'</td><td style="text-align:right;border-bottom:1px solid #e6ece5">'+usd(Math.round((Number(i.quantity)*Number(i.price)+Number.EPSILON)*100)/100)+'</td></tr>').join('');
  const extras=(invoice.fields||[]).filter(f=>f.visible&&f.label).map(f=>'<p style="font-size:12px;color:#64766a">'+escape(f.label)+': <strong>'+escape(f.value)+'</strong></p>').join('');
  const html='<html><body style="margin:0;padding:28px 12px;background:#f4f6f2;font-family:Arial,sans-serif;color:#284034"><div style="max-width:650px;margin:auto;background:#fff;border:1px solid #e0e8e1"><div style="background:#264d3c;color:white;padding:28px 36px"><span style="font:29px Georgia,serif">folio.</span><div style="font-size:10px;letter-spacing:2px;margin-top:7px">INVOICE STUDIO</div></div><div style="padding:35px"><p style="color:#3b8460;font-size:11px;letter-spacing:1.5px">INVOICE DETAILS</p><h1 style="font:normal 31px Georgia,serif">Invoice '+escape(invoice.number)+'</h1><p style="line-height:1.7;color:#586f61">Hello '+escape(invoice.customer)+',<br>Thank you for working with '+escape(invoice.business)+'. Your invoice is below.</p><div style="background:#eef5ee;padding:23px 25px;margin:24px 0"><div style="font-size:11px">TOTAL AMOUNT DUE</div><div style="font:36px Georgia,serif;margin:8px 0">'+usd(totals.total)+'</div><div>Due '+escape(invoice.due)+'</div></div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><th style="text-align:left">DESCRIPTION</th><th>QTY</th><th>RATE</th><th>AMOUNT</th></tr>'+rows+'</table><table style="margin:24px 0 24px auto;width:230px;font-size:13px"><tr><td>Subtotal</td><td style="text-align:right">'+usd(totals.subtotal)+'</td></tr><tr><td>Discount</td><td style="text-align:right">-'+usd(totals.discount)+'</td></tr><tr><td>Tax ('+escape(invoice.tax)+'%)</td><td style="text-align:right">'+usd(totals.tax)+'</td></tr><tr style="font-weight:bold"><td>Total</td><td style="text-align:right">'+usd(totals.total)+'</td></tr></table><div style="border-top:1px solid #e6ece5;padding-top:18px">'+extras+'<p style="white-space:pre-wrap;line-height:1.6">'+escape(invoice.notes||'Thank you for your business.')+'</p></div></div><div style="background:#f8faf7;padding:18px 36px;font-size:12px;color:#78877c">Sent by '+escape(invoice.business)+' · Folio Invoice Studio Demo</div></div></body></html>';
  const text='Invoice '+invoice.number+' from '+invoice.business+'\nTo: '+invoice.customer+'\nDue: '+invoice.due+'\nAmount due: '+usd(totals.total)+'\n\n'+invoice.items.map(i=>i.description+' | '+i.quantity+' × '+usd(i.price)).join('\n')+'\n\n'+(invoice.notes||'Thank you for your business.');
  try {
    const port=Number(process.env.SMTP_PORT||465);
    const transport=nodemailer.createTransport({
      host:process.env.SMTP_HOST||'smtp.gmail.com',port,secure:port===465,
      auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},
      connectionTimeout:12000,greetingTimeout:10000,socketTimeout:15000
    });
    const result=await transport.sendMail({
      from:{name:'Folio Invoice Studio',address:process.env.SMTP_USER},
      to:allowed,subject:'Invoice '+invoice.number+' from '+invoice.business,html,text
    });
    return res.status(200).json({ok:true,id:result.messageId,message:'SMTP accepted the message; final delivery is unconfirmed.'});
  } catch(err) {
    console.error('smtp error',err.code||'unknown');
    return res.status(502).json({error:'Gmail SMTP failed: '+(err.code||err.responseCode||'unknown error')});
  }
}
