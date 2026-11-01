import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv,parseMoney,dueDate,convertRows } from "../scripts/lib/csv-orders.mjs";
import { orderSchema } from "../src/features/orders/schema";

test("CSV handles quoted commas, embedded newlines and escaped quotes",()=>{
  assert.deepEqual(parseCsv('name,address\r\nA,"one, two\nthree ""quoted"""'),[{name:"A",address:'one, two\nthree "quoted"'}]);
  assert.throws(()=>parseCsv('name,address\nA,"unfinished'));
  assert.throws(()=>parseCsv('name,address\nA'));
});
test("legacy Vietnamese money and confirmed due-date conventions",()=>{
  assert.equal(parseMoney("1.130,000 đ"),1130000);
  assert.equal(parseMoney("0,000 đ"),0);
  assert.throws(()=>parseMoney("-1 đ"));
  assert.equal(dueDate("11//11"),"2026-11-11");
  assert.equal(dueDate("tt-24/11"),"2026-11-24");
  assert.equal(dueDate("20/1"),"2027-01-20");
  assert.equal(dueDate(""),null);
  assert.throws(()=>dueDate("31/11"));
});
test("import preserves unknown facts, reconciles balances and generates stable IDs",()=>{
  const row={z:"20/1","Tên":"Khách thử",Link:"Ig","SĐT":"","Địa chỉ":"","Phân loại":"Twinkle","Màu":"Flower","Tình trạng":"FALSE","Giá":"280,000 đ",Ship:"15,000 đ","Đã cọc":"150,000 đ","Còn lại":"145,000 đ"};
  const [order]=convertRows([row]);
  assert.equal(order.ordered_on,null);assert.equal(order.phone,"");assert.equal(order.address,"");
  assert.equal(order.paid_vnd,150000);assert.equal(order.due_on,"2027-01-20");
  assert.equal(orderSchema.safeParse(order).success,true);
  assert.equal(convertRows([row])[0].request_id,order.request_id);
  assert.throws(()=>convertRows([{...row,"Còn lại":"290,000 đ"}]));
});
test("CSV import accepts a whole-file DIY or handmade product type",()=>{
 const row={z:"20/1","Tên":"Khách thử",Link:"Ig","SĐT":"","Địa chỉ":"","Phân loại":"Flower","Màu":"2 kim","Giá":"99,000 đ",Ship:"15,000 đ","Đã cọc":"0 đ","Còn lại":"114,000 đ"};
 assert.equal(convertRows([row],"diy_kit")[0].items[0].product_type,"diy_kit");
 assert.equal(convertRows([row])[0].items[0].product_type,"finished_product");
 assert.throws(()=>convertRows([row],"unknown"));
});
test("CSV import skips blank separators and reads a missing customer name from the address",()=>{
 const separator={z:"", "Tên":"", "SĐT":"", "Địa chỉ":"", "Phân loại":"", "Màu":"", "Giá":"", Ship:"", "Đã cọc":"", "Còn lại":"0,000 đ"};
 const contact={z:"18/10", "Tên":"", Link:"tt", "SĐT":"", "Địa chỉ":"Tên: Phạm Huyền My sdt: 0866015607 Địa chỉ: Thôn Kon Trang Kla", "Phân loại":"Flower", "Màu":"", "Giá":"99,000 đ", Ship:"15,000 đ", "Đã cọc":"0,000 đ", "Còn lại":"114,000 đ"};
 const converted=convertRows([separator,contact],"diy_kit");
 assert.equal(converted.length,1);assert.equal(converted[0].customer_name,"Phạm Huyền My");assert.equal(converted[0].phone,"0866015607");
});
