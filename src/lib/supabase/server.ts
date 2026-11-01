import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";
export async function createClient() {
 const {url,key}=supabaseEnv(); const store=await cookies();
 return createServerClient(url,key,{cookies:{
 getAll:()=>store.getAll(),
 setAll(values){try { for(const {name,value,options} of values) store.set(name,value,options); } catch { /* Read-only Server Component; proxy refreshes session cookies. */ }}
 }});
}
