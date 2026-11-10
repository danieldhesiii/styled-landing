// Bound bodies before parsing so malformed/oversized requests cannot turn a
// recoverable form mistake into a page error or unbounded memory allocation.
export class JsonBodyError extends Error {
 constructor(message:string,readonly status:number){super(message);}
}
export async function readJsonObject(req:Request,maxBytes=65536):Promise<Record<string,unknown>> {
 if(Number(req.headers.get('content-length'))>maxBytes)throw new JsonBodyError('This request is too large. Please shorten it and try again.',413);
 const reader=req.body?.getReader();
 if(!reader)throw new JsonBodyError('Enter the request details.',400);
 let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new JsonBodyError('This request is too large. Please shorten it and try again.',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}
 catch{throw new JsonBodyError('Enter valid request details and try again.',400);}
}
