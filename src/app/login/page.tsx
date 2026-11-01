import { redirect } from "next/navigation";
import { Flower2, ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/supabase/env";
export default async function LoginPage() {
 if(await getSession()) redirect("/");
 return <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8"><section className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/30 lg:grid-cols-[5fr_7fr]">
 <aside className="relative flex flex-col justify-between gap-10 bg-[#efece6] p-8 lg:p-10">
 <div className="flex items-center gap-3"><span className="rounded-xl bg-primary p-3 text-white"><Flower2 size={24}/></span><div><p className="font-heading text-lg font-semibold">LTHNK HANDMADE</p><p className="mt-1 text-xs tracking-widest text-stone-600">KHÔNG GIAN THỦ CÔNG</p></div></div>
 <div className="hidden lg:block"><div aria-hidden="true" className="mb-8 flex aspect-[4/3] items-center justify-center rounded-2xl border border-[#d4c3bb] bg-[#e5dad0]"><Flower2 size={120} strokeWidth={0.7} className="text-primary"/></div><p className="text-xs uppercase tracking-widest text-stone-600">Kỳ công & chậm rãi</p><h2 className="mt-3 text-2xl leading-relaxed">Nơi từng nút len lưu giữ trọn vẹn sự tận tâm.</h2></div>
 <p className="text-sm italic leading-7 text-stone-600">“Tỉ mỉ từng đường kim, vẹn tròn từng sản phẩm.”</p></aside>
 <div className="p-7 sm:p-10 lg:p-14"><span className="inline-flex items-center gap-2 rounded-full bg-[#f3efea] px-3 py-2 text-xs text-stone-700"><ShieldCheck size={15}/>Cổng quản lý nội bộ</span><h1 className="mb-3 mt-8 text-3xl font-semibold">Đăng nhập tài khoản</h1><p className="mb-8 text-sm leading-7 text-stone-600">Chào mừng bạn trở lại xưởng LTHNK Handmade.</p><AuthForm configured={hasSupabaseEnv()}/><footer className="mt-10 border-t border-stone-100 pt-5 text-xs leading-6 text-stone-500">LTHNK Handmade Management<br/>Dành cho chủ shop và nhân viên được cấp tài khoản.</footer></div>
 </section></main>;
}
