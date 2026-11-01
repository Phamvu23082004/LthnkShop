import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";
export function createAdminClient() {
 const {url}=supabaseEnv(); const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key) throw new Error("Chưa cấu hình khóa quản trị Supabase");
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
