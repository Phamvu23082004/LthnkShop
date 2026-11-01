import { NavigationLink as Link } from "@/components/navigation-link";
import { requirePermission } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";

import { parseFilters,pageHref,orderFiltersHref } from "@/features/orders/filters";
import { listOrders } from "@/features/orders/queries";
import { OrderRow } from "@/components/orders/order-row";
import { OrderCard } from "@/components/orders/order-card";

import { OrderFilters } from "@/components/orders/filters";
import { Button } from "@/components/ui/button";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const session=await requirePermission("orders.read");const f=parseFilters(await searchParams);
 const {orders,count,needsMigration}=await listOrders(f);const write=canAccess(session.profile,session.grants,"orders.write");
 return <div className="min-w-0 space-y-6"><header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-widest text-stone-500">Điều hành xưởng</p><h1 className="mt-2 break-words text-3xl font-semibold">Quản lý đơn hàng</h1><p className="mt-3 text-sm text-stone-600">Set len DIY & sản phẩm hoàn chỉnh · {count} đơn theo bộ lọc</p></div>{write&&!needsMigration&&<Button asChild className="w-full min-w-0 max-w-full whitespace-normal text-center sm:w-auto"><Link href="/orders/new">+ Tạo đơn hàng</Link></Button>}</header>
 {session.profile.role==="admin"&&<Link href="/orders/products" className="inline-block text-sm font-medium text-primary underline underline-offset-4">Danh mục sản phẩm & màu</Link>}
 <nav aria-label="Phân loại đơn hàng" className="grid grid-cols-1 gap-2 sm:grid-cols-3">{([["all","Tất cả"],["finished_product","Sản phẩm handmade"],["diy_kit","Set len DIY"]] as const).map(([type,label])=><Button key={type} asChild variant={f.order_type===type?"default":"outline"} className="w-full"><Link href={orderFiltersHref(f,type)} aria-current={f.order_type===type?"page":undefined}>{label}</Link></Button>)}</nav>
 <OrderFilters key={JSON.stringify([f.sort,f.q,f.mode,f.dateField,f.value,f.from,f.to,f.status,f.sales_platform,f.order_type])} filters={f}/>{f.error&&<p role="alert" className="text-sm text-red-800">{f.error}</p>}
 {needsMigration?<section className="rounded-2xl border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">Cần thiết lập database đơn hàng</h2><p className="mt-3 text-sm leading-7">Chạy các migration đơn hàng theo thứ tự, bao gồm <code>202610310006_product_catalog.sql</code> và <code>202611010012_order_classification_buyer_link.sql</code>, sau đó tải lại trang.</p></section>:<>
 <div className="space-y-3 2xl:hidden">{orders.map(o=><OrderCard key={o.id} order={o} canWrite={write}/>)}{orders.length===0&&<p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">Không có đơn hàng phù hợp.</p>}</div>
<div className="hidden min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white 2xl:block"><table className="w-full table-fixed text-left text-xs"><caption className="sr-only">Danh sách đơn hàng theo bộ lọc</caption><colgroup><col className="w-[10%]"/><col className="w-[14%]"/><col className="w-[14%]"/><col className="w-[13%]"/><col className="w-[7%]"/><col className="w-[10%]"/><col className="w-[14%]"/><col className="w-[11%]"/><col className="w-[7%]"/></colgroup><thead className="bg-[#f3efea] text-xs text-stone-600"><tr>{["Mã / Ngày đặt","Khách hàng","Sản phẩm / màu","Nền tảng / Ngày trả đơn","URL người mua","Tổng tiền","Đã trả / Còn lại","Trạng thái","Thao tác"].map(t=><th key={t} scope="col" className="break-words px-2 py-3 font-medium">{t}</th>)}</tr></thead><tbody>
 {orders.map(o=><OrderRow key={o.id} order={o} canWrite={write}/>)}
 {orders.length===0&&<tr><td colSpan={9} className="px-5 py-12 text-center text-stone-500">Không có đơn hàng phù hợp.</td></tr>}</tbody></table></div>
 <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-4 text-sm"><span>Trang {f.page} / {Math.max(1,Math.ceil(count/20))} · 20 đơn/trang</span><div className="flex gap-5">{f.page>1&&<Link href={pageHref(f,f.page-1)} className="underline">Trang trước</Link>}{f.page*20<count&&<Link href={pageHref(f,f.page+1)} className="underline">Trang sau</Link>}</div></nav></>}
 </div>;
}
