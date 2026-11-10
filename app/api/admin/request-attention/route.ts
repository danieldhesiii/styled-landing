import {NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff';
import {requestAttention} from '@/lib/request-attention';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(req:Request){
 const auth=await requireStaff(req);if(!auth.ok)return auth.response;
 try {
  const orders=await auth.admin.from('orders').select('id,reference,status,created_at,wedding_date').eq('status','requested').order('created_at').limit(101);
  if(orders.error)throw Error();
  const rows=(orders.data||[]).slice(0,100);
  const workflows=rows.length?await auth.admin.from('booking_workflows').select('order_id,current_quote_id').in('order_id',rows.map(r=>r.id)):{data:[],error:null};
  if(workflows.error)throw Error();
  const ids=(workflows.data||[]).flatMap(w=>w.current_quote_id?[w.current_quote_id]:[]);
  const quotes=ids.length?await auth.admin.from('booking_quotes').select('id,status,expires_at').in('id',ids):{data:[],error:null};
  if(quotes.error)throw Error();
  return NextResponse.json({ok:true,requests:requestAttention(rows,workflows.data||[],quotes.data||[]),truncated:(orders.data||[]).length>100},{headers});
 }catch{return NextResponse.json({error:'Could not check outstanding requests. Try again shortly.'},{status:503,headers});}
}
