import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { canAccess, type Permission, type Profile } from "./permissions";
export const getSession = cache(async () => {
 if(!hasSupabaseEnv()) return null;
 const client=await createClient();
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user) return null;
 const {data:profile,error:profileError}=await client.from("profiles").select("id,email,full_name,role,active,created_at,employee_permissions(permission)").eq("id",user.id).maybeSingle();
 if(profileError||!profile||!profile.active) return null;
 const {employee_permissions:grants,...account}=profile;
 return {user,profile:account as Profile,grants:(grants??[]).map(g=>g.permission as string)};
});
export async function requireSession() { const session=await getSession(); if(!session) redirect("/login"); return session; }
export async function requirePermission(permission:Permission) { const session=await requireSession(); if(!canAccess(session.profile,session.grants,permission)) redirect("/forbidden"); return session; }
export async function requireAdmin() { const session=await requireSession(); if(session.profile.role!=="admin") redirect("/forbidden"); return session; }
