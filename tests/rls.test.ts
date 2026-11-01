import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL RLS and account mutation contracts",async()=>{
 const db=new PGlite();
 try{
 await db.exec(`
 create role anon nologin;
 create role authenticated nologin;
 create role service_role nologin bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$
 select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 `);
 await db.exec(await readFile(new URL("../supabase/migrations/202610310001_accounts.sql",import.meta.url),"utf8"));
 await db.exec(await readFile(new URL("../supabase/tests/accounts_rls.sql",import.meta.url),"utf8"));
 }finally{await db.close();}
});
