"use client";
import { useOptimistic } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/orders/status-badge";
import { StatusForm } from "@/components/orders/status-form";
import { OrderItemsSummary } from "@/components/orders/order-items-summary";
import { statusPresentation } from "@/features/orders/presentation";
import type { Order } from "@/features/orders/domain";
import { formatDate,formatVnd } from "@/lib/format";

export function OrderCard({order,canWrite}:{order:Order;canWrite:boolean}) {
 const [status,updateStatus]=useOptimistic(order.status);
 const tone=statusPresentation[status]??statusPresentation.preparing;
 return <article aria-busy={status!==order.status} className={`space-y-4 rounded-2xl border border-stone-200 p-4 ${tone.row}`}>
  <header className="flex min-w-0 items-start justify-between gap-3">
   <div className="min-w-0"><p className="text-xs text-stone-600">{order.ordered_on?formatDate(order.ordered_on+"T12:00:00+07:00"):"Chưa rõ ngày đặt"}</p></div>
   {!canWrite&&<StatusBadge status={status}/>}
  </header>
  <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-4 text-sm">
   <div className="min-w-0"><dt className="text-xs text-stone-500">Khách hàng</dt><dd className="mt-1 break-words font-medium">{order.customer_name}</dd><dd className="mt-1 break-all text-xs text-stone-600">{order.phone||"Chưa có SĐT"}</dd></div>
   <div className="min-w-0"><dt className="text-xs text-stone-500">Nền tảng</dt><dd className="mt-1 break-words">{order.sales_platform==="tiktok"?"TikTok":order.sales_platform==="instagram"?"Instagram":"—"}</dd></div>
   <div><dt className="text-xs text-stone-500">Ngày trả đơn</dt><dd className="mt-1">{order.due_on?formatDate(order.due_on+"T12:00:00+07:00"):"Chưa hẹn"}</dd></div>
   <div><dt className="text-xs text-stone-500">Đã trả</dt><dd className="mt-1">{formatVnd(order.paid_vnd)}</dd></div>
  </dl>
  <section className="rounded-xl bg-white/70 p-3 text-sm"><h3 className="mb-2 text-xs font-medium text-stone-500">Sản phẩm / màu</h3><OrderItemsSummary items={order.order_items}/></section>
  <div className="text-sm"><span className="text-xs text-stone-500">URL người mua</span><p className="mt-1">{order.buyer_link?<a href={order.buyer_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">Mở link</a>:"—"}</p></div>
  <div className="flex flex-wrap justify-between gap-3 rounded-xl bg-white/70 p-3 text-sm"><span>Tổng đơn <strong className="ml-1">{formatVnd(order.total_vnd)}</strong></span><span>Còn lại <strong>{formatVnd(order.remaining_vnd)}</strong></span></div>
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><Link href={`/orders/${order.id}`} className="underline">Chi tiết</Link>{canWrite&&order.status!=="cancelled"&&<Link href={`/orders/${order.id}/edit`} className="underline">Chỉnh sửa</Link>}</div>
  {canWrite&&<details className="rounded-xl border border-stone-200/80 bg-white/70 p-3"><summary className="cursor-pointer text-sm font-medium">Cập nhật trạng thái</summary><div className="mt-3"><StatusForm key={order.version} id={order.id} version={order.version} status={order.status} onOptimisticStatus={updateStatus} totalVnd={order.total_vnd} paidVnd={order.paid_vnd} showFullPaymentAction/></div></details>}
 </article>;
}
