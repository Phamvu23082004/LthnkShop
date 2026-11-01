"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { login } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
export function AuthForm({configured}:{configured:boolean}) {
 const [state,action,pending]=useActionState(login,{}); const [visible,setVisible]=useState(false);
 return <form action={action} className="space-y-5">
 {!configured&&<p role="status" className="rounded-xl bg-[#faf4ec] p-4 text-sm leading-6">Chưa kết nối Supabase. Điền .env.local rồi khởi động lại ứng dụng để đăng nhập.</p>}
 <label className="block text-sm font-medium" htmlFor="email">Email đăng nhập</label>
 <div className="relative"><Mail size={18} className="absolute left-4 top-3.5 text-stone-500"/><input id="email" name="email" type="email" required maxLength={254} autoComplete="username" placeholder="ban@example.com" className="field pl-11"/></div>
 <label className="block text-sm font-medium" htmlFor="password">Mật khẩu</label>
 <div className="relative"><LockKeyhole size={18} className="absolute left-4 top-3.5 text-stone-500"/><input id="password" name="password" type={visible?"text":"password"} required maxLength={128} autoComplete="current-password" className="field pl-11 pr-12"/><button type="button" aria-label={visible?"Ẩn mật khẩu":"Hiện mật khẩu"} aria-pressed={visible} onClick={()=>setVisible(!visible)} className="absolute right-3 top-3 p-0.5">{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>
 {state.error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
 <Button disabled={pending||!configured} className="h-12 w-full">{pending?"Đang đăng nhập…":"Đăng nhập vào xưởng"}<ArrowRight size={18}/></Button>
 <p className="text-xs leading-6 text-stone-600">Tài khoản do chủ shop cấp. Nếu quên mật khẩu, hãy liên hệ chủ shop để được hỗ trợ.</p>
 </form>;
}
