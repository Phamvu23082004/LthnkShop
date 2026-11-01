begin;

create or replace function public.save_catalog_variants(payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; variant_item jsonb; variant_name text; price numeric; enabled boolean; n integer:=0;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object'
  or jsonb_typeof(payload->'variants') is distinct from 'array'
  or jsonb_array_length(payload->'variants') not between 1 and 50 then
  raise exception 'invalid catalog variants' using errcode='22023';
 end if;

 pid:=nullif(payload->>'product_id','')::uuid;
 if pid is null then
  if char_length(trim(coalesce(payload->>'product_name',''))) not between 1 and 200
   or coalesce(payload->>'product_type','') not in ('diy_kit','finished_product') then
   raise exception 'invalid product' using errcode='22023';
  end if;
  insert into public.products(name,product_type)
  values(trim(payload->>'product_name'),payload->>'product_type')
  on conflict(product_type,name) do nothing;
  select id into pid from public.products
  where name=trim(payload->>'product_name') and product_type=payload->>'product_type' for update;
 else
  perform 1 from public.products where id=pid for update;
  if not found then raise exception 'product not found' using errcode='P0002';end if;
 end if;

 for variant_item in select value from jsonb_array_elements(payload->'variants') loop
  if jsonb_typeof(variant_item) is distinct from 'object'
   or char_length(trim(coalesce(variant_item->>'name',''))) not between 1 and 200
   or jsonb_typeof(variant_item->'price_vnd') is distinct from 'number'
   or coalesce(variant_item->>'price_vnd','') !~ '^[0-9]+$'
   or jsonb_typeof(variant_item->'active') is distinct from 'boolean' then
   raise exception 'invalid catalog variant' using errcode='22023';
  end if;
  variant_name:=trim(variant_item->>'name');
  price:=(variant_item->>'price_vnd')::numeric;
  enabled:=(variant_item->>'active')::boolean;
  if price not between 0 and 1000000000 then raise exception 'invalid price' using errcode='22023';end if;
  insert into public.product_variants(product_id,name,price_vnd,active)
  values(pid,variant_name,price,enabled);
  insert into public.account_audit(actor_id,target_id,action,details)
  values(auth.uid(),pid,'catalog.variant.created',jsonb_build_object('name',variant_name,'price_vnd',price,'active',enabled));
  n:=n+1;
 end loop;
 return pid;
end $$;
revoke all on function public.save_catalog_variants(jsonb) from public,anon;
grant execute on function public.save_catalog_variants(jsonb) to authenticated;

commit;
