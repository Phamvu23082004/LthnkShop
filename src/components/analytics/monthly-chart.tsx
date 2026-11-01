"use client";
import { useState } from "react";
import { money,barPercent,type RevenueReport,type RevenueSeries } from "@/features/analytics/domain";
const labels:Record<RevenueSeries,string>={order_value:"Doanh số đơn hàng",received:"Đã thanh toán",deposits:"Tiền cọc (trong đã thanh toán)",outstanding:"Công nợ"};
export function MonthlyChart({months}:{months:RevenueReport["monthly"]}){
 const [series,setSeries]=useState<RevenueSeries>("order_value");const [selected,setSelected]=useState<string|null>(null);
 const max=months.reduce((v,m)=>BigInt(m[series])>BigInt(v)?m[series]:v,"0");
 const picked=months.find(m=>m.month===selected);
 return <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
 <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Doanh số theo tháng</h2><p className="mt-2 text-xs leading-6 text-stone-600">Theo tháng đặt đơn. Tiền cọc là một phần đã thanh toán, không cộng chồng.</p></div><label className="grid gap-2 text-xs">Chỉ số biểu đồ<select className="field" value={series} onChange={e=>setSeries(e.target.value as RevenueSeries)}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
 <div className="overflow-x-auto pb-2"><div className="flex h-64 items-end gap-3 border-b border-stone-200 px-2 pt-8" style={{minWidth:Math.max(280,months.length*64)}}>
 {months.map(m=><button type="button" key={m.month} onClick={()=>setSelected(m.month)} aria-pressed={selected===m.month} aria-label={m.month+": "+labels[series]+" "+money(m[series])} title={money(m[series])} className="group flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-3 rounded-t-lg focus-visible:outline-2 focus-visible:outline-primary">
 <span className="flex w-full max-w-12 flex-1 items-end justify-center"><span className={"block w-full rounded-t-md transition-colors "+(m.month===selected?"bg-[#714d3a]":"bg-primary/70 group-hover:bg-primary")} style={{height:barPercent(m[series],max)+"%"}}/></span><span className="whitespace-nowrap pb-3 text-[11px] text-stone-600">{m.month.slice(5)+"/"+m.month.slice(0,4)}</span>
 </button>)}</div></div>
 <p role="status" className="min-h-6 text-sm text-stone-700">{picked?picked.month.slice(5)+"/"+picked.month.slice(0,4)+" · "+labels[series]+": "+money(picked[series]):"Chọn một cột để xem số tiền chính xác."}</p>
 <details><summary className="cursor-pointer text-xs text-stone-600 underline">Xem bảng số liệu đầy đủ</summary><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><caption className="sr-only">Số liệu từng tháng trong bộ lọc</caption><thead><tr>{["Tháng","Doanh số","Đã thanh toán","Tiền cọc","Công nợ"].map(t=><th scope="col" key={t} className="border-b border-stone-200 p-3">{t}</th>)}</tr></thead><tbody>{months.map(m=><tr key={m.month}><th scope="row" className="p-3">{m.month.slice(5)+"/"+m.month.slice(0,4)}</th>{(["order_value","received","deposits","outstanding"] as const).map(k=><td key={k} className="whitespace-nowrap p-3">{money(m[k])}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
