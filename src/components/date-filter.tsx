"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function DateFilter() {
 const [period,setPeriod]=useState("month");
 return <fieldset className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4">
 <legend className="sr-only">Khoảng thời gian</legend>
 <label className="grid gap-1 text-xs text-stone-600">Xem theo<select className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-foreground" value={period} onChange={e=>setPeriod(e.target.value)}><option value="day">Ngày</option><option value="month">Tháng</option><option value="year">Năm</option><option value="custom">Tùy chọn</option></select></label>
 {period==="custom"?<><label className="grid gap-1 text-xs">Từ ngày<input className="min-h-10 rounded-lg border border-stone-300 px-3" type="date"/></label><label className="grid gap-1 text-xs">Đến ngày<input className="min-h-10 rounded-lg border border-stone-300 px-3" type="date"/></label></>:<label className="grid gap-1 text-xs text-stone-600">Thời gian<input key={period} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm" type={period==="day"?"date":period==="month"?"month":"number"} min={period==="year"?2000:undefined} max={period==="year"?2100:undefined} placeholder={period==="year"?"YYYY":undefined}/></label>}
 <Button disabled title="Sẽ kết nối dữ liệu ở giai đoạn tiếp theo">Áp dụng</Button><p className="self-center text-xs text-stone-500">Bộ lọc giao diện · chưa kết nối dữ liệu</p>
 </fieldset>;
}
