import { test } from "node:test";
import assert from "node:assert/strict";
import { createAccountSchema,updateAccountSchema } from "../src/features/accounts/schema";
test("account creation rejects weak passwords and malformed identity",()=>{
 assert.equal(createAccountSchema.safeParse({fullName:"An",email:"an@example.com",password:"short"}).success,false);
 assert.equal(createAccountSchema.safeParse({fullName:"An",email:"invalid",password:"LongPassword123"}).success,false);
 assert.equal(createAccountSchema.safeParse({fullName:"An",email:"an@example.com",password:"LongPassword123"}).success,true);
});
test("account mutation rejects unknown capabilities and invalid role",()=>{
 const input={id:"10000000-0000-4000-8000-000000000001",fullName:"An",role:"staff",active:true,permissions:["orders.read"]};
 assert.equal(updateAccountSchema.safeParse(input).success,true);
 assert.equal(updateAccountSchema.safeParse({...input,permissions:["accounts.manage"]}).success,false);
 assert.equal(updateAccountSchema.safeParse({...input,role:"superuser"}).success,false);
});
