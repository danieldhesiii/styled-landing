// Read one public row from development. Never connect a restore client to a hosted DB.
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createClient} from '@supabase/supabase-js';
import {encryptBackup,decryptBackup} from './backup-codec.mjs';
const url='https://qkyeitvwscrxbiwamxan.supabase.co',site='https://styledukprodprogress.vercel.app';
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==url)throw Error('Use the development public environment only.');
const id='demo-crescent-moon-empire-90',client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const {data,error}=await client.from('products').select('id,supplier_id,name,image,unit,unit_price_pence,category,details,note,capacity').eq('id',id).single();
if(error||!data||data.id!==id||data.image!=='/img/items/crescent-moon-demo/empire-90.webp')throw Error('Expected development listing or catalogue photo unavailable.');
const response=await fetch(site+data.image,{redirect:'error'});
if(!response.ok)throw Error('Development media not available');
const photo=Buffer.from(await response.arrayBuffer());assert.equal(photo.toString('ascii',8,12),'WEBP');
const hash=b=>createHash('sha256').update(b).digest('hex'),key=randomBytes(32),manifest={record:data,sha256:hash(photo)};
const root=await mkdtemp(join(tmpdir(),'styled-isolated-listing-'));let local;
try{
 await writeFile(join(root,'record.enc'),encryptBackup(Buffer.from(JSON.stringify(manifest)),key),{mode:0o600});
 await writeFile(join(root,'photo.enc'),encryptBackup(photo,key),{mode:0o600});
 const copy=JSON.parse(decryptBackup(await readFile(join(root,'record.enc')),key).toString());
 const bytes=decryptBackup(await readFile(join(root,'photo.enc')),key);
 assert.equal(hash(bytes),copy.sha256);
 local=new PGlite(join(root,'restore'));await local.exec('create table restored_listings(id text primary key, record jsonb not null, photo bytea not null)');
 await local.query('insert into restored_listings values ($1,$2,$3)',[copy.record.id,JSON.stringify(copy.record),bytes]);
 await local.close();local=new PGlite(join(root,'restore'));
 const result=(await local.query('select record,photo from restored_listings where id=$1',[id])).rows;
 assert.equal(result.length,1);assert.deepEqual(result[0].record,data);assert.equal(hash(result[0].photo),hash(photo));
 console.log('PASS: hosted dev listing '+id+', '+bytes.length+' image bytes, SHA256 '+copy.sha256+'; reopened isolated PostgreSQL copy matches. No hosted writes.');
}finally{try{await local?.close()}finally{await rm(root,{recursive:true,force:true})}}
