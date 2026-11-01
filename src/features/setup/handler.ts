import { createHash,timingSafeEqual } from "node:crypto";
import { createAccountSchema } from "../accounts/schema";
type Result={error?:boolean;id?:string};
export type BootstrapDependencies={
 hasOwner:()=>Promise<boolean>;
 createUser:(input:{email:string;password:string;fullName:string})=>Promise<Result>;
 activateOwner:(id:string,name:string)=>Promise<Result>;
 deleteUser:(id:string)=>Promise<Result>;
};
const reply=(status:number,message:string)=>Response.json({message},{status,headers:{"Cache-Control":"no-store"}});
export function bootstrapHandler(dependencies:()=>BootstrapDependencies,token:string|undefined) {
 return async (request:Request):Promise<Response>=>{
 if(!token||token.length<32) return reply(404,"API thiết lập chưa được bật.");
 const supplied=request.headers.get("authorization")??"";
 const digest=(value:string)=>createHash("sha256").update(value).digest();
 if(!timingSafeEqual(digest(supplied),digest("Bearer "+token))) return reply(401,"Mã thiết lập không hợp lệ.");
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply(415,"Yêu cầu dùng application/json.");
 try{
 const reader=request.body?.getReader();if(!reader)return reply(400,"Thiếu dữ liệu.");
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return reply(413,"Dữ liệu quá lớn.");}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let input:unknown;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,"JSON không hợp lệ.");}
 const parsed=createAccountSchema.strict().safeParse(input);
 if(!parsed.success)return reply(400,"Cần fullName, email hợp lệ và password dài 12–128 ký tự gồm chữ và số.");
 const db=dependencies();
 if(await db.hasOwner())return reply(409,"Đã có chủ shop. Hãy đăng nhập để tạo thêm tài khoản.");
 const created=await db.createUser({...parsed.data,email:parsed.data.email.toLowerCase()});
 if(created.error||!created.id)return reply(409,"Không thể tạo tài khoản. Email có thể đã tồn tại.");
 const activation=await db.activateOwner(created.id,parsed.data.fullName);
 if(activation.error){
 const cleanup=await db.deleteUser(created.id);
 return reply(409,cleanup.error?"Thiết lập thất bại; tài khoản tạo dở vẫn bị khóa. Kiểm tra Supabase trước khi thử lại.":"Thiết lập không thành công hoặc đã có chủ shop; tài khoản mới đã được hoàn tác.");
 }
 return reply(201,"Đã tạo chủ shop. Bạn có thể đăng nhập; hãy xóa BOOTSTRAP_TOKEN khỏi cấu hình.");
 }catch{return reply(503,"Không thể thiết lập. Kiểm tra kết nối, biến môi trường và migration Supabase.");}
 };
}
