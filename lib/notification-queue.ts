type Delivery = {status:string};
export type NotificationSummary = {status:string;due_at:string;booking_email_deliveries?:Delivery[]};
export function hasDeliveryProblem(job:NotificationSummary){return (job.booking_email_deliveries||[]).some(d=>['deferred','bounced','blocked','complaint','failed','unknown'].includes(d.status));}
export function notificationNeedsAttention(job:NotificationSummary,now=Date.now()){
 if(hasDeliveryProblem(job)||['failed','blocked','unknown','sending'].includes(job.status))return true;
 return job.status==='queued'&&Date.parse(job.due_at)<=now;
}
export function notificationScheduled(job:NotificationSummary,now=Date.now()){return job.status==='queued'&&Date.parse(job.due_at)>now;}
export function reminderIso(value:string,now=Date.now()):string|null{
 const at=Date.parse(value);
 return Number.isFinite(at)&&at>now&&at<=now+30*86400000?new Date(at).toISOString():null;
}
