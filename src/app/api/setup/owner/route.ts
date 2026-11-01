import { createAdminClient } from "@/lib/supabase/admin";
import { bootstrapHandler } from "@/features/setup/handler";
export const runtime="nodejs";
export async function POST(request:Request) {
 return bootstrapHandler(()=>{
 const admin=createAdminClient();
 return {
 async hasOwner(){
 const {data,error}=await admin.from("profiles").select("id").eq("role","admin").limit(1);
 if(error)throw new Error("Owner lookup failed");return Boolean(data?.length);
 },
 async createUser(input){
 const {data,error}=await admin.auth.admin.createUser({email:input.email,password:input.password,email_confirm:true,user_metadata:{full_name:input.fullName}});
 return {id:data.user?.id,error:Boolean(error)};
 },
 async activateOwner(id,name){
 const {error}=await admin.rpc("bootstrap_owner",{target_id:id,owner_name:name});return {error:Boolean(error)};
 },
 async deleteUser(id){const {error}=await admin.auth.admin.deleteUser(id);return {error:Boolean(error)};}
 };
 },process.env.BOOTSTRAP_TOKEN)(request);
}
