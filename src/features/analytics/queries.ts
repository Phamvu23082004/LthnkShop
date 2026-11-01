import "server-only";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { reportSchema } from "./domain";
import type { RevenueFilters } from "./filters";
export async function getRevenueReport(filters:RevenueFilters){
 await requirePermission("analytics.read");
 if(filters.error)return {report:null,needsMigration:false};
 const client=await createClient();
 const {data,error}=await client.rpc("get_revenue_dashboard",{start_date:filters.start,end_date:filters.end});
 if(error){if(["PGRST202","PGRST205","42883","42P01"].includes(error.code))return {report:null,needsMigration:true};throw new Error("Không tải được báo cáo doanh thu. Vui lòng thử lại.");}
 const report=reportSchema.parse(data);
 return {report,needsMigration:false};
}
