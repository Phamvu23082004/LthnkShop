import { requireSession } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { RevenueDashboard } from "@/components/analytics/revenue-dashboard";
import { EmployeeDashboard } from "@/components/production/employee-dashboard";
type Params = Record<string,string|string[]|undefined>;
export default async function Page({searchParams}:{searchParams:Promise<Params>}){
 const {profile,grants}=await requireSession();
 const params=await searchParams;
 const finance=canAccess(profile,grants,"analytics.read");
 return <div className="space-y-7"><header><p className="text-sm text-stone-500">Không gian làm việc · LTHNK Handmade</p><h1 className="mt-3 text-3xl font-semibold">Tổng quan</h1><p className="mt-3 text-sm text-stone-600">Chào {profile.full_name} · {profile.role==="admin"?"Chủ shop":"Nhân viên"}</p></header>
 {profile.role==="staff"&&<EmployeeDashboard params={params}/>}
 {finance&&<RevenueDashboard params={params} path="/"/>}
 </div>;
}
