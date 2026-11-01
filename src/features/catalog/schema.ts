import { z } from "zod";
export const catalogSchema=z.object({
 product_id:z.uuid().nullable(),variant_id:z.uuid().nullable(),
 product_name:z.string().trim().max(200),product_type:z.enum(["diy_kit","finished_product"]),
 variant_name:z.string().trim().min(1).max(200),price_vnd:z.number().int().min(0).max(1000000000),active:z.boolean()
}).refine(v=>v.product_id!==null||v.product_name.length>0,"Nhập tên sản phẩm.");
