"use client";
import { useActionState } from "react";
import { changePassword } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
export function PasswordForm(){
 const [state,action,pending]=useActionState(changePassword,{});
 return <form action={action} className="max-w-md space-y-4"><h2 className="text-xl font-semibold">Đổi mật khẩu</h2><label className="block text-sm">Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} className="field mt-2"/></label><label className="block text-sm">Mật khẩu mới<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="field mt-2"/></label><label className="block text-sm">Nhập lại mật khẩu mới<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="field mt-2"/></label><p className="text-xs leading-6 text-stone-600">Dùng ít nhất 12 ký tự, gồm chữ và số.</p>{state.error&&<p role="alert" className="text-sm text-red-800">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-green-800">{state.success}</p>}<Button disabled={pending}>{pending?"Đang lưu…":"Cập nhật mật khẩu"}</Button></form>;
}
