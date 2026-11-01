import { test } from "node:test";
import assert from "node:assert/strict";
import { totals,statuses } from "../src/features/orders/domain";
import { orderSchema } from "../src/features/orders/schema";
import { parseFilters,pageHref,orderFiltersHref } from "../src/features/orders/filters";
const line={product_name:"Set len",product_type:"diy_kit" as const,variant:"Kem",quantity:2,unit_price_vnd:205000};
const input={request_id:"10000000-0000-4000-8000-000000000001",ordered_on:"2026-10-31",customer_name:"Khách",phone:"0901234567",address:"Hà Nội",channel:"Tại shop",shipping_vnd:30000,discount_vnd:10000,deposit_vnd:100000,paid_vnd:200000,due_on:null,notes:"",items:[line]};
test("deposit is included in paid, not counted twice",()=>{
 assert.deepEqual(totals([line],30000,10000,100000,200000),{subtotal:410000,total:430000,remaining:230000});
 assert.throws(()=>totals([line],0,500000,0,0));
 assert.throws(()=>totals([line],0,0,200000,100000));
 assert.throws(()=>totals([line],0,0,0,500000));
 assert.throws(()=>totals([{quantity:1.5,unit_price_vnd:100}],0,0,0,0));
});
test("order validation enforces multiple lines, real dates and money bounds",()=>{
 assert.equal(orderSchema.safeParse({...input,items:[line,{...line,product_type:"finished_product"}]}).success,true);
 for(const patch of [{items:[]},{ordered_on:"2026-02-30"},{due_on:"2026-01-01"},{paid_vnd:999999},{items:[{...line,quantity:0}]},{shipping_vnd:0.5}])
 assert.equal(orderSchema.safeParse({...input,...patch}).success,false);
});
test("calendar filters include boundaries and reject invalid ranges",()=>{
 assert.deepEqual([parseFilters({mode:"month",value:"2024-02"}).start,parseFilters({mode:"month",value:"2024-02"}).end],["2024-02-01","2024-03-01"]);
 assert.equal(parseFilters({mode:"day",value:"2026-12-31"}).end,"2027-01-01");
 assert.equal(parseFilters({mode:"year",value:"2026"}).end,"2027-01-01");
 assert.equal(parseFilters({mode:"custom",from:"2026-10-01",to:"2026-10-31"}).end,"2026-11-01");
 assert.ok(parseFilters({mode:"custom",from:"2026-10-31",to:"2026-10-01"}).error);
 assert.ok(parseFilters({mode:"day",value:"2026-02-30"}).error);
});

test("three work stages and sorting survive filtering and pagination",()=>{
 assert.deepEqual(statuses,["preparing","producing","completed"]);
 assert.equal(parseFilters({}).sort,"due_asc");
 assert.equal(parseFilters({sort:"invalid"}).sort,"due_asc");
 const f=parseFilters({sort:"due_desc",dateField:"due_on",mode:"month",value:"2026-11",status:"producing"});
 const url=new URL(pageHref(f,2),"http://localhost");
 assert.equal(url.searchParams.get("sort"),"due_desc");
 assert.equal(url.searchParams.get("dateField"),"due_on");
 assert.equal(url.searchParams.get("page"),"2");
 assert.equal(url.searchParams.get("status"),"producing");
 assert.ok(parseFilters({status:"shipping"}).error);
});
test("order categories change immediately while applied platform and auxiliary filters survive",()=>{
 const filters=parseFilters({order_type:"diy_kit",sales_platform:"tiktok",status:"preparing",mode:"month",value:"2026-10",q:"Twinkle",page:"4"});
 assert.equal(filters.order_type,"diy_kit");assert.equal(filters.sales_platform,"tiktok");
 const categoryUrl=new URL(orderFiltersHref(filters,"finished_product"),"https://example.test");
 assert.equal(categoryUrl.searchParams.get("order_type"),"finished_product");
 assert.equal(categoryUrl.searchParams.get("sales_platform"),"tiktok");
 assert.equal(categoryUrl.searchParams.get("status"),"preparing");
 assert.equal(categoryUrl.searchParams.get("q"),"Twinkle");
 assert.equal(categoryUrl.searchParams.has("page"),false);
 const nextPage=new URL(pageHref(filters,2),"https://example.test");
 assert.equal(nextPage.searchParams.get("order_type"),"diy_kit");assert.equal(nextPage.searchParams.get("sales_platform"),"tiktok");
 assert.equal(nextPage.searchParams.get("page"),"2");
});
test("buyer URLs are optional and restricted to HTTP(S)",()=>{
 assert.equal(orderSchema.safeParse(input).success,true);
 assert.equal(orderSchema.safeParse({...input,buyer_link:"https://instagram.com/customer"}).success,true);
 assert.equal(orderSchema.safeParse({...input,buyer_link:"javascript:alert(1)"}).success,false);
});
