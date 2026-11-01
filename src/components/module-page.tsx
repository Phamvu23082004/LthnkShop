import Link from "next/link";
import { ArrowUpRight, Flower2 } from "lucide-react";
import { DateFilter } from "@/components/date-filter";
import { modules } from "@/lib/modules";
export function ModulePage({slug}:{slug:string}) {
 const sectionInfo=modules.find(m=>m.slug===slug)!; const overview=slug==="";
 return <div className="space-y-7"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-stone-500">LTHNK HANDMADE</p><h1 className="text-3xl font-bold md:text-4xl">{sectionInfo.title}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{sectionInfo.description}</p></div>
 <DateFilter/>
 {overview&&<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số tổng quan">{["Tiền đã thu","Tiền cọc đã nhận","Công nợ khách hàng","Đơn hàng trong kỳ"].map(label=><div key={label} className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-600">{label}</p><p className="my-4 font-heading text-3xl font-semibold">—</p><p className="text-xs text-stone-500">Chưa kết nối dữ liệu</p></div>)}</section>}
 <section className="rounded-2xl border border-stone-200 bg-white p-7 md:p-10"><div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[#F6EAED]"><Flower2 size={26}/></div><h2 className="text-xl font-bold">{overview?"Một khởi đầu ngăn nắp":"Không gian "+sectionInfo.title.toLocaleLowerCase("vi-VN")}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">{overview?"Các phân hệ đã có sẵn khung điều hướng. Kết nối Supabase và thiết lập tài khoản quản trị là bước tiếp theo.":"Trang chức năng đang được chuẩn bị. Dữ liệu, thao tác nghiệp vụ và phân quyền sẽ được triển khai theo lộ trình dự án."}</p><span className="mt-5 inline-block rounded-full border border-stone-200 px-3 py-1 text-xs">Giai đoạn 1 · Nền tảng giao diện</span></section>
 {overview&&<section><h2 className="mb-4 text-lg font-bold">Các phân hệ</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.slice(1).map(m=><Link href={"/"+m.slug} key={m.slug} className="group rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-primary"><div className="flex justify-between gap-3"><h3 className="font-bold">{m.title}</h3><ArrowUpRight size={18}/></div><p className="mt-3 text-sm leading-6 text-stone-600">{m.description}</p></Link>)}</div></section>}</div>;
}
