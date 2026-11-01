import { requireSession } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { RevenueDashboard } from "@/components/analytics/revenue-dashboard";
import { EmployeeDashboard } from "@/components/production/employee-dashboard";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {profile,grants}=await requireSession();
 const finance=canAccess(profile,grants,"analytics.read");
 return <div className="space-y-7"><header><p className="text-sm text-stone-500">Không gian làm việc · LTHNK Handmade</p><h1 className="mt-3 text-3xl font-semibold">Tổng quan</h1><p className="mt-3 text-sm text-stone-600">Chào {profile.full_name} · {profile.role==="admin"?"Chủ shop":"Nhân viên"}</p></header>
 {profile.role==="staff"&&<EmployeeDashboard/>}
 {finance&&<RevenueDashboard params={await searchParams} path="/"/>}
 </div>;
}
