"use client";
import { useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RevenueFilters } from "@/features/analytics/filters";
export function RevenueFilter({filters:f,path,today}:{filters:RevenueFilters;path:string;today:string}){
 const [mode,setMode]=useState(f.mode);
 const defaultValue=f.mode===mode?f.value:mode==="day"?today:mode==="month"?today.slice(0,7):today.slice(0,4);
 return <Form action={path} scroll={false} className="grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
 <label className="grid min-w-0 gap-2 text-xs">Xem theo<select className="field" name="mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="day">Ngày</option><option value="month">Tháng</option><option value="year">Năm</option><option value="custom">Khoảng ngày</option><option value="all">Tất cả thời gian</option></select></label>
 {["day","month","year"].includes(mode)&&<label className="grid min-w-0 gap-2 text-xs">Thời gian<input key={mode} className="field" name="value" type={mode==="day"?"date":mode==="month"?"month":"number"} defaultValue={defaultValue} min={mode==="year"?2000:undefined} max={mode==="year"?2100:undefined} required/></label>}
 {mode==="custom"&&<><label className="grid min-w-0 gap-2 text-xs">Từ ngày<input className="field" name="from" type="date" defaultValue={f.from||today} required/></label><label className="grid min-w-0 gap-2 text-xs">Đến ngày<input className="field" name="to" type="date" defaultValue={f.to||today} required/></label></>}
 <div className="grid grid-cols-1 gap-2 self-end sm:flex sm:items-center"><Button className="w-full sm:w-auto">Áp dụng</Button><Link className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-stone-300 bg-white px-4 py-2 text-sm sm:w-auto" href={path}>Tháng hiện tại</Link></div><p className="self-center text-xs text-stone-500 xl:col-span-2">Lọc theo ngày đặt đơn · giờ Việt Nam</p>
 </Form>;
}
