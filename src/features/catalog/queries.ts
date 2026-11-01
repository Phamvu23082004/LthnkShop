import "server-only";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "./types";
export async function getCatalog(){
 await requirePermission("orders.read");const client=await createClient();
 const {data,error}=await client.from("products").select("id,name,product_type,active,product_variants(id,product_id,name,price_vnd,active)").order("name");
 if(error){if(error.code==="PGRST205"||error.code==="42P01")return {products:[] as Product[],needsMigration:true};throw new Error("Không tải được danh mục sản phẩm.");}
 return {products:(data??[]) as Product[],needsMigration:false};
}
