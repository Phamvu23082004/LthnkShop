"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";


import { createClient } from "@/lib/supabase/server";
import { orderSchema,statusSchema } from "./schema";
export type OrderActionState={error?:string;success?:string};
function rpcError(code?:string){
 if(code==="40001")return "Đơn đã được thay đổi ở nơi khác. Tải lại trang trước khi lưu.";
 if(code==="42501")return "Bạn không còn quyền thay đổi đơn hàng.";
 if(code==="23514")return "Dữ liệu tiền không hợp lệ hoặc đơn đã hủy, không thể chỉnh sửa.";
 if(code==="PGRST202"||code==="PGRST205")return "Database chưa có chức năng đơn hàng. Cần chạy migration 202610310002_orders.sql.";
 return "Không thể lưu đơn. Kiểm tra dữ liệu/kết nối rồi thử lại.";
}
// RPCs enforce active account and both order permissions atomically in PostgreSQL.
async function mutationClient(){const client=await createClient();const {data,error}=await client.auth.getUser();if(error||!data.user)redirect("/login");return client;}
export async function saveOrder(_:OrderActionState,form:FormData):Promise<OrderActionState>{
 const client=await mutationClient();let items:unknown;
 try{items=JSON.parse(String(form.get("items")??""));}catch{return {error:"Danh sách sản phẩm không hợp lệ."};}
 const input=orderSchema.safeParse({
 request_id:form.get("request_id"),ordered_on:form.get("ordered_on")||null,customer_name:form.get("customer_name"),
 phone:form.get("phone"),address:form.get("address"),sales_platform:form.get("sales_platform")??"",buyer_link:form.get("buyer_link")??"",
 shipping_vnd:Number(form.get("shipping_vnd")),discount_vnd:Number(form.get("discount_vnd")),
 deposit_vnd:Number(form.get("deposit_vnd")),paid_vnd:Number(form.get("paid_vnd")),
 due_on:form.get("due_on")||null,notes:form.get("notes")||"",items
 });
 if(!input.success)return {error:input.error.issues[0]?.message==="Invalid input"?"Kiểm tra lại dữ liệu bắt buộc.":("Thông tin đơn chưa hợp lệ. "+input.error.issues[0]?.message)};
 const id=String(form.get("id")??"");const version=Number(form.get("version"));
 if(id&&(!z.uuid().safeParse(id).success||!Number.isInteger(version)||version<1))return {error:"Phiên bản đơn không hợp lệ."};
 const {data,error}=await client.rpc("save_order",{payload:input.data,target_id:id||null,expected_version:id?version:null});
 if(error)return {error:rpcError(error.code)};
 revalidatePath("/orders");if(id)revalidatePath("/orders/"+id);
 redirect("/orders/"+data);
}
export async function changeStatus(_:OrderActionState,form:FormData):Promise<OrderActionState>{
 const client=await mutationClient();
 const input=statusSchema.safeParse({id:form.get("id"),version:Number(form.get("version")),status:form.get("status"),reason:form.get("reason")||"",confirmed:form.get("confirmed")==="on"});
 if(!input.success)return {error:input.error.issues[0]?.message||"Trạng thái không hợp lệ."};
 const {error}=await client.rpc("change_order_status",{target_id:input.data.id,expected_version:input.data.version,next_status:input.data.status,change_reason:input.data.reason});
 if(error)return {error:rpcError(error.code)};
 revalidatePath("/orders");revalidatePath("/orders/"+input.data.id);
 return {success:"Đã cập nhật trạng thái."};
}
