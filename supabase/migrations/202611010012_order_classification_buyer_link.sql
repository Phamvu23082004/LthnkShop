begin;

-- Legacy orders remain NULL so the new category tabs do not guess their type.
alter table public.orders add column if not exists order_type text;
alter table public.orders add column if not exists sales_platform text;
alter table public.orders add column if not exists buyer_link text;

do $order_metadata_constraints$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.orders'::regclass and conname='orders_order_type_check') then
  alter table public.orders add constraint orders_order_type_check
   check(order_type is null or order_type in ('diy_kit','finished_product'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.orders'::regclass and conname='orders_sales_platform_check') then
  alter table public.orders add constraint orders_sales_platform_check
   check(sales_platform is null or sales_platform in ('tiktok','instagram'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.orders'::regclass and conname='orders_buyer_link_check') then
  alter table public.orders add constraint orders_buyer_link_check
   check(buyer_link is null or (char_length(buyer_link)<=2000 and buyer_link ~* '^https?://[^/?#[:space:]]+([/?#][^[:space:]]*)?$'));
 end if;
end
$order_metadata_constraints$;

-- Backfill only values that can be inferred without guessing.
with homogeneous_orders as (
 select order_id,min(product_type) as order_type
 from public.order_items
 group by order_id
 having min(product_type)=max(product_type)
)
update public.orders o set order_type=h.order_type
from homogeneous_orders h
where o.id=h.order_id and o.order_type is null;

do $backfill_sales_platform$
begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='channel') then
  update public.orders
  set sales_platform=case lower(trim(channel)) when 'tiktok' then 'tiktok' when 'instagram' then 'instagram' end
  where sales_platform is null and lower(trim(channel)) in ('tiktok','instagram');
 end if;
end
$backfill_sales_platform$;

create index if not exists orders_type_platform_date_idx
 on public.orders(order_type,sales_platform,ordered_on desc,created_at desc,id);

-- Extend the existing private transactional writer without changing its order,
-- item, revision, status history, permission, or idempotency behavior.
do $extend_order_snapshot$
declare definition text;
begin
 select pg_get_functiondef('private.save_order_snapshot(jsonb,uuid,integer)'::regprocedure) into definition;
 if position('buyer_link' in definition)=0 then
  definition:=replace(definition,
   'due_on,notes,created_by,search_text)',
   'due_on,notes,buyer_link,sales_platform,order_type,created_by,search_text)');
  definition:=replace(definition,
   'coalesce(payload->>''notes'',''''),auth.uid(),search_value)',
   'coalesce(payload->>''notes'',''''),nullif(trim(payload->>''buyer_link''),''''),nullif(payload->>''sales_platform'',''''),payload->>''order_type'',auth.uid(),search_value)');
  definition:=replace(definition,
   'notes=coalesce(payload->>''notes'',''''),'||E'\n'||' search_text=search_value',
   'notes=coalesce(payload->>''notes'',''''),buyer_link=nullif(trim(payload->>''buyer_link''),''''),sales_platform=nullif(payload->>''sales_platform'',''''),order_type=payload->>''order_type'','||E'\n'||' search_text=search_value');
  definition:=replace(definition,
   'payload->>''channel'','||E'\n'||' (select string_agg',
   'payload->>''channel'',payload->>''buyer_link'','||E'\n'||' (select string_agg');
  if position('buyer_link' in definition)=0 or position('sales_platform' in definition)=0 or position('order_type' in definition)=0 then
   raise exception 'Could not extend private.save_order_snapshot; inspect its current definition before applying this migration';
  end if;
  execute definition;
 end if;
end
$extend_order_snapshot$;

create or replace function public.save_order(payload jsonb,target_id uuid default null,expected_version integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare entry jsonb;canonical jsonb:='[]'::jsonb;chosen record;snapshot record;prior public.orders%rowtype;result uuid;
        order_category text;category_max text;buyer_url text;platform text;
begin
 if not(private.has_permission('orders.read') and private.has_permission('orders.write')) then raise exception 'forbidden' using errcode='42501';end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'invalid items' using errcode='22023';end if;
 if jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'invalid items' using errcode='22023';end if;
 platform:=nullif(payload->>'sales_platform','');
 if platform is not null and platform not in ('tiktok','instagram') then raise exception 'invalid sales platform' using errcode='22023';end if;
 buyer_url:=nullif(trim(payload->>'buyer_link'),'');
 if buyer_url is not null and (char_length(buyer_url)>2000 or buyer_url !~* '^https?://[^/?#[:space:]]+([/?#][^[:space:]]*)?$') then
  raise exception 'invalid buyer URL' using errcode='22023';
 end if;
 if target_id is null then
  perform pg_catalog.pg_advisory_xact_lock(hashtextextended((payload->>'request_id')::uuid::text,0));
  select * into prior from public.orders where request_id=(payload->>'request_id')::uuid;
  if found then
   if prior.created_by<>auth.uid() then raise exception 'forbidden' using errcode='42501';end if;
   return prior.id;
  end if;
 else
  perform 1 from public.orders where id=target_id for update;
 end if;
 for entry in select value from jsonb_array_elements(payload->'items') loop
  if nullif(entry->>'variant_id','') is not null then
   select v.id,v.product_id,v.name as variant_name,v.price_vnd,v.active as variant_active,p.name,p.product_type,p.active as product_active
    into chosen from public.product_variants v join public.products p on p.id=v.product_id where v.id=(entry->>'variant_id')::uuid for share of p,v;
  else
   select v.id,v.product_id,v.name as variant_name,v.price_vnd,v.active as variant_active,p.name,p.product_type,p.active as product_active
    into chosen from public.product_variants v join public.products p on p.id=v.product_id
    where p.name=entry->>'product_name' and p.product_type=entry->>'product_type' and v.name=coalesce(nullif(entry->>'variant',''),'Mặc định') for share of p,v;
  end if;
  if not found then raise exception 'catalog selection not found' using errcode='23503';end if;
  if nullif(entry->>'product_id','') is not null and (entry->>'product_id')::uuid<>chosen.product_id then
   raise exception 'variant does not belong to product' using errcode='23503';
  end if;
  if (not chosen.variant_active or not chosen.product_active) and not exists(
   select 1 from public.order_items where order_id=target_id and variant_id=chosen.id) then
   raise exception 'catalog selection inactive' using errcode='23514';
  end if;
  if target_id is not null then
   select product_name,product_type,variant into snapshot from public.order_items
    where order_id=target_id and variant_id=chosen.id order by position limit 1;
   if found then chosen.name:=snapshot.product_name;chosen.product_type:=snapshot.product_type;chosen.variant_name:=snapshot.variant;end if;
  end if;
  canonical:=canonical||jsonb_build_array(entry||jsonb_build_object(
   'product_id',chosen.product_id,'variant_id',chosen.id,'product_name',chosen.name,
   'product_type',chosen.product_type,'variant',chosen.variant_name,
   'unit_price_vnd',coalesce(entry->'unit_price_vnd',to_jsonb(chosen.price_vnd))));
 end loop;
 select min(value->>'product_type'),max(value->>'product_type') into order_category,category_max
  from jsonb_array_elements(canonical) as item(value);
 if order_category is distinct from category_max then order_category:=null;end if;
 payload:=jsonb_set(payload,'{items}',canonical,true);
 payload:=jsonb_set(payload,'{order_type}',coalesce(to_jsonb(order_category),'null'::jsonb),true);
 payload:=jsonb_set(payload,'{sales_platform}',coalesce(to_jsonb(platform),'null'::jsonb),true);
 payload:=jsonb_set(payload,'{buyer_link}',coalesce(to_jsonb(buyer_url),'null'::jsonb),true);
 result:=private.save_order_snapshot(payload,target_id,expected_version);
 return result;
end $$;
revoke all on function public.save_order(jsonb,uuid,integer) from public,anon;
grant execute on function public.save_order(jsonb,uuid,integer) to authenticated;

commit;
