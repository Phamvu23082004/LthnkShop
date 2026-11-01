"use client";
import { useOptimistic } from "react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { StatusForm } from "@/components/orders/status-form";
import { StatusBadge } from "@/components/orders/status-badge";
import { OrderItemsSummary } from "@/components/orders/order-items-summary";
import { statusPresentation } from "@/features/orders/presentation";
import type { Order } from "@/features/orders/domain";
import { formatVnd,formatDate } from "@/lib/format";
export function OrderRow({order:o,canWrite}:{order:Order;canWrite:boolean}){
 const [displayStatus,updateStatus]=useOptimistic(o.status);
 const saving=displayStatus!==o.status;
 const tone=statusPresentation[displayStatus]??statusPresentation.preparing;
 return <tr aria-busy={saving} className={"border-t border-stone-100 align-top transition-colors "+tone.row}>
 <td className="px-2 py-3"><Link href={"/orders/"+o.id} className="block max-w-full break-all font-semibold text-primary underline-offset-4 hover:underline">{o.order_code}</Link><p className="mt-2 text-xs text-stone-500">{o.ordered_on?formatDate(o.ordered_on+"T12:00:00+07:00"):"Chưa rõ ngày đặt"}</p></td>
 <td className="px-2 py-3"><p className="max-w-48 break-words font-medium">{o.customer_name}</p><p className="mt-2 text-xs text-stone-500">{o.phone||"Chưa có SĐT"}</p></td>
 <td className="min-w-0 px-2 py-3 text-xs"><OrderItemsSummary items={o.order_items}/></td>
 <td className="px-2 py-3"><p>{o.sales_platform==="tiktok"?"TikTok":o.sales_platform==="instagram"?"Instagram":"—"}</p><p className="mt-2 text-xs text-stone-500">{o.due_on?formatDate(o.due_on+"T12:00:00+07:00"):"Chưa hẹn"}</p></td>
 <td className="px-2 py-3">{o.buyer_link?<a href={o.buyer_link} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-primary underline">Mở link</a>:"—"}</td>
 <td className="whitespace-nowrap px-2 py-3 font-medium">{formatVnd(o.total_vnd)}</td>
 <td className="whitespace-nowrap px-2 py-3"><p>{formatVnd(o.paid_vnd)}</p><p className="mt-2 text-xs text-stone-600">Còn {formatVnd(o.remaining_vnd)}</p></td>
 <td className="min-w-0 px-2 py-3">{canWrite?<StatusForm key={o.version} id={o.id} version={o.version} status={o.status} onOptimisticStatus={updateStatus}/>:<StatusBadge status={displayStatus}/>}</td>
 <td className="px-2 py-3"><Link className="whitespace-nowrap text-xs underline" href={"/orders/"+o.id}>Chi tiết</Link>{canWrite&&o.status!=="cancelled"&&<Link className="mt-3 block text-xs underline" href={"/orders/"+o.id+"/edit"}>Chỉnh sửa</Link>}</td>
 </tr>;
}
