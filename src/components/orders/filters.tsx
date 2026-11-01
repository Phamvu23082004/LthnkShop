"use client";
import { useState } from "react";
import Link from "next/link";
import Form from "next/form";
import { statuses,statusLabels } from "@/features/orders/domain";
import type { Filters } from "@/features/orders/filters";
import { Button } from "@/components/ui/button";
export function OrderFilters({filters:f}:{filters:Filters}){
 const [mode,setMode]=useState(f.mode);
 return <Form action="/orders" scroll={false} className="grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
 <input type="hidden" name="order_type" value={f.order_type}/>
 <label className="grid min-w-0 gap-2 text-xs sm:col-span-2 xl:col-span-2">Tìm đơn<input className="field w-full min-w-0" name="q" defaultValue={f.q} maxLength={100} placeholder="Mã đơn, khách, SĐT, sản phẩm…"/></label>
 <label className="grid min-w-0 gap-2 text-xs">Trạng thái<select className="field" name="status" defaultValue={f.status}><option value="">Tất cả</option>{statuses.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
 <label className="grid min-w-0 gap-2 text-xs">Lọc theo ngày<select className="field" name="dateField" defaultValue={f.dateField}><option value="ordered_on">Ngày đặt</option><option value="due_on">Ngày trả đơn</option></select></label><label className="grid min-w-0 gap-2 text-xs">Xem theo<select className="field" name="mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="all">Tất cả thời gian</option><option value="day">Theo ngày</option><option value="month">Theo tháng</option><option value="year">Theo năm</option><option value="custom">Khoảng ngày</option></select></label>
 {mode!=="all"&&mode!=="custom"&&<label className="grid min-w-0 gap-2 text-xs">Thời gian<input key={mode} type={mode==="day"?"date":mode==="month"?"month":"number"} className="field" name="value" defaultValue={f.mode===mode?f.value:""} min={mode==="year"?2000:undefined} max={mode==="year"?2100:undefined} required/></label>}
 {mode==="custom"&&<><label className="grid min-w-0 gap-2 text-xs">Từ ngày<input className="field" name="from" type="date" defaultValue={f.from} required/></label><label className="grid min-w-0 gap-2 text-xs">Đến ngày<input className="field" name="to" type="date" defaultValue={f.to} required/></label></>}
 <label className="grid min-w-0 gap-2 text-xs">Nền tảng<select className="field" name="sales_platform" defaultValue={f.sales_platform}><option value="">Tất cả nền tảng</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option></select></label>
 <label className="grid min-w-0 gap-2 text-xs">Sắp xếp<select className="field" name="sort" defaultValue={f.sort}><option value="due_asc">Ngày trả đơn gần nhất</option><option value="due_desc">Ngày trả đơn xa nhất</option><option value="newest">Ngày đặt mới nhất</option></select></label><div className="grid min-w-0 grid-cols-1 gap-2 self-end sm:col-span-2 sm:flex sm:flex-wrap sm:items-center xl:col-span-4"><Button className="w-full min-w-0 whitespace-normal text-center sm:w-auto">Lọc</Button><Link href={f.order_type==="all"?"/orders":"/orders?order_type="+f.order_type} className="inline-flex min-h-11 w-full min-w-0 items-center justify-center whitespace-normal rounded-[10px] border border-stone-300 bg-white px-4 py-2 text-center text-sm sm:min-h-11 sm:w-auto">Xóa bộ lọc</Link></div>
 </Form>;
}
