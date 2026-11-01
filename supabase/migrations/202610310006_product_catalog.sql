begin;
create table if not exists public.products(
 id uuid primary key default gen_random_uuid(),name text not null check(char_length(trim(name)) between 1 and 200),
 product_type text not null check(product_type in ('diy_kit','finished_product')),
 active boolean not null default true,created_at timestamptz not null default now(),unique(product_type,name)
);
create table if not exists public.product_variants(
 id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id),
 name text not null check(char_length(trim(name)) between 1 and 200),
 price_vnd numeric(18,0) not null check(price_vnd between 0 and 1000000000),
 active boolean not null default true,created_at timestamptz not null default now(),unique(product_id,name),unique(id,product_id)
);
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
revoke all on public.products,public.product_variants from anon,authenticated;
grant select on public.products,public.product_variants to authenticated;
drop policy if exists catalog_read on public.products;
create policy catalog_read on public.products for select to authenticated using(private.has_permission('orders.read'));
drop policy if exists catalog_read on public.product_variants;
create policy catalog_read on public.product_variants for select to authenticated using(private.has_permission('orders.read'));
alter table public.order_items add column if not exists product_id uuid references public.products(id);
alter table public.order_items add column if not exists variant_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.order_items'::regclass and conname='order_items_variant_product_fk') then
 alter table public.order_items add constraint order_items_variant_product_fk foreign key(variant_id,product_id) references public.product_variants(id,product_id);
 end if;
end $$;
insert into public.products(name,product_type)
select distinct product_name,product_type from public.order_items on conflict(product_type,name) do nothing;
insert into public.product_variants(product_id,name,price_vnd)
select distinct on(p.id,coalesce(nullif(i.variant,''),'Mặc định')) p.id,coalesce(nullif(i.variant,''),'Mặc định'),i.unit_price_vnd
from public.order_items i join public.products p on p.name=i.product_name and p.product_type=i.product_type
join public.orders o on o.id=i.order_id
order by p.id,coalesce(nullif(i.variant,''),'Mặc định'),o.created_at desc,i.id
on conflict(product_id,name) do nothing;
update public.order_items i set product_id=p.id,variant_id=v.id
from public.products p join public.product_variants v on v.product_id=p.id
where i.product_id is null and p.name=i.product_name and p.product_type=i.product_type and v.name=coalesce(nullif(i.variant,''),'Mặc định');

create or replace function public.save_catalog_variant(payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare pid uuid;vid uuid;amount numeric;enabled boolean;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if jsonb_typeof(payload->'price_vnd') is distinct from 'number' or coalesce(payload->>'price_vnd','')!~'^[0-9]+$'
 or char_length(trim(coalesce(payload->>'variant_name',''))) not between 1 and 200
 or jsonb_typeof(payload->'active') is distinct from 'boolean' then raise exception 'invalid catalog input' using errcode='22023';end if;
 amount:=(payload->>'price_vnd')::numeric;enabled:=(payload->>'active')::boolean;
 if amount not between 0 and 1000000000 then raise exception 'invalid price' using errcode='22023';end if;
 pid:=nullif(payload->>'product_id','')::uuid;vid:=nullif(payload->>'variant_id','')::uuid;
 if pid is null then
 if vid is not null or char_length(trim(coalesce(payload->>'product_name',''))) not between 1 and 200
 or coalesce(payload->>'product_type','') not in ('diy_kit','finished_product') then raise exception 'invalid product' using errcode='22023';end if;
 insert into public.products(name,product_type) values(trim(payload->>'product_name'),payload->>'product_type')
 on conflict(product_type,name) do nothing;
 select id into pid from public.products where name=trim(payload->>'product_name') and product_type=payload->>'product_type';
 else
 perform 1 from public.products where id=pid;
 if not found then raise exception 'invalid product' using errcode='23503';end if;
 end if;
 if vid is null then
 insert into public.product_variants(product_id,name,price_vnd,active)
 values(pid,trim(payload->>'variant_name'),amount,enabled) returning id into vid;
 else
 update public.product_variants set name=trim(payload->>'variant_name'),price_vnd=amount,active=enabled where id=vid and product_id=pid;
 if not found then raise exception 'variant does not belong to product' using errcode='23503';end if;
 end if;
 insert into public.account_audit(actor_id,target_id,action,details)
 values(auth.uid(),vid,'catalog.variant.saved',jsonb_build_object('product_id',pid,'price_vnd',amount,'active',enabled));
 return vid;
end $$;
revoke all on function public.save_catalog_variant(jsonb) from public,anon;
grant execute on function public.save_catalog_variant(jsonb) to authenticated;

-- Keep the existing transactional implementation private; the public wrapper
-- validates the selected product/color before writing its immutable snapshots.
do $catalog_wrapper$
declare definition text;
begin
 if to_regprocedure('private.save_order_snapshot(jsonb,uuid,integer)') is null then
 alter function public.save_order(jsonb,uuid,integer) rename to save_order_snapshot;
 alter function public.save_order_snapshot(jsonb,uuid,integer) set schema private;
 end if;
 select pg_get_functiondef('private.save_order_snapshot(jsonb,uuid,integer)'::regprocedure) into definition;
 definition:=replace(definition,'(order_id,position,product_name,product_type,variant,quantity,unit_price_vnd)',
 '(order_id,position,product_id,variant_id,product_name,product_type,variant,quantity,unit_price_vnd)');
 definition:=replace(definition,'values(result_id,seq,trim(row_item->>''product_name'')',
 'values(result_id,seq,(row_item->>''product_id'')::uuid,(row_item->>''variant_id'')::uuid,trim(row_item->>''product_name'')');
 execute definition;
end $catalog_wrapper$;
revoke all on function private.save_order_snapshot(jsonb,uuid,integer) from public,anon,authenticated;

create or replace function public.save_order(payload jsonb,target_id uuid default null,expected_version integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare entry jsonb;canonical jsonb:='[]'::jsonb;chosen record;snapshot record;prior public.orders%rowtype;result uuid;
begin
 if not(private.has_permission('orders.read') and private.has_permission('orders.write')) then raise exception 'forbidden' using errcode='42501';end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'invalid items' using errcode='22023';end if;
 if jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'invalid items' using errcode='22023';end if;
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
 -- Legacy imports and existing drafts can resolve exact catalog snapshots.
 select v.id,v.product_id,v.name as variant_name,v.price_vnd,v.active as variant_active,p.name,p.product_type,p.active as product_active
 into chosen from public.product_variants v join public.products p on p.id=v.product_id
 where p.name=entry->>'product_name' and p.product_type=entry->>'product_type' and v.name=coalesce(nullif(entry->>'variant',''),'Mặc định') for share of p,v;
 end if;
 if not found then raise exception 'catalog selection not found' using errcode='23503';end if;
 if nullif(entry->>'product_id','') is not null and (entry->>'product_id')::uuid<>chosen.product_id
 then raise exception 'variant does not belong to product' using errcode='23503';end if;
 if (not chosen.variant_active or not chosen.product_active) and not exists(
 select 1 from public.order_items where order_id=target_id and variant_id=chosen.id)
 then raise exception 'catalog selection inactive' using errcode='23514';end if;
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
 result:=private.save_order_snapshot(jsonb_set(payload,'{items}',canonical),target_id,expected_version);
 return result;
end $$;
revoke all on function public.save_order(jsonb,uuid,integer) from public,anon;
grant execute on function public.save_order(jsonb,uuid,integer) to authenticated;
commit;
