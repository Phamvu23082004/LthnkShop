import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("default finished products preserve existing IDs and avoid case duplicates",async()=>{
 const db=new PGlite();
 try{
  await db.exec("create table public.products(id uuid primary key default gen_random_uuid(),name text,product_type text,active boolean default true,unique(product_type,name));insert into public.products(name,product_type,active) values('twinkle','finished_product',false);");
  const existing=(await db.query<{id:string}>("select id from public.products")).rows[0].id;
  const sql=await readFile(new URL("../supabase/migrations/202610310007_default_finished_products.sql",import.meta.url),"utf8");
  await db.exec(sql);await db.exec(sql);
  const rows=(await db.query<{id:string;name:string;product_type:string;active:boolean}>("select * from public.products")).rows;
  assert.equal(rows.length,6);
  assert.equal(rows.find(p=>p.id===existing)?.name,"twinkle");
  assert.equal(rows.find(p=>p.id===existing)?.active,false);
  assert.deepEqual(rows.map(p=>p.name.toLowerCase()).sort(),["twinkle","bonet","khăn","túi","bikini","khác"].sort());
  assert.ok(rows.every(p=>p.product_type==="finished_product"));
 }finally{await db.close();}
});
