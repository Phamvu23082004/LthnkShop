import { z } from "zod";
import { totals,statuses } from "./domain";
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{
 const d=new Date(v+"T00:00:00Z");return !isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v&&v>="2000-01-01"&&v<="2100-12-31";
},"Ngày không hợp lệ");
const money=z.number().int().min(0).max(1000000000000);
export const itemSchema=z.object({
 product_id:z.uuid().nullable().optional(),variant_id:z.uuid().nullable().optional(),
 product_name:z.string().trim().min(1).max(200),product_type:z.enum(["diy_kit","finished_product"]),
 variant:z.string().trim().max(200),quantity:z.number().int().min(1).max(10000),unit_price_vnd:money.max(1000000000)
}).strict();
export const orderSchema=z.object({
 request_id:z.uuid(),ordered_on:dateSchema.nullable(),customer_name:z.string().trim().min(2).max(100),
 phone:z.string().trim().refine(v=>v===""||/^[0-9+(). -]{6,25}$/.test(v),"Số điện thoại không hợp lệ"),address:z.string().trim().refine(v=>v===""||(v.length>=3&&v.length<=500),"Địa chỉ không hợp lệ"),
 sales_platform:z.enum(["","tiktok","instagram"]).default(""),buyer_link:z.string().trim().max(2000).default("").refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==="http:"||url.protocol==="https:";}catch{return false;}} ,"URL phải bắt đầu bằng http:// hoặc https://."),shipping_vnd:money,discount_vnd:money,deposit_vnd:money,
 due_on:dateSchema.nullable(),notes:z.string().trim().max(2000),items:z.array(itemSchema).min(1).max(100)
}).strict().superRefine((o,c)=>{
 if(o.due_on&&o.ordered_on&&o.due_on<o.ordered_on)c.addIssue({code:"custom",message:"Ngày hẹn không được trước ngày đặt.",path:["due_on"]});
 try{totals(o.items,o.shipping_vnd,o.discount_vnd,o.deposit_vnd,o.deposit_vnd);}catch{c.addIssue({code:"custom",message:"Giảm giá không vượt tiền hàng; tiền cọc không vượt tổng đơn.",path:["deposit_vnd"]});}
});
export const completedPaymentSchema=z.object({id:z.uuid(),version:z.number().int().positive(),paid_vnd:money});
export const statusSchema=z.object({id:z.uuid(),version:z.number().int().positive(),status:z.enum([...statuses,"cancelled"]),reason:z.string().trim().max(1000),confirmed:z.boolean()}).superRefine((o,c)=>{
 if(o.status==="cancelled"&&(!o.confirmed||o.reason.length<3))c.addIssue({code:"custom",message:"Cần xác nhận hủy và nhập lý do ít nhất 3 ký tự."});
});
export type OrderInput=z.infer<typeof orderSchema>;
