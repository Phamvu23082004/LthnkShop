// Run with: node --env-file=.env.local scripts/bootstrap-owner.mjs
// Reads credentials interactively; password input is hidden and never saved.
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
let hidden=false;
const output=new Writable({write(chunk,encoding,callback){if(!hidden) process.stdout.write(chunk,encoding);callback();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
try {
 if(!url||!key) throw new Error("Thiếu URL hoặc service-role key trong .env.local.");
 const email=(await rl.question("Email chủ shop: ")).trim().toLowerCase();
 const name=(await rl.question("Họ tên chủ shop: ")).trim();
 process.stdout.write("Mật khẩu (ít nhất 12 ký tự gồm chữ và số; nhập ẩn): ");
 hidden=true;const password=await rl.question("");hidden=false;process.stdout.write("\n");
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||name.length<2||name.length>100||password.length<12||password.length>128||!/[a-zA-Z]/.test(password)||!/[0-9]/.test(password)) throw new Error("Thông tin không hợp lệ.");
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
 if(error||!data.user) throw new Error("Không tạo được tài khoản. Kiểm tra email đã tồn tại, migration và cấu hình.");
 const {error:bootstrapError}=await admin.rpc("bootstrap_owner",{target_id:data.user.id,owner_name:name});
 if(bootstrapError) {
 const {error:cleanup}=await admin.auth.admin.deleteUser(data.user.id);
 throw new Error(cleanup?"Thiết lập thất bại; tài khoản tạo dở vẫn bị khóa. Kiểm tra Supabase.":"Chưa thiết lập được chủ shop; đã hoàn tác tài khoản mới. Có thể đã có chủ shop.");
 }
 console.log("Đã tạo chủ shop. Bạn có thể đăng nhập bằng tài khoản vừa nhập.");
} catch(error) {console.error(error instanceof Error?error.message:"Thiết lập thất bại.");process.exitCode=1;}
finally {hidden=false;rl.close();}
