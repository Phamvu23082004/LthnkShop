import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { RevenueReport } from "../src/features/analytics/domain";
test("revenue RPC separates deposits, cancellation, calendar cohorts and access",async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of ["202610310001_accounts.sql","202610310002_orders.sql","202610310003_incomplete_orders.sql","202610310004_order_default_preparing.sql","202610310005_order_three_stages.sql","202610310008_revenue_dashboard.sql"])await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
 const owner=randomUUID(),staff=randomUUID();
 await db.query("insert into auth.users(id,email) values($1,'owner@analytics.test'),($2,'staff@analytics.test')",[owner,staff]);
 await db.query("select public.bootstrap_owner($1,'Owner')",[owner]);
 async function order(date:string|null,status:string,subtotal:number,shipping:number,discount:number,deposit:number,paid:number){
 return (await db.query<{id:string}>(`insert into public.orders(request_id,ordered_on,customer_name,phone,address,channel,status,shipping_vnd,discount_vnd,deposit_vnd,paid_vnd,subtotal_vnd,total_vnd,created_by)
 values($1,$2,'SENSITIVE_FIXTURE','','','Shop',$3,$4,$5,$6,$7,$8,$9,$10) returning id`,[randomUUID(),date,status,shipping,discount,deposit,paid,subtotal,subtotal+shipping-discount,owner])).rows[0].id;
 }
 const a=await order("2026-10-31","preparing",1000,100,100,200,400);
 const b=await order("2026-11-01","completed",2000,0,0,500,2000);
 const c=await order("2026-11-30","cancelled",3000,0,0,100,300);
 await order("2026-12-01","producing",4000,0,0,0,1000);
 await order(null,"preparing",500,0,0,50,100);
 await db.query("insert into public.order_items(order_id,position,product_name,product_type,variant,quantity,unit_price_vnd) values($1,1,'Twinkle','finished_product','Hồng',5,200),($2,1,'Twinkle','finished_product','Kem',1,1000),($2,2,'Bonet','finished_product','Nâu',1,1000),($3,1,'Cancelled product','finished_product','',10,300)",[a,b,c]);
 await db.exec("set role authenticated");
 const actor=async(id:string)=>{await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,role:"authenticated"})]);};
 await actor(owner);
 const report=async(start:string|null,end:string|null)=>(await db.query<{report:RevenueReport}>("select public.get_revenue_dashboard($1::date,$2::date) as report",[start,end])).rows[0].report;
 const nov=await report("2026-11-01","2026-12-01");
 assert.equal(nov.summary.orders,"2");assert.equal(nov.summary.processing,"0");assert.equal(nov.summary.completed,"1");
 assert.equal(nov.summary.order_value,"2000");assert.equal(nov.summary.received,"2300");assert.equal(nov.summary.deposits,"600");
 assert.equal(nov.summary.outstanding,"0");assert.equal(nov.summary.cancelled_received,"300");
 assert.equal(nov.bestsellers.length,2);assert.ok(nov.bestsellers.every(p=>p.product_name!=="Cancelled product"));
 assert.equal(nov.excluded_undated,"1");assert.equal(nov.monthly.length,1);
 assert.equal(nov.monthly[0].order_value,"2000");
 const all=await report(null,null);
 assert.equal(all.summary.orders,"5");assert.equal(all.summary.processing,"3");assert.equal(all.summary.undated,"1");
 assert.equal(all.summary.order_value,"7500");assert.equal(all.summary.received,"3800");assert.equal(all.summary.deposits,"850");assert.equal(all.summary.outstanding,"4000");
 assert.equal(BigInt(all.summary.received)-BigInt(all.summary.cancelled_received)+BigInt(all.summary.outstanding),BigInt(all.summary.order_value));
 assert.equal(all.bestsellers.find(p=>p.product_name==="Twinkle")?.quantity,"6");
 assert.ok(!JSON.stringify(all).includes("SENSITIVE_FIXTURE"));
 const year=await report("2026-01-01","2027-01-01");assert.equal(year.monthly.length,12);assert.equal(year.monthly[0].order_value,"0");
 const boundary=await report("2026-10-31","2026-11-02");assert.equal(boundary.summary.order_value,"3000");
 const empty=await report("2027-01-01","2027-02-01");assert.equal(empty.summary.orders,"0");assert.equal(empty.summary.received,"0");assert.equal(empty.bestsellers.length,0);
 await assert.rejects(report("2026-12-01","2026-11-01"));await assert.rejects(report("2026-11-01",null));
 await db.query("select public.manage_account($1,'Staff','staff',true,array['orders.read'])",[staff]);await actor(staff);
 await assert.rejects(report(null,null));
 await actor(owner);await db.query("select public.manage_account($1,'Staff','staff',true,array['analytics.read'])",[staff]);await actor(staff);
 assert.equal((await report(null,null)).summary.orders,"5");
 assert.equal((await db.query("select * from public.orders")).rows.length,0);
 await actor(owner);await db.query("select public.manage_account($1,'Staff','staff',false,array['analytics.read'])",[staff]);await actor(staff);await assert.rejects(report(null,null));
 await db.exec("reset role;set role anon");await assert.rejects(report(null,null));
 }finally{await db.close();}
});
