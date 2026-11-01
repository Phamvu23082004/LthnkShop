import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmployeeWorkspace } from "@/components/production/employee-workspace";
import { businessToday } from "@/features/orders/domain";
import { parseFilters } from "@/features/orders/filters";

type Params=Record<string,string|string[]|undefined>;
const one=(v:string|string[]|undefined)=>typeof v==="string"?v:"";
const missingCodes=["PGRST202","PGRST205","42883","42P01"];
export default async function Page({searchParams}:{searchParams:Promise<Params>}){
 const {profile}=await requirePermission("employees.read");
 const params=await searchParams;const today=businessToday();
 const mode=one(params.pay_mode)||"month";
 const payrollFilters=parseFilters({mode,value:one(params.pay_value)||today.slice(0,7),from:one(params.pay_from),to:one(params.pay_to)});
 const reportMode=one(params.report_mode)||"all";
 const reportFilters=parseFilters({mode:reportMode,value:one(params.report_value)||today,from:one(params.report_from),to:one(params.report_to)});
 const client=await createClient();
 let reportQuery=client.from("productivity_reports").select("id,employee_id,completed_on,status,notes,return_reason,version,created_at").order("completed_on",{ascending:false}).order("created_at",{ascending:false}).limit(100);
 if(reportFilters.start&&reportFilters.end&&!one(params.edit)) reportQuery=reportQuery.gte("completed_on",reportFilters.start).lt("completed_on",reportFilters.end);
 let entryQuery=client.from("payroll_entries").select("id,employee_id,period_month,entry_type,amount_vnd,notes,created_at").order("created_at",{ascending:false}).limit(300);
 if(payrollFilters.start&&payrollFilters.end){
  const startMonth=payrollFilters.start.slice(0,7)+"-01";
  const lastDay=new Date(payrollFilters.end+"T00:00:00Z");lastDay.setUTCDate(lastDay.getUTCDate()-1);lastDay.setUTCDate(1);lastDay.setUTCMonth(lastDay.getUTCMonth()+1);
  entryQuery=entryQuery.gte("period_month",startMonth).lt("period_month",lastDay.toISOString().slice(0,10));
 }
 const [componentResult,rateResult,reportResult,lineResult,productResult,staffResult,payrollResult,entryResult]=await Promise.all([
  client.from("handmade_components").select("id,name,active,sort_order").order("sort_order").order("name"),
  client.from("handmade_piece_rates").select("id,component_id,product_id,product_name,size,unit_rate_vnd,active").order("product_name").order("size"),
  reportQuery,
  client.from("productivity_report_lines").select("id,report_id,component_id,component_name,product_id,variant_id,product_name,variant_name,component_color,size,quantity,rate_snapshot_vnd,approved_quantity,approved_unit_rate_vnd,reviewed_at").order("created_at"),
  client.from("products").select("id,name,product_type,active,product_variants(id,product_id,name,price_vnd,active)").order("name"),
  profile.role==="admin"?client.from("profiles").select("id,full_name").eq("role","staff").order("full_name"):Promise.resolve({data:[],error:null}),
  profile.role==="admin"&&!payrollFilters.error?client.rpc("get_payroll_summary",{start_date:payrollFilters.start??"2000-01-01",end_date:payrollFilters.end??"2101-01-01"}):Promise.resolve({data:[],error:null}),
  profile.role==="admin"?entryQuery:Promise.resolve({data:[],error:null})
 ]);
 const queryErrors=[componentResult.error,rateResult.error,reportResult.error,lineResult.error,productResult.error,payrollResult.error,entryResult.error].filter(Boolean);
 const needsMigration=queryErrors.some(e=>missingCodes.includes(e!.code));
 if(queryErrors.length&&!needsMigration)throw new Error("Không tải được dữ liệu báo cáo sản lượng và bảng lương.");
 const components=(componentResult.data??[]) as {id:string;name:string;active:boolean;sort_order:number}[];
 const rates=(rateResult.data??[]) as {id:string;component_id:string;product_id:string;product_name:string;size:string;unit_rate_vnd:number;active:boolean}[];
 const products=(productResult.data??[]) as {id:string;name:string;product_type:string;active:boolean;product_variants:{id:string;product_id:string;name:string;price_vnd:number;active:boolean}[]}[];
 const staff=(staffResult.data??[]) as {id:string;full_name:string}[];
 const staffNames=new Map(staff.map(s=>[s.id,s.full_name]));
 const lines=(lineResult.data??[]) as {id:string;report_id:string;component_id:string;component_name:string;product_id:string;variant_id:string;product_name:string;variant_name:string;component_color:string;size:string;quantity:number;rate_snapshot_vnd:number|null;approved_quantity:number|null;approved_unit_rate_vnd:number|null;reviewed_at:string|null}[];
 const reports=((reportResult.data??[]) as {id:string;employee_id:string;completed_on:string;status:string;notes:string;return_reason:string;version:number}[]).map(r=>({ ...r,employee_name:r.employee_id===profile.id?profile.full_name:staffNames.get(r.employee_id),productivity_report_lines:lines.filter(l=>l.report_id===r.id) }));
 const payroll=(Array.isArray(payrollResult.data)?payrollResult.data:[]) as {employee_id:string;employee_name:string;earned:string;advances:string;bonuses:string;allowances:string;payments:string;remaining:string}[];
 const entries=((entryResult.data??[]) as {id:string;employee_id:string;period_month:string;entry_type:string;amount_vnd:string|number;notes:string;created_at:string}[]).map(e=>({...e,employee_name:staffNames.get(e.employee_id)}));
 const period=one(params.pay_value)||today.slice(0,7);
 return <div className="space-y-7"><header><p className="text-xs uppercase tracking-[.2em] text-stone-500">LTHNK HANDMADE</p><h1 className="mt-2 text-3xl font-semibold">Sản lượng & bảng lương</h1><p className="mt-3 text-sm leading-7 text-stone-600">Ghi nhận sản phẩm handmade hoàn thành, duyệt theo từng bộ phận và đối soát tiền công.</p></header>{needsMigration?<section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900"><h2 className="font-semibold">Cần thiết lập báo cáo sản lượng</h2><p className="mt-2">Chạy migration <code>202610310009_handmade_payroll.sql</code> trong Supabase SQL Editor, sau đó tải lại trang.</p></section>:payrollFilters.error&&profile.role==="admin"?<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{payrollFilters.error}</p>:<EmployeeWorkspace isAdmin={profile.role==="admin"} components={components} products={products} rates={rates} reports={reports} staff={staff} payroll={payroll} entries={entries} today={today} period={period} reportFilterError={reportFilters.error}/>}</div>;
}
