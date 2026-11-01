import { getRevenueReport } from "@/features/analytics/queries";
import { parseRevenueFilters } from "@/features/analytics/filters";
import { money,quantity,barPercent } from "@/features/analytics/domain";
import { businessToday,productLabels } from "@/features/orders/domain";
import { RevenueFilter } from "./filters";
import { MonthlyChart } from "./monthly-chart";
import { ShoppingBag,Clock3,CheckCheck,Wallet,HandCoins,ReceiptText,Coins,ChartNoAxesCombined } from "lucide-react";
type Params=Record<string,string|string[]|undefined>;
export async function RevenueDashboard({params,path}:{params:Params;path:string}){
 const filters=parseRevenueFilters(params);const {report,needsMigration}=await getRevenueReport(filters);
 const s=report?.summary;
 const activePaid=s?(BigInt(s.received)-BigInt(s.cancelled_received)).toString():"0";
 const cards=s?[
 {label:"Tổng đơn hàng",value:quantity(s.orders),hint:"Gồm cả đơn đã hủy",Icon:ShoppingBag},
 {label:"Đơn đang xử lý",value:quantity(s.processing),hint:"Chưa Làm và Đang Làm",Icon:Clock3},
 {label:"Đơn hoàn thành",value:quantity(s.completed),hint:"Trạng thái Hoàn Thành",Icon:CheckCheck},
 {label:"Doanh số đơn hàng",value:money(s.order_value),hint:"Sau giảm giá, gồm ship; trừ đơn hủy",Icon:ChartNoAxesCombined},
 {label:"Tổng tiền thực thu",value:money(s.received),hint:"Tổng đã thanh toán, đã bao gồm cọc",Icon:Wallet},
 {label:"Tiền cọc đã nhận",value:money(s.deposits),hint:"Một phần của thực thu, không cộng thêm",Icon:HandCoins},
 {label:"Công nợ khách hàng",value:money(s.outstanding),hint:"Còn lại của các đơn chưa hủy",Icon:ReceiptText},
 {label:"Doanh số hoàn thành",value:money(s.completed_value),hint:"Giá trị các đơn đã Hoàn Thành",Icon:Coins},
 ]:[];
 return <section className="space-y-6" aria-label="Dashboard và doanh thu">
 <RevenueFilter key={JSON.stringify([filters.mode,filters.value,filters.from,filters.to])} filters={filters} path={path} today={businessToday()}/>
 <p className="text-sm font-medium text-stone-600">{filters.label}</p>
 <div className="rounded-xl border border-stone-200 bg-[#f3efea] p-4 text-xs leading-6 text-stone-700">Các chỉ số dựa trên nhóm đơn có ngày đặt trong kỳ. Thực thu và tiền cọc là tổng đã ghi nhận hiện tại của nhóm đơn này; chưa phải dòng tiền thu theo ngày thanh toán. Giá trị đơn hàng khác với tiền đã thu.</div>
 {filters.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{filters.error}</p>}
 {needsMigration&&<section className="rounded-2xl border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">Cần thiết lập báo cáo doanh thu</h2><p className="mt-3 text-sm leading-7">Chạy migration <code>202610310008_revenue_dashboard.sql</code> trong Supabase SQL Editor, sau đó tải lại trang.</p></section>}
 {report&&s&&<>
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,hint,Icon})=><article key={label} className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xs font-medium text-stone-600">{label}</h2><Icon aria-hidden="true" size={18} className="shrink-0 text-primary"/></div><p className="my-5 break-words font-heading text-2xl font-semibold tracking-tight">{value}</p><p className="text-[11px] leading-6 text-stone-500">{hint}</p></article>)}</div>
 {s.orders==="0"&&<p role="status" className="rounded-xl bg-white p-5 text-sm">Chưa có đơn hàng trong khoảng đã chọn.</p>}
 {(s.undated!=="0"||report.excluded_undated!=="0")&&<p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">{report.excluded_undated!=="0"?quantity(report.excluded_undated)+" đơn chưa có ngày đặt không được tính trong khoảng đã chọn.":quantity(s.undated)+" đơn chưa có ngày đặt được tính trong tổng tất cả thời gian, nhưng không nằm trên biểu đồ tháng."}</p>}
 <MonthlyChart months={report.monthly}/>
 <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="p-6"><h2 className="text-xl font-semibold">Sản phẩm bán chạy</h2><p className="mt-2 text-xs leading-6 text-stone-500">Top 10 theo số lượng; không tính đơn hủy. Tiền hàng chưa trừ giảm giá, chưa gồm ship.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[450px] text-left text-sm"><thead className="bg-[#f3efea] text-xs"><tr>{["Sản phẩm","Số lượng","Tiền hàng"].map(t=><th key={t} scope="col" className="p-4">{t}</th>)}</tr></thead><tbody>{report.bestsellers.map((p,n)=><tr key={p.product_type+"-"+p.product_name} className="border-t border-stone-100"><td className="p-4"><p className="font-medium"><span className="mr-2 text-xs text-stone-400">{n+1}.</span>{p.product_name}</p><p className="mt-2 text-xs text-stone-500">{productLabels[p.product_type]}</p></td><td className="p-4">{quantity(p.quantity)}</td><td className="whitespace-nowrap p-4">{money(p.item_value)}</td></tr>)}{report.bestsellers.length===0&&<tr><td colSpan={3} className="p-8 text-center text-stone-500">Chưa có sản phẩm bán trong kỳ.</td></tr>}</tbody></table></div></section>
 <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6"><h2 className="text-xl font-semibold">Đối soát tiền</h2><p className="text-xs leading-6 text-stone-600">Các đơn chưa hủy: tiền đã thanh toán + công nợ = doanh số đơn hàng.</p><div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-primary" style={{width:barPercent(activePaid,s.order_value)+"%"}}/></div><dl className="space-y-4 text-sm">{[["Đã thu · đơn chưa hủy",activePaid],["Công nợ còn lại",s.outstanding],["Giá trị đơn chưa hủy",s.order_value]].map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-semibold">{money(value)}</dd></div>)}</dl>
 <div className="border-t border-stone-200 pt-5"><p className="text-xs leading-6 text-stone-600">{quantity(s.cancelled)} đơn đã hủy · Tiền đã thu còn ghi nhận: <strong>{money(s.cancelled_received)}</strong>. Số tiền này vẫn nằm trong tổng thực thu, được tách khỏi doanh số và công nợ. Hủy đơn không tự hoàn tiền.</p></div></section></div>
 </>}
 </section>;
}
