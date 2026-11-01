import { test } from "node:test";
import assert from "node:assert/strict";
import { bootstrapHandler,type BootstrapDependencies } from "../src/features/setup/handler";
const token="a".repeat(64);
function fixture(overrides:Partial<BootstrapDependencies>={}){
 const calls:string[]=[];
 const deps:BootstrapDependencies={
 hasOwner:async()=>false,
 createUser:async()=>{calls.push("create");return {id:"new-id"};},
 activateOwner:async()=>{calls.push("activate");return {};},
 deleteUser:async()=>{calls.push("delete");return {};},
 ...overrides
 };return {deps,calls};
}
function request(body:unknown={fullName:"Chủ Shop",email:"owner@example.com",password:"PrivatePassword123!"},secret=token){
 return new Request("http://localhost/api/setup/owner",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+secret},body:JSON.stringify(body)});
}
test("setup stays closed without token and rejects incorrect token before database calls",async()=>{
 const {deps,calls}=fixture();
 assert.equal((await bootstrapHandler(()=>deps,undefined)(request())).status,404);
 assert.equal((await bootstrapHandler(()=>deps,token)(request(undefined,"bad"))).status,401);
 assert.deepEqual(calls,[]);
});
test("setup creates one owner and never returns credentials",async()=>{
 const {deps,calls}=fixture();const response=await bootstrapHandler(()=>deps,token)(request());
 assert.equal(response.status,201);assert.deepEqual(calls,["create","activate"]);
 const text=await response.text();assert.ok(!text.includes("PrivatePassword123!"));assert.ok(!text.includes(token));
});
test("existing owner prevents new Auth account",async()=>{
 const {deps,calls}=fixture({hasOwner:async()=>true});
 assert.equal((await bootstrapHandler(()=>deps,token)(request())).status,409);assert.deepEqual(calls,[]);
});
test("failed activation compensates by deleting only the newly created Auth account",async()=>{
 const {deps,calls}=fixture({activateOwner:async()=>({error:true})});
 assert.equal((await bootstrapHandler(()=>deps,token)(request())).status,409);
 assert.deepEqual(calls,["create","delete"]);
});
test("setup rejects caller-supplied roles, weak passwords, invalid JSON and large bodies",async()=>{
 const {deps,calls}=fixture();const handle=bootstrapHandler(()=>deps,token);
 assert.equal((await handle(request({fullName:"Owner",email:"owner@example.com",password:"PrivatePassword123!",role:"admin"}))).status,400);
 assert.equal((await handle(request({fullName:"Owner",email:"owner@example.com",password:"weak"}))).status,400);
 assert.equal((await handle(request("x".repeat(5000)))).status,413);
 assert.equal((await handle(new Request("http://localhost/api/setup/owner",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:"{"}))).status,400);
 assert.deepEqual(calls,[]);
});
test("database failure returns safe failure without raw error details",async()=>{
 const {deps}=fixture({hasOwner:async()=>{throw Error("sensitive details");}});
 const response=await bootstrapHandler(()=>deps,token)(request());
 assert.equal(response.status,503);assert.ok(!(await response.text()).includes("sensitive"));
});
