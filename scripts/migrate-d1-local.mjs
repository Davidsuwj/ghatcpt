import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// Local-only schema application. Sites applies these immutable migrations on publish.
const built=JSON.parse(fs.readFileSync('dist/server/wrangler.json','utf8'));
const configPath=path.resolve('.sites-runtime/d1-local.json');
fs.mkdirSync(path.dirname(configPath),{recursive:true});
fs.writeFileSync(configPath,JSON.stringify({name:built.name,compatibility_date:built.compatibility_date,d1_databases:built.d1_databases.map(d=>({...d,migrations_dir:path.resolve('drizzle')}))}));
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',configPath,'--persist-to',path.resolve('.wrangler/state')],{stdio:'inherit',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});
process.exitCode=result.status??1;
