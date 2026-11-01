import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { prepareOrdersMigration } from "../scripts/lib/csv-orders.mjs";
test("orders: atomic writes, exact totals, RLS, history, versioning and cancellation",async()=>{
 const db=new PGlite();
 try{
 await db.exec(`
 create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$
 select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 `);
 await db.exec("create sequence public.order_code_seq start 900");
 await db.exec(`create function public.save_order(payload jsonb,target_id uuid default null,expected_version integer default null) returns uuid language plpgsql as $$ begin return null;end $$; create function public.change_order_status(target_id uuid,expected_version integer,next_status text,change_reason text default '') returns void language plpgsql as $$ begin return;end $$;`);
 for(const file of ["202610310001_accounts.sql","202610310002_orders.sql","202610310003_incomplete_orders.sql","202610310004_order_default_preparing.sql","202610310005_order_three_stages.sql"]){const sql=await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8");await db.exec(file==="202610310002_orders.sql"?prepareOrdersMigration(sql):sql);}
 const owner=randomUUID(),staff=randomUUID();
 await db.query("insert into auth.users(id,email) values($1,'owner@orders.test'),($2,'staff@orders.test')",[owner,staff]);
 await db.query("select public.bootstrap_owner($1,'Owner')",[owner]);
 await db.exec("set role authenticated");
 const actor=async(id:string)=>{await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,role:"authenticated"})]);};
 await actor(owner);
 const payload={request_id:randomUUID(),ordered_on:"2026-10-31",customer_name:"Khách kiểm thử",phone:"0901234567",address:"Hà Nội",channel:"Tại shop",shipping_vnd:30000,discount_vnd:10000,deposit_vnd:100000,paid_vnd:200000,due_on:"2026-11-01",notes:"",items:[{product_name:"Set len",product_type:"diy_kit",variant:"Kem",quantity:2,unit_price_vnd:205000},{product_name:"Thỏ",product_type:"finished_product",variant:"Hồng",quantity:1,unit_price_vnd:100000}]};
 const save=async(p:unknown,id:string|null=null,version:number|null=null)=>(await db.query<{id:string}>("select public.save_order($1::jsonb,$2::uuid,$3::integer) as id",[JSON.stringify(p),id,version])).rows[0].id;
 const id=await save(payload);assert.equal(await save(payload),id);
 await db.exec("reset role");
 for(const file of ["202610310002_orders.sql","202610310003_incomplete_orders.sql","202610310004_order_default_preparing.sql","202610310005_order_three_stages.sql"]){const sql=await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8");await db.exec(file==="202610310002_orders.sql"?prepareOrdersMigration(sql):sql);}
 await db.exec("set role authenticated");await actor(owner);assert.equal(await save(payload),id);
 assert.ok((await db.query<{order_code:string}>("select order_code from public.orders where id=$1",[id])).rows[0].order_code.endsWith("00000900"));
 assert.equal((await db.query<{status:string}>("select status from public.orders where id=$1",[id])).rows[0].status,"preparing");
 assert.equal((await db.query<{new_status:string}>("select new_status from public.order_status_history where order_id=$1",[id])).rows[0].new_status,"preparing");
 let order=(await db.query<{total_vnd:string;remaining_vnd:string;version:number;search_text:string}>("select * from public.orders where id=$1",[id])).rows[0];
 assert.equal(Number(order.total_vnd),530000);assert.equal(Number(order.remaining_vnd),330000);
 assert.ok(order.search_text.includes("DH-"));assert.ok(order.search_text.includes("Thỏ"));
 assert.equal((await db.query("select * from public.order_items where order_id=$1",[id])).rows.length,2);
 const bad={...payload,request_id:randomUUID(),paid_vnd:9999999};
 await assert.rejects(save(bad));
 assert.equal((await db.query("select * from public.orders")).rows.length,1);
 await assert.rejects(save({...payload,items:[]},id,1));
 assert.equal((await db.query("select * from public.order_items where order_id=$1",[id])).rows.length,2);
 await save({...payload,customer_name:"Khách đổi tên"},id,1);
 await assert.rejects(save(payload,id,1));
 await db.query("select public.change_order_status($1,2,'producing','Bắt đầu sản xuất')",[id]);
 assert.equal((await db.query("select * from public.order_status_history where order_id=$1",[id])).rows.length,2);
 await assert.rejects(db.query("update public.orders set status='completed' where id=$1",[id]));
 await db.query("select public.manage_account($1,'Nhân viên','staff',true,array['orders.read'])",[staff]);
 await actor(staff);
 assert.equal((await db.query("select * from public.orders")).rows.length,1);
 await assert.rejects(save({...payload,request_id:randomUUID()}));
 await actor(owner);
 await db.query("select public.manage_account($1,'Nhân viên','staff',true,array['orders.read','orders.write'])",[staff]);
 await actor(staff);
 const second=await save({...payload,request_id:randomUUID()});assert.notEqual(second,id);
 await actor(owner);
 await db.query("select public.manage_account($1,'Nhân viên','staff',false,array['orders.read','orders.write'])",[staff]);
 await actor(staff);assert.equal((await db.query("select * from public.orders")).rows.length,0);
 await assert.rejects(save({...payload,request_id:randomUUID()}));
 await actor(owner);
 await assert.rejects(db.query("select public.change_order_status($1,3,'cancelled','')",[id]));
 await db.query("select public.change_order_status($1,3,'cancelled','Khách đổi ý')",[id]);
 await assert.rejects(db.query("select public.change_order_status($1,4,'pending','Mở lại')",[id]));
 await assert.rejects(save(payload,id,4));
 order=(await db.query<typeof order>("select * from public.orders where id=$1",[id])).rows[0];
 assert.equal(Number(order.remaining_vnd),330000);
 assert.equal((await db.query("select * from public.order_revisions where order_id=$1",[id])).rows.length,2);
 const incomplete=await save({...payload,request_id:randomUUID(),ordered_on:null,phone:"",address:""});assert.ok(incomplete);
 await db.exec("reset role;set role anon");
 await assert.rejects(db.query("select * from public.orders"));
 }finally{await db.close();}
});
