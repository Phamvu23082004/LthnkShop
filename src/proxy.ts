import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabaseEnv } from "@/lib/supabase/env";
export async function proxy(request:NextRequest) {
 if(request.nextUrl.pathname==="/api/setup/owner") return NextResponse.next();
 let response=NextResponse.next({request});
 response.headers.set("Cache-Control","private, no-store");
 if(!hasSupabaseEnv()) return response;
 const {url,key}=supabaseEnv();
 const client=createServerClient(url,key,{cookies:{
 getAll:()=>request.cookies.getAll(),
 setAll(values) {
 values.forEach(({name,value})=>request.cookies.set(name,value));
 response=NextResponse.next({request});
 values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
 response.headers.set("Cache-Control","private, no-store");
 }}});
 // Verify JWT and refresh cookies here; getSession still calls getUser and reads current DB permissions.
 const {data,error}=await client.auth.getClaims();
 const publicRoute=request.nextUrl.pathname==="/login";
 if((error||!data?.claims?.sub)&&!publicRoute) {
 const target=new URL("/login",request.url); const redirectResponse=NextResponse.redirect(target);
 response.cookies.getAll().forEach(cookie=>redirectResponse.cookies.set(cookie));
 redirectResponse.headers.set("Cache-Control","private, no-store");
 return redirectResponse;
 }
 return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
