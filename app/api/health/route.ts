// Liveness only. Database and integration readiness are visible to staff.
export function GET(){return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});}
