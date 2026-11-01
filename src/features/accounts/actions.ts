"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccountSchema,updateAccountSchema } from "./schema";
import type { ActionState } from "@/features/auth/actions";
export async function createAccount(_:ActionState,form:FormData):Promise<ActionState>{
 await requireAdmin();
 const parsed=createAccountSchema.safeParse({fullName:form.get("fullName"),email:String(form.get("email")??"").trim().toLowerCase(),password:form.get("password")});
 if(!parsed.success) return {error:"Kiểm tra họ tên, email và mật khẩu (12–128 ký tự, gồm chữ và số)."};
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY) return {error:"Máy chủ chưa cấu hình khóa quản trị Supabase."};
 const admin=createAdminClient();
 const {data,error}=await admin.auth.admin.createUser({email:parsed.data.email,password:parsed.data.password,email_confirm:true,user_metadata:{full_name:parsed.data.fullName}});
 if(error||!data.user) return {error:"Không tạo được tài khoản. Email có thể đã tồn tại; hãy kiểm tra cấu hình Supabase."};
 // The auth trigger creates an inactive staff profile. Activate only through owner-authorized RPC.
 const client=await createClient();
 const {error:provisionError}=await client.rpc("manage_account",{target_id:data.user.id,new_name:parsed.data.fullName,new_role:"staff",new_active:true,new_permissions:["employees.read"]});
 if(provisionError) {
 const {error:cleanupError}=await admin.auth.admin.deleteUser(data.user.id);
 return {error:cleanupError?"Tài khoản tạo dở dang vẫn bị khóa. Hãy kiểm tra danh sách và nhật ký Supabase trước khi thử lại.":"Chưa cấp quyền được; đã hoàn tác tài khoản vừa tạo."};
 }
 revalidatePath("/accounts");
 return {success:"Đã tạo tài khoản nhân viên. Hãy gửi mật khẩu ban đầu qua kênh riêng và yêu cầu nhân viên đổi mật khẩu."};
}
export async function updateAccount(_:ActionState,form:FormData):Promise<ActionState>{
 await requireAdmin();
 const parsed=updateAccountSchema.safeParse({id:form.get("id"),fullName:form.get("fullName"),role:form.get("role"),active:form.get("active")==="on",permissions:form.getAll("permissions")});
 if(!parsed.success) return {error:"Thông tin tài khoản hoặc quyền không hợp lệ."};
 const client=await createClient();
 const {error}=await client.rpc("manage_account",{target_id:parsed.data.id,new_name:parsed.data.fullName,new_role:parsed.data.role,new_active:parsed.data.active,new_permissions:parsed.data.permissions});
 if(error) return {error:"Không thể cập nhật. Không được khóa hoặc hạ quyền chủ shop đang hoạt động cuối cùng; hãy tải lại trang và thử lại."};
 revalidatePath("/accounts");revalidatePath("/","layout");
 return {success:"Đã cập nhật tài khoản và quyền truy cập."};
}
