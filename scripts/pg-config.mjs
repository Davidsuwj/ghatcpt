import pg from 'pg';
export function pgClient(schema=process.env.PGSCHEMA||'ghatcpt'){
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw Error('Invalid PGSCHEMA');
 for(const name of ['PGHOST','PGUSER','PGPASSWORD','PGDATABASE'])if(!process.env[name])throw Error('Missing '+name);
 return new pg.Client({host:process.env.PGHOST,port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,database:process.env.PGDATABASE,
  ssl:process.env.PGSSLMODE==='disable'?false:true,options:`-c search_path=${schema} -c timezone=UTC`,application_name:'ghatcpt-maintenance',connectionTimeoutMillis:8000,statement_timeout:30000});
}
