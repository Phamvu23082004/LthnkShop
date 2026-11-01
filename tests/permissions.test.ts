import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccess,permissionForRoute } from "../src/lib/auth/permissions";
test("staff requires explicit capability; inactive users never pass",()=>{
 assert.equal(canAccess({role:"staff",active:true},[],"orders.read"),false);
 assert.equal(canAccess({role:"staff",active:true},["orders.read"],"orders.read"),true);
 assert.equal(canAccess({role:"staff",active:false},["orders.read"],"orders.read"),false);
 assert.equal(canAccess({role:"admin",active:false},[],"analytics.read"),false);
 assert.equal(canAccess({role:"admin",active:true},[],"analytics.read"),true);
});
test("route matching covers nested routes without matching unrelated prefixes",()=>{
 assert.equal(permissionForRoute("/accounts/123"),"admin");
 assert.equal(permissionForRoute("/accounts-other"),undefined);
 assert.equal(permissionForRoute("/orders/123/edit"),"orders.read");
 assert.equal(permissionForRoute("/yarn"),"inventory.read");
 assert.equal(permissionForRoute("/account"),undefined);
});
