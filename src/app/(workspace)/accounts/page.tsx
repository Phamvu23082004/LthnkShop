import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/auth/permissions";
import { CreateAccountForm,EditAccountForm } from "@/components/account-forms";
export default async function Page(){
 await requireAdmin();const client=await createClient();
 const [{data:profiles,error},{data:grants,error:grantError}]=await Promise.all([
 client.from("profiles").select("id,email,full_name,role,active,created_at").order("created_at",{ascending:false}),
 client.from("employee_permissions").select("employee_id,permission")
 ]);
 if(error||grantError) throw new Error("Không tải được danh sách tài khoản.");
 return <div className="space-y-7"><div><p className="text-sm text-stone-500">Quản trị hệ thống</p><h1 className="mt-2 text-3xl font-semibold">Tài khoản & phân quyền</h1><p className="mt-3 text-sm leading-7 text-stone-600">Chỉ chủ shop được quản lý tài khoản. Mọi thay đổi quyền được ghi lại trong database.</p></div><div className="grid items-start gap-6 xl:grid-cols-[1fr_1.5fr]"><section className="rounded-2xl border border-stone-200 bg-white p-6"><CreateAccountForm/></section><section className="space-y-4"><h2 className="text-xl font-semibold">Danh sách tài khoản ({profiles?.length??0})</h2>{(profiles??[]).map(p=><EditAccountForm key={p.id} profile={p as Profile} grants={(grants??[]).filter(g=>g.employee_id===p.id).map(g=>g.permission)}/>)}</section></div></div>;
}
