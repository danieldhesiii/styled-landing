import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
const privateHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const valid=(token:unknown,type:unknown):token is string=>typeof token==='string'&&token.length>0&&token.length<500&&/^[a-zA-Z0-9_-]+$/.test(token)&&(type==='invite'||type==='magiclink');
export async function GET(req:Request){
 const url=new URL(req.url),token=url.searchParams.get('token_hash'),type=url.searchParams.get('type');
 if(!valid(token,type))return NextResponse.redirect(new URL('/auth/recovery?next=%2Fportal&error=link',url.origin),303);
 // Email scanners may open GET links. Consume the one-time token only after the recipient chooses Continue.
 return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Your supplier invitation · Styled</title><style>body{margin:0;background:#faf6f0;color:#2b2622;font:16px/1.6 Arial,sans-serif}main{max-width:420px;margin:10vh auto;padding:28px}h1{font:32px Georgia,serif}button{min-height:48px;border:0;border-radius:30px;padding:12px 24px;background:#2b2622;color:white;font:inherit}a{color:inherit}</style><main><p>Styled.</p><h1>Your supplier invitation</h1><p>Continue to your private supplier account. New account holders will choose their own password.</p><form method="post" action="/auth/invite"><input type="hidden" name="token_hash" value="${token}"><input type="hidden" name="type" value="${type}"><button type="submit">Continue to supplier account</button></form><p>If this invitation was unexpected, contact <a href="mailto:support@styleduk.com">support@styleduk.com</a>.</p><p><a href="/terms">Service terms</a> · <a href="/privacy">Privacy</a></p></main></html>`,{headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
export async function POST(req:Request){
 const url=new URL(req.url);
 if(req.headers.get('origin')!==url.origin)return new Response(null,{status:403,headers:privateHeaders});
 let text='';try{const reader=req.body?.getReader();if(!reader)return new Response(null,{status:400});while(true){const {done,value}=await reader.read();if(done)break;text+=new TextDecoder().decode(value);if(text.length>2000){await reader.cancel();return new Response(null,{status:413});}}}catch{return new Response(null,{status:400});}
 const form=new URLSearchParams(text),token=form.get('token_hash'),type=form.get('type');
 let destination='/auth/recovery?next=%2Fportal&error=link';
 if(valid(token,type)&&(type==='invite'||type==='magiclink')){
  try{const client=await createClient(),r=await client.auth.verifyOtp({token_hash:token,type});
   if(!r.error&&r.data.user&&!r.data.user.is_anonymous)destination=type==='invite'?'/auth/reset?next=%2Fportal':'/portal';
  }catch{/* Keep expired or invalid invitation details out of logs. */}
 }
 const response=NextResponse.redirect(new URL(destination,url.origin),303);Object.entries(privateHeaders).forEach(([k,v])=>response.headers.set(k,v));return response;
}
