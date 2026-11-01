import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVariant,linkExistingItem } from "../src/features/catalog/selection";
import type { Product } from "../src/features/catalog/types";
const products:Product[]=[
 {id:"p1",name:"Twinkle",product_type:"finished_product",active:true,product_variants:[{id:"v1",product_id:"p1",name:"Hồng",price_vnd:720000,active:true},{id:"v2",product_id:"p1",name:"Kem",price_vnd:600000,active:false}]},
 {id:"p2",name:"DIY",product_type:"diy_kit",active:true,product_variants:[{id:"v3",product_id:"p2",name:"Nâu",price_vnd:100000,active:true}]}
];
test("selection chooses product-specific variant and fills its default price",()=>{
 const line=pickVariant(products,"p1","v1",2);
 assert.equal(line.variant,"Hồng");assert.equal(line.unit_price_vnd,720000);assert.equal(line.quantity,2);
 assert.throws(()=>pickVariant(products,"p1","v3"));assert.throws(()=>pickVariant(products,"p1","v2"));
});
test("linking existing order preserves historical price and labels",()=>{
 const old={product_name:"Twinkle",product_type:"finished_product" as const,variant:"Hồng",quantity:1,unit_price_vnd:500000};
 const line=linkExistingItem(old,products);
 assert.equal(line.product_id,"p1");assert.equal(line.variant_id,"v1");assert.equal(line.unit_price_vnd,500000);
});
