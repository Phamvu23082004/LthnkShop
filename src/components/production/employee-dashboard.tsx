import Link from "next/link";
import { getStaffDashboard } from "@/features/production/dashboard";
import { businessToday } from "@/features/orders/domain";
import { formatDate } from "@/lib/format";

type Params = Record<string, string | string[] | undefined>;
const one = (params: Params, key: string) => typeof params[key] === "string" ? params[key] as string : "";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const nextDay = (day: string) => { const date = new Date(day + "T00:00:00Z"); date.setUTCDate(date.getUTCDate()+1); return date.toISOString().slice(0,10); };
const monthStart = (day: string) => day.slice(0,7) + "-01";
function period(params: Params, today: string) {
  const from = one(params,"from"), to = one(params,"to");
  if (datePattern.test(from) && datePattern.test(to) && from <= to) return { start: from, end: nextDay(to), from, to };
  const start = monthStart(today);
  return { start, end: nextDay(today), from: start, to: today };
}
const money = (value:string) => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(BigInt(value));
const labels:Record<string,string> = {draft:"Bản nháp",submitted:"Chờ duyệt",returned:"Cần chỉnh sửa",approved:"Đã duyệt"};
function quickRanges(today:string) {
  const d = new Date(today+"T00:00:00Z");
  const make=(start:Date,end:Date)=>({from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)});
  const first=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));
  const previousEnd=new Date(first.getTime()-86400000);
  const previousStart=new Date(Date.UTC(previousEnd.getUTCFullYear(),previousEnd.getUTCMonth(),1));
  const shift=(months:number)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-months+1,1));
  return [
    ["Tháng này",make(first,d)], ["Tháng trước",make(previousStart,previousEnd)],
    ["3 tháng",make(shift(2),d)], ["6 tháng",make(shift(5),d)],
    ["Năm nay",make(new Date(Date.UTC(d.getUTCFullYear(),0,1)),d)],
    ["Năm trước",make(new Date(Date.UTC(d.getUTCFullYear()-1,0,1)),new Date(Date.UTC(d.getUTCFullYear()-1,11,31)))],
  ] as const;
}
function change(current:string, previous:string) {
  const a=BigInt(current), b=BigInt(previous);
  if (b===0n) return a===0n ? "Không đổi so với kỳ trước" : "Có tăng so với kỳ trước";
  const pct=Number((a-b)*10000n/b)/100;
  return (pct>0?"+":"")+pct.toFixed(1)+"% so với kỳ trước";
}
export async function EmployeeDashboard({params}:{params:Params}) {
  const today=businessToday(), selected=period(params,today);
  const result=await getStaffDashboard({start:selected.start,end:selected.end});
  return <section className="space-y-6" aria-label="Dashboard công việc cá nhân">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-stone-500">Không gian làm việc · {selected.from.split("-").reverse().join("/")} – {selected.to.split("-").reverse().join("/")}</p><h2 className="mt-1 text-2xl font-semibold">Công việc & thu nhập của tôi</h2><p className="mt-2 text-sm text-stone-600">Chào bạn! Đây là kết quả cá nhân trong khoảng thời gian đã chọn.</p></div><Link href="/employees" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm">Báo cáo sản lượng</Link></header>
    <div className="flex flex-wrap gap-2">{quickRanges(today).map(([label,range])=><Link key={label} href={`/?from=${range.from}&to=${range.to}`} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-xs hover:bg-[#f3efea]">{label}</Link>)}</div>
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4"><label className="grid gap-1 text-xs text-stone-600">Từ ngày<input className="field" type="date" name="from" defaultValue={selected.from} required/></label><label className="grid gap-1 text-xs text-stone-600">Đến ngày<input className="field" type="date" name="to" defaultValue={selected.to} required/></label><button className="rounded-lg bg-primary px-4 py-3 text-sm text-white">Áp dụng</button><Link href="/" className="px-2 py-3 text-sm text-stone-600 underline">Đặt lại</Link></form>
    {result.needsMigration ? <p className="rounded-xl bg-amber-50 p-4 text-sm">Cần thiết lập dữ liệu báo cáo sản lượng.</p> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
        ["Thu nhập đã duyệt",money(result.summary.income),change(result.summary.income,result.summary.previousIncome)],
        ["Tổng sản lượng",result.summary.quantity,change(result.summary.quantity,result.summary.previousQuantity)],
        ["Phiếu đã duyệt",result.summary.approvedReports,"Trong khoảng đã chọn"],
        ["Phiếu chờ duyệt",result.summary.pendingReports,"Đang chờ quản lý duyệt"],
        ["Phiếu cần chỉnh sửa",result.summary.returnedReports,"Đang chờ bạn cập nhật"],
        ["Ngày có hoạt động",result.summary.activityDays,"Có ghi nhận sản lượng"],
      ].map(([label,value,hint])=><article key={label} className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-xs text-stone-500">{label}</p><p className="mt-3 break-words font-heading text-2xl font-semibold">{value}</p><p className="mt-2 text-xs text-stone-500">{hint}</p></article>)}</div>
      <div className="grid gap-5 xl:grid-cols-2">{([
        ["Thu nhập theo tháng",result.monthly.map(x=>({label:x.month.slice(5)+"/"+x.month.slice(0,4),value:x.income,detail:money(x.income),display:new Intl.NumberFormat("vi-VN",{notation:"compact",maximumFractionDigits:1}).format(BigInt(x.income))}))],
        ["Sản lượng theo tháng",result.monthly.map(x=>({label:x.month.slice(5)+"/"+x.month.slice(0,4),value:x.quantity,detail:x.quantity+" sản phẩm/bộ phận",display:new Intl.NumberFormat("vi-VN").format(BigInt(x.quantity))}))],
      ] as const).map(([title,items])=>{const max=items.reduce((v,x)=>BigInt(x.value)>v?BigInt(x.value):v,0n);return <section key={title} className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold">{title}</h3>{items.length===0?<p className="mt-5 text-sm text-stone-500">Chưa có dữ liệu trong khoảng này.</p>:<div className="mt-5 flex h-56 items-end gap-2 overflow-x-auto border-b border-stone-200 px-1">{items.map(x=><div key={x.label} title={x.label+" · "+x.detail} className="group flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-2"><div className="flex w-full flex-1 flex-col items-center justify-end"><span className="mb-1 whitespace-nowrap text-[10px] font-medium text-stone-600">{x.display}</span><div className="w-full max-w-12 rounded-t bg-primary/75 transition-colors group-hover:bg-primary" style={{height:(max===0n?0:Math.max(3,Number(BigInt(x.value)*100n/max)))+"%"}}/></div><span className="whitespace-nowrap text-[10px] text-stone-500">{x.label}</span></div>)}</div>}</section>})}</div>
      <div className="grid gap-5 xl:grid-cols-2">{[["Sản phẩm thực hiện nhiều nhất",result.products],["Bộ phận có sản lượng cao",result.components]].map(([title,rows])=><section key={title as string} className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold">{title as string}</h3>{(rows as {name:string;quantity:string}[]).length===0?<p className="mt-4 text-sm text-stone-500">Chưa có dữ liệu.</p>:<ul className="mt-4 divide-y divide-stone-100">{(rows as {name:string;quantity:string}[]).map(row=><li key={row.name} className="flex justify-between gap-3 py-2 text-sm"><span>{row.name}</span><strong>{row.quantity}</strong></li>)}</ul>}</section>)}</div>
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="p-5"><h3 className="font-semibold">So sánh theo tháng</h3><p className="mt-1 text-xs text-stone-500">Tiền công chỉ gồm các dòng đã được duyệt.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f3efea] text-xs"><tr><th className="p-3">Tháng</th><th className="p-3">Phiếu duyệt</th><th className="p-3">Sản lượng</th><th className="p-3">Thu nhập đã duyệt</th><th className="p-3">So với tháng trước</th></tr></thead><tbody>{result.monthly.map((row,index)=>{const previous=result.monthly[index-1];return <tr key={row.month} className="border-t border-stone-100"><th className="p-3 font-medium">{row.month.slice(5)+"/"+row.month.slice(0,4)}</th><td className="p-3">{row.reports}</td><td className="p-3">{row.quantity}</td><td className="p-3">{money(row.income)}</td><td className="p-3">{previous?change(row.income,previous.income):"—"}</td></tr>})}{result.monthly.length===0&&<tr><td colSpan={5} className="p-6 text-center text-stone-500">Chưa có dữ liệu theo tháng.</td></tr>}</tbody></table></div></section>      <section className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Hoạt động gần đây</h3><Link className="text-sm text-primary underline" href="/employees">Xem tất cả</Link></div>{result.reports.length===0?<p className="mt-4 text-sm text-stone-500">Chưa có báo cáo trong khoảng đã chọn.</p>:<ul className="mt-3 divide-y divide-stone-100">{result.reports.slice(0,10).map(report=><li key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{formatDate(report.completed_on)} · {labels[report.status]??report.status} · {report.productivity_report_lines.reduce((n,line)=>n+line.quantity,0)} sản lượng</span><span>{report.status==="approved"?money(report.productivity_report_lines.filter(line=>line.reviewed_at&&line.approved_quantity!==null&&line.approved_unit_rate_vnd!==null).reduce((sum,line)=>sum+BigInt(line.approved_quantity!)*BigInt(line.approved_unit_rate_vnd!),0n).toString()):"Chưa tính công"}</span></li>)}</ul>}</section>
    </>}
  </section>;
}