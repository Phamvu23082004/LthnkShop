import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Filters } from "./filters";
import type { Order } from "./domain";
const schemaErrors=new Set(["PGRST205","PGRST204","42703","42P01"]);
export async function hasOrderMetadata(){
 await requirePermission("orders.read");
 const client=await createClient();
 const {error}=await client.from("orders").select("order_type,sales_platform,buyer_link").limit(0);
 if(error&&schemaErrors.has(error.code))return false;
 if(error)throw new Error("Không thể kiểm tra cấu hình database đơn hàng.");
 return true;
}
export async function listOrders(f:Filters){
 await requirePermission("orders.read");
 if(f.error)return {orders:[] as Order[],count:0,needsMigration:false};
 const client=await createClient();
 let query=client.from("orders").select("*,order_type,sales_platform,buyer_link,order_items(product_name,variant,quantity)",{count:"exact"});
 if(f.order_type!=="all")query=query.eq("order_type",f.order_type);
 if(f.sales_platform)query=query.eq("sales_platform",f.sales_platform);
 if(f.q)query=query.ilike("search_text","%"+f.q.replace(/[\\%_]/g,"\\$&")+"%");
 if(f.status)query=query.eq("status",f.status);
 if(f.start)query=query.gte(f.dateField,f.start);
 if(f.end)query=query.lt(f.dateField,f.end);
 const {data,error,count}=await query.order(f.sort==="newest"?"ordered_on":"due_on",{ascending:f.sort==="due_asc",nullsFirst:false}).order("created_at",{ascending:false}).order("id").range((f.page-1)*20,f.page*20-1);
 if(error){if(schemaErrors.has(error.code))return {orders:[] as Order[],count:0,needsMigration:true};throw new Error("Không thể tải đơn hàng.");}
 return {orders:(data??[]) as unknown as Order[],count:count??0,needsMigration:false};
}
export async function getOrder(id:string){
 await requirePermission("orders.read");if(!z.uuid().safeParse(id).success)notFound();
 const client=await createClient();
 const {data,error}=await client.from("orders").select("*,order_type,sales_platform,buyer_link,order_items(*)").eq("id",id).maybeSingle();
 if(error)throw new Error(schemaErrors.has(error.code)?"Cần chạy các migration đơn hàng trước khi xem dữ liệu.":"Không tải được đơn hàng. Kiểm tra migration và kết nối.");
 if(!data)notFound();
 data.order_items.sort((a:{position:number},b:{position:number})=>a.position-b.position);
 return data as Order;
}
export async function getHistory(id:string){
 if(!z.uuid().safeParse(id).success)notFound();
 await requirePermission("orders.read");const client=await createClient();
 const {data,error}=await client.from("order_status_history").select("*").eq("order_id",id).order("created_at",{ascending:true});
 if(error)throw new Error("Không thể tải lịch sử trạng thái.");
 return (data??[]) as {id:string;old_status:string|null;new_status:string;actor_name:string;reason:string;created_at:string}[];
}
