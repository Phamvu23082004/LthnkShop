import Link from "next/link";
import { getMyWorkDashboard } from "@/features/production/queries";
import { formatDate } from "@/lib/format";

const money=(value:string)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(BigInt(value));
const labels:Record<string,string>={draft:"Bản nháp",submitted:"Chờ duyệt",returned:"Cần chỉnh sửa",approved:"Đã duyệt"};
export async function EmployeeDashboard(){
 const {data,needsMigration}=await getMyWorkDashboard();
 return <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6" aria-label="Công việc và thu nhập của tôi">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Công việc & thu nhập của tôi</h2><p className="mt-1 text-sm text-stone-500">Các báo cáo sản lượng cá nhân và tiền công đã duyệt trong tháng.</p></div><Link href="/employees" className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Mở báo cáo sản lượng</Link></div>
  {needsMigration&&<p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Cần chạy migration <code>202610310009_handmade_payroll.sql</code> trong Supabase SQL Editor.</p>}
  {data&&<><div className="grid gap-3 sm:grid-cols-3"><article className="rounded-xl bg-[#f7f3ef] p-4"><p className="text-xs text-stone-600">Thu nhập đã duyệt · {data.month_label}</p><p className="mt-3 font-heading text-xl font-semibold">{money(data.approved_income)}</p></article><article className="rounded-xl bg-[#f7f3ef] p-4"><p className="text-xs text-stone-600">Phiếu đang chờ duyệt</p><p className="mt-3 font-heading text-xl font-semibold">{data.pending_reports}</p></article><article className="rounded-xl bg-[#f7f3ef] p-4"><p className="text-xs text-stone-600">Phiếu cần chỉnh sửa</p><p className="mt-3 font-heading text-xl font-semibold">{data.returned_reports}</p></article></div>
   <div><h3 className="mb-2 text-sm font-semibold">Hoạt động gần đây</h3>{data.reports.length===0?<p className="text-sm text-stone-500">Chưa có báo cáo. Bạn có thể tự tạo báo cáo sản lượng, không cần phiếu giao việc trước.</p>:<ul className="divide-y divide-stone-100">{data.reports.map(r=><li key={r.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{formatDate(r.completed_on)} · {labels[r.status]??r.status} · {r.reported_quantity} sản lượng</span><span className="font-medium">{Number(r.reviewed_lines)>0?money(r.earned):"Chưa tính công"}</span></li>)}</ul>}</div>
  </>}
 </section>;
}
