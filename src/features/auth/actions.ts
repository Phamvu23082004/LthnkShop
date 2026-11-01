"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireSession } from "@/lib/auth/session";
export type ActionState={error?:string;success?:string};
const loginSchema=z.object({email:z.email().max(254),password:z.string().min(1).max(128)});
export async function login(_:ActionState,form:FormData):Promise<ActionState> {
 if(!hasSupabaseEnv()) return {error:"Chưa cấu hình Supabase. Vui lòng điền .env.local và khởi động lại ứng dụng."};
 const parsed=loginSchema.safeParse({email:String(form.get("email")??"").trim().toLowerCase(),password:form.get("password")});
 if(!parsed.success) return {error:"Vui lòng nhập email hợp lệ và mật khẩu."};
 const client=await createClient();
 const {data,error}=await client.auth.signInWithPassword(parsed.data);
 if(error||!data.user) return {error:"Không thể đăng nhập. Kiểm tra email, mật khẩu hoặc thử lại sau."};
 const {data:profile,error:profileError}=await client.from("profiles").select("active").eq("id",data.user.id).maybeSingle();
 if(profileError||!profile?.active) {await client.auth.signOut();return {error:"Tài khoản chưa được cấp quyền hoặc đã bị khóa. Vui lòng liên hệ chủ shop."};}
 redirect("/");
}
export async function logout() {
 const client=await createClient();
 const {error}=await client.auth.signOut({scope:"local"});
 if(error) throw new Error("Đăng xuất chưa thành công. Vui lòng thử lại.");
 redirect("/login");
}
const passwordSchema=z.string().min(12).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/);
export async function changePassword(_:ActionState,form:FormData):Promise<ActionState> {
 const session=await requireSession();
 const next=passwordSchema.safeParse(form.get("password"));
 if(!next.success) return {error:"Mật khẩu mới cần 12–128 ký tự, gồm chữ và số."};
 if(form.get("password")!==form.get("confirmation")) return {error:"Mật khẩu xác nhận chưa khớp."};
 const current=String(form.get("currentPassword")??"");
 if(!current||current.length>128) return {error:"Vui lòng nhập mật khẩu hiện tại."};
 const client=await createClient();
 const {error:verifyError}=await client.auth.signInWithPassword({email:session.profile.email,password:current});
 if(verifyError) return {error:"Mật khẩu hiện tại không đúng."};
 const {error}=await client.auth.updateUser({password:next.data});
 if(error) return {error:"Không thể đổi mật khẩu. Vui lòng thử lại."};
 return {success:"Đã đổi mật khẩu thành công."};
}
