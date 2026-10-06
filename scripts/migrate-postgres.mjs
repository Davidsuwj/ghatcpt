import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pgClient} from './pg-config.mjs';
const client=pgClient();
try{
 await client.connect();await client.query("SELECT pg_advisory_lock(hashtext('ghatcpt-migrations'))");
 await client.query('CREATE SCHEMA IF NOT EXISTS ghatcpt_meta');
 await client.query('CREATE TABLE IF NOT EXISTS ghatcpt_meta.migrations (name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await fs.readdir('postgres/migrations')).filter(name=>name.endsWith('.sql')).sort()){
  const sql=await fs.readFile('postgres/migrations/'+name,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
  const old=(await client.query('SELECT sha256 FROM ghatcpt_meta.migrations WHERE name=$1',[name])).rows[0];
  if(old){if(old.sha256!==hash)throw Error('Applied migration was modified: '+name);console.log('Already applied: '+name);continue;}
  await client.query('BEGIN');
  try{await client.query(sql);await client.query('INSERT INTO ghatcpt_meta.migrations(name,sha256) VALUES ($1,$2)',[name,hash]);await client.query('COMMIT');console.log('Applied: '+name);}
  catch(error){await client.query('ROLLBACK');throw error;}
 }
}catch(error){console.error('Migration failed',{code:error.code||'unknown',message:error.message});process.exitCode=1;}
finally{await client.end().catch(()=>{});}
