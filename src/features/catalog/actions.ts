"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { catalogSchema } from "./schema";
export type CatalogState={error?:string;success?:string;resetToken?:string};
export async function saveVariant(_:CatalogState,form:FormData):Promise<CatalogState>{
 await requireAdmin();
 const input=catalogSchema.safeParse({product_id:form.get("product_id")||null,variant_id:form.get("variant_id")||null,product_name:form.get("product_name")||"",product_type:form.get("product_type"),variant_name:form.get("variant_name"),price_vnd:Number(form.get("price_vnd")),active:form.get("active")==="on"});
 if(!input.success)return {error:"Kiểm tra tên sản phẩm, màu/phân loại và đơn giá nguyên VND."};
 const client=await createClient();const {error}=await client.rpc("save_catalog_variant",{payload:input.data});
 if(error)return {error:error.code==="23505"?"Màu/phân loại này đã tồn tại trong sản phẩm.":"Không lưu được danh mục. Kiểm tra quyền, dữ liệu và migration 006."};
 revalidatePath("/orders/products");revalidatePath("/orders/new");
 return {success:"Đã lưu sản phẩm và màu/phân loại."};
}

export async function saveVariants(_:CatalogState,form:FormData):Promise<CatalogState>{
 await requireAdmin();
 let variants:unknown;
 try{variants=JSON.parse(String(form.get("variants")??""));}catch{return {error:"Danh sách màu/phân loại không hợp lệ."};}
 const input=z.object({
  product_id:z.uuid().nullable(),product_name:z.string().trim().max(200),
  product_type:z.enum(["diy_kit","finished_product"]),
  variants:z.array(z.object({name:z.string().trim().min(1).max(200),price_vnd:z.number().int().min(0).max(1000000000),active:z.boolean()})).min(1).max(50)
 }).safeParse({product_id:form.get("product_id")||null,product_name:form.get("product_name")||"",product_type:form.get("product_type"),variants});
 if(!input.success)return {error:"Kiểm tra tên sản phẩm, màu/phân loại và đơn giá nguyên VND."};
 if(input.data.product_id===null&&!input.data.product_name)return {error:"Nhập tên sản phẩm."};
 const client=await createClient();
 const {error}=await client.rpc("save_catalog_variants",{payload:input.data});
 if(error)return {error:error.code==="23505"?"Có màu/phân loại đã tồn tại trong sản phẩm. Hãy kiểm tra lại danh sách.":error.code==="42501"?"Bạn không có quyền sửa danh mục.":"Không lưu được danh mục. Kiểm tra dữ liệu và migration 202611010015_bulk_catalog_variants.sql."};
 revalidatePath("/orders/products");revalidatePath("/orders/new");
 return {success:`Đã thêm ${input.data.variants.length} màu/phân loại vào danh mục.`,resetToken:crypto.randomUUID()};
}

export async function deleteProduct(productId:string,_:CatalogState,_formData:FormData):Promise<CatalogState>{
 void _;void _formData;
 await requireAdmin();
 const parsed=z.uuid().safeParse(productId);
 if(!parsed.success)return {error:"Mã sản phẩm không hợp lệ."};
 const client=await createClient();
 const {data,error}=await client.rpc("delete_catalog_product",{target_product:productId});
 if(error)return {error:error.code==="P0002"?"Không tìm thấy sản phẩm.":error.code==="42501"?"Bạn không có quyền xóa sản phẩm.":"Không thể xóa sản phẩm. Hãy kiểm tra migration 202611010014_delete_catalog_products.sql."};
 revalidatePath("/orders/products");revalidatePath("/orders/new");revalidatePath("/orders");
 return {success:data==="deactivated"?"Sản phẩm đã có lịch sử đơn hàng/báo cáo nên đã được ngừng bán để bảo toàn dữ liệu cũ.":"Đã xóa sản phẩm và các màu/phân loại."};
}
