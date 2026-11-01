import { createHash } from 'node:crypto';

export function parseCsv(text) {
  const rows=[];let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';
    }else field+=c;
  }
  if(quoted)throw Error('CSV chưa đóng dấu ngoặc kép.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  const headers=rows.shift();if(!headers)throw Error('CSV trống.');
  return rows.map((cells,i)=>{
    if(cells.length!==headers.length)throw Error(`Dòng ${i+2}: số cột không khớp.`);
    return Object.fromEntries(headers.map((h,n)=>[h.trim(),cells[n].trim()]));
  });
}
export function parseMoney(value){
  if(!/^[\d.,\sđ₫]*$/iu.test(value))throw Error('Số tiền không hợp lệ.');
  const amount=Number(value.replace(/[^0-9]/g,''));
  if(!Number.isSafeInteger(amount)||amount>1000000000000)throw Error('Số tiền vượt giới hạn.');
  return amount;
}
export function dueDate(value){
  if(!value.trim())return null;
  const normalized=value.trim().replace(/^tt-/i,'').replace(/\/+ /g,'/').replace(/\/{2,}/g,'/');
  const match=normalized.match(/^(\d{1,2})\/(\d{1,2})$/);
  if(!match)throw Error('Ngày hẹn không hợp lệ.');
  const day=Number(match[1]),month=Number(match[2]),year=month>=10?2026:2027;
  const result=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const date=new Date(result+'T00:00:00Z');
  if(isNaN(date.valueOf())||date.toISOString().slice(0,10)!==result)throw Error('Ngày hẹn không tồn tại.');
  return result;
}
export function convertRows(rows,productType='finished_product'){
  if(!['diy_kit','finished_product'].includes(productType))throw Error('Loại sản phẩm phải là diy_kit hoặc finished_product.');
  return rows.map((row,index)=>{
    const productName=String(row['Phân loại']??'').trim();
    if(!String(row['Tên']??'').trim()&&!productName)return null;
    try{
      const price=parseMoney(row['Giá']??''),shipping=parseMoney(row.Ship??''),deposit=parseMoney(row['Đã cọc']??''),remaining=parseMoney(row['Còn lại']??'');
      const paid=price+shipping-remaining;
      if(paid<deposit||paid<0||remaining<0)throw Error('Cọc, còn lại và tổng đơn không khớp.');
      const address=String(row['Địa chỉ']??'');
      let customerName=String(row['Tên']??'').trim();
      if(!customerName){
        const contact=address.match(/^(?:tên\s*:\s*)?(.+?)(?=\s+(?:sđt|sdt|số điện thoại|phone)\s*[:：]|\s+(?:\+?84|0)\d{8,10}\b)/i);
        customerName=contact?.[1]?.replace(/^tên\s*:\s*/i,'').trim()??'';
      }
      let phone=String(row['SĐT']??'').trim();
      if(!phone)phone=address.match(/(?:\+84\d{9}|0\d{9})\b/)?.[0]??'';
      if(/^[35789]\d{8}$/.test(phone))phone='0'+phone;
      const hex=createHash('sha256').update('lthnk-csv-2026-t10:'+JSON.stringify(row)).digest('hex').slice(0,32).split('');
      hex[12]='5';hex[16]=((parseInt(hex[16],16)&3)|8).toString(16);
      const h=hex.join('');
      const request_id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
      const payload={request_id,ordered_on:null,customer_name:customerName,phone,address,shipping_vnd:shipping,discount_vnd:0,deposit_vnd:deposit,paid_vnd:paid,due_on:dueDate(row.z??row['']??row['Ngày hẹn']??''),notes:'Nhập CSV 2026 T10. Ngày đặt là ngày tạo đơn trong hệ thống (giờ Việt Nam). Trạng thái khởi tạo: Chưa Làm. Dữ liệu gốc: '+JSON.stringify(row),items:[{product_name:productName||'Sản phẩm handmade',product_type:productType,variant:row['Màu']??'',quantity:1,unit_price_vnd:price}]};
      if(payload.notes.length>2000)throw Error('Ghi chú dữ liệu gốc quá dài.');
      if(!payload.customer_name||!payload.items[0].product_name)throw Error('Thiếu tên khách hoặc sản phẩm.');
      return payload;
    }catch(error){throw Error(`Dòng ${index+2}: ${error.message}`);}
  }).filter(Boolean);
}

// Recover module setup without deleting tables, rows, sequence counters or functions.
export function prepareOrdersMigration(sql){
  return sql.replace(/^begin;\s*/,'').replace(/commit;\s*$/,'')
    .replace('create sequence public.order_code_seq;', 'create sequence if not exists public.order_code_seq;')
    .replace(/create table public\./g,'create table if not exists public.')
    .replace(/create index /g,'create index if not exists ')
    .replace(/create function public\./g,'create or replace function public.')
    .replace('drop constraint employee_permissions_permission_check;', 'drop constraint if exists employee_permissions_permission_check;')
    .replace(" execute format('create policy orders_read", " execute format('drop policy if exists orders_read on public.%I',t);\n execute format('create policy orders_read");
}
