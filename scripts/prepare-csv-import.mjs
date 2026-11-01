import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { parseCsv,convertRows,prepareOrdersMigration } from './lib/csv-orders.mjs';

const input=process.argv[2];
if(!input)throw Error('Cần đường dẫn CSV.');
const productType=process.argv[3]??'finished_product';
if(!['diy_kit','finished_product'].includes(productType))throw Error('Tham số loại sản phẩm phải là diy_kit hoặc finished_product.');
const payloads=convertRows(parseCsv(await readFile(input,'utf8')),productType);
const migration2=prepareOrdersMigration(await readFile(new URL('../supabase/migrations/202610310002_orders.sql',import.meta.url),'utf8'));
const migration3=(await readFile(new URL('../supabase/migrations/202610310003_incomplete_orders.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const migration4=(await readFile(new URL('../supabase/migrations/202610310004_order_default_preparing.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const migration5=(await readFile(new URL('../supabase/migrations/202610310005_order_three_stages.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const migration6=(await readFile(new URL('../supabase/migrations/202610310006_product_catalog.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const migration7=(await readFile(new URL('../supabase/migrations/202610310007_default_finished_products.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const migration8=(await readFile(new URL('../supabase/migrations/202610310008_revenue_dashboard.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const migration12=(await readFile(new URL('../supabase/migrations/202611010012_order_classification_buyer_link.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const migration13=(await readFile(new URL('../supabase/migrations/202611010013_remove_order_channel.sql',import.meta.url),'utf8')).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const data=JSON.stringify(payloads).replaceAll("'","''");
const sql=`-- PRIVATE: contains customer data. Run in Supabase SQL Editor.
-- Atomic, idempotent import. Does not overwrite existing orders.
begin;
do $setup$ begin
 -- Reconcile module objects even when setup was only partially completed.
 execute $lthnk_schema_20261031$${migration2}$lthnk_schema_20261031$;
end $setup$;
${migration3}
${migration4}
${migration5}
${migration6}
${migration7}
${migration8}
${migration12}
${migration13}
do $import$
declare owner_id uuid; record jsonb; item jsonb; pid uuid; imported integer:=0;
begin
 select id into owner_id from public.profiles where role='admin' and active order by created_at limit 1;
 if owner_id is null then raise exception 'No active owner';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 for record in select value from jsonb_array_elements('${data}'::jsonb) loop
 if nullif(record->>'due_on','') is not null and (record->>'due_on')::date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then
  record:=jsonb_set(record,'{ordered_on}','null'::jsonb);
 else
  record:=jsonb_set(record,'{ordered_on}',to_jsonb((now() at time zone 'Asia/Ho_Chi_Minh')::date::text));
 end if;
 for item in select value from jsonb_array_elements(record->'items') loop
 insert into public.products(name,product_type) values(item->>'product_name',item->>'product_type') on conflict(product_type,name) do nothing;
 select id into pid from public.products where name=item->>'product_name' and product_type=item->>'product_type';
 insert into public.product_variants(product_id,name,price_vnd) values(pid,coalesce(nullif(item->>'variant',''),'Mặc định'),(item->>'unit_price_vnd')::numeric) on conflict(product_id,name) do nothing;
 end loop;
 perform public.save_order(record,null,null);
 imported:=imported+1;
 end loop;
 raise notice 'Processed % orders (existing request IDs reused)',imported;
end $import$;
commit;
`;
const output=resolve(productType==='diy_kit'?'private-imports/lthnk-set-diy-2026.sql':'private-imports/lthnk-t10-2026.sql');
await mkdir(dirname(output),{recursive:true});await writeFile(output,sql,'utf8');
const summary={rows:payloads.length,subtotal:payloads.reduce((s,p)=>s+p.items[0].unit_price_vnd,0),shipping:payloads.reduce((s,p)=>s+p.shipping_vnd,0),paid:payloads.reduce((s,p)=>s+p.paid_vnd,0),remaining:payloads.reduce((s,p)=>s+p.items[0].unit_price_vnd+p.shipping_vnd-p.paid_vnd,0),missingPhone:payloads.filter(p=>!p.phone).length,missingAddress:payloads.filter(p=>!p.address).length,missingDue:payloads.filter(p=>!p.due_on).length,output};
console.log(JSON.stringify(summary,null,2));
