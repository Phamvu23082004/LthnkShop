"use client";
import { NavigationLink as Link } from "@/components/navigation-link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard,ShoppingBag,Users,Spool,Package,ShieldCheck,Menu,X,LogOut,UserRound } from "lucide-react";
import { modules } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { canAccess,permissionForRoute,type Profile } from "@/lib/auth/permissions";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
const icons={LayoutDashboard,ShoppingBag,Users,Spool,Package,ShieldCheck};
export function AppShell({children,profile,grants}:{children:React.ReactNode;profile:Profile;grants:string[]}) {
 const pathname=usePathname();const [open,setOpen]=useState(false);
 const visible=modules.filter(m=>{const p=permissionForRoute("/"+m.slug);return p==="admin"?profile.role==="admin":canAccess(profile,grants,p)});
 return <div className="min-h-screen">
 <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4">Đến nội dung chính</a>
 <header className="flex h-20 items-center justify-between border-b border-stone-200 bg-white px-5 md:hidden"><Link href="/" className="font-heading text-xl font-semibold">LTHNK Handmade</Link><button aria-label={open?"Đóng điều hướng":"Mở điều hướng"} aria-expanded={open} aria-controls="navigation" onClick={()=>setOpen(!open)} className="rounded-lg border border-stone-200 p-2">{open?<X/>:<Menu/>}</button></header>
 {open&&<button aria-label="Đóng điều hướng" className="fixed inset-x-0 bottom-0 top-20 z-20 bg-black/20 md:hidden" onClick={()=>setOpen(false)}/>}
 <aside id="navigation" className={cn("fixed bottom-0 top-20 z-30 w-64 overflow-y-auto border-r border-stone-200 bg-white p-5 md:inset-y-0 md:block",open?"block":"hidden")}>
 <Link href="/" className="mb-10 hidden px-3 pt-5 md:block"><span className="font-heading text-3xl font-semibold tracking-widest">LTHNK<span className="text-primary">.</span></span><span className="mt-2 block text-[10px] tracking-[.18em] text-stone-500">HANDMADE MANAGEMENT</span></Link>
 <p className="mb-3 px-3 text-xs uppercase tracking-widest text-stone-500">Không gian làm việc</p>
 <nav aria-label="Điều hướng chính" className="space-y-1">{visible.map(m=>{const href=m.slug?"/"+m.slug:"/";const Icon=icons[m.icon];return <Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={pathname===href?"page":undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-stone-50",pathname===href&&"bg-[#f3efea] font-semibold text-primary")}><Icon size={19}/>{m.title}</Link>})}
 {profile.role==="admin"&&<Link href="/orders/products" onClick={()=>setOpen(false)} aria-current={pathname.startsWith("/orders/products")?"page":undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-stone-50",pathname.startsWith("/orders/products")&&"bg-[#f3efea] font-semibold text-primary")}><Package size={19}/>Danh mục sản phẩm</Link>}
 <Link href="/account" onClick={()=>setOpen(false)} aria-current={pathname==="/account"?"page":undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-stone-50",pathname==="/account"&&"bg-[#f3efea] font-semibold text-primary")}><UserRound size={19}/>Tài khoản của tôi</Link></nav>
 <div className="mt-8 rounded-xl bg-background p-4 text-xs leading-6 text-stone-600">Từng mũi len, từng điều nhỏ.<br/>Cùng chăm chút mỗi ngày.</div></aside>
 <div className="min-w-0 md:ml-64"><header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-4 lg:px-10"><div><p className="text-sm font-medium">{profile.full_name}</p><p className="mt-1 text-xs text-stone-500">{profile.role==="admin"?"Chủ shop":"Nhân viên"}</p></div><form action={logout}><Button variant="outline" size="sm"><LogOut size={16}/>Đăng xuất</Button></form></header><main id="main" className="mx-auto w-full min-w-0 max-w-[1600px] p-4 sm:p-5 md:p-8 lg:p-10">{children}</main><footer className="px-6 pb-6 text-xs text-stone-500">LTHNK Handmade · Quản lý nội bộ</footer></div>
 </div>;
}
