import "server-only";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function getMyWorkDashboard() {
  await requirePermission("employees.read");
  const client=await createClient();
  const {data,error}=await client.rpc("get_my_work_dashboard");
  if(error){if(["PGRST202","PGRST205","42883","42P01"].includes(error.code))return {data:null,needsMigration:true};throw new Error("Không tải được thông tin công việc cá nhân.");}
  return {data:data as {pending_reports:string;returned_reports:string;approved_income:string;month_label:string;reports:{id:string;completed_on:string;status:string;notes:string;return_reason:string;reported_quantity:string;approved_quantity:string;reviewed_lines:string;earned:string}[]},needsMigration:false};
}
