begin;

-- Store newly entered sizes as digits while matching legacy values such as "40cm".
create or replace function public.save_handmade_piece_rate(target_id uuid,component uuid,selected_product uuid,piece_size text,rate_vnd numeric,is_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; product text; normalized_size text;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 normalized_size:=trim(coalesce(piece_size,''));
 if component is null or not exists(select 1 from public.handmade_components where id=component)
 or selected_product is null or normalized_size !~ '^[0-9]{1,3}$'
 or rate_vnd is null or rate_vnd not between 0 and 1000000000 or rate_vnd<>trunc(rate_vnd) or is_active is null then
  raise exception 'invalid wage rate' using errcode='22023';
 end if;
 select name into product from public.products where id=selected_product;
 if not found then raise exception 'product not found' using errcode='P0002';end if;
 if target_id is null then
  select id into result_id from public.handmade_piece_rates
  where component_id=component and product_id=selected_product
    and regexp_replace(lower(trim(size)),'[^0-9]','','g')=normalized_size
  order by (size=normalized_size) desc limit 1 for update;
  if result_id is null then
   insert into public.handmade_piece_rates(component_id,product_id,product_name,size,unit_rate_vnd,active,updated_by)
   values(component,selected_product,product,normalized_size,rate_vnd,is_active,auth.uid()) returning id into result_id;
  else
   update public.handmade_piece_rates set product_name=product,size=normalized_size,unit_rate_vnd=rate_vnd,
    active=is_active,updated_by=auth.uid(),updated_at=now() where id=result_id;
  end if;
 else
  update public.handmade_piece_rates set component_id=component,product_id=selected_product,product_name=product,
   size=normalized_size,unit_rate_vnd=rate_vnd,active=is_active,updated_by=auth.uid(),updated_at=now()
  where id=target_id returning id into result_id;
  if result_id is null then raise exception 'rate not found' using errcode='P0002';end if;
 end if;
 return result_id;
end $$;

-- Normalize the report's numeric size against existing price rows that may include "cm".
do $normalize_report_rate$ declare definition text;
begin
 select pg_get_functiondef('public.save_productivity_report(jsonb,uuid,integer,boolean)'::regprocedure) into definition;
 definition:=replace(definition,
  'and size=line_row.size and active;',
  'and regexp_replace(lower(trim(size)),''[^0-9]'','''',''g'')=trim(line_row.size) and active;');
 definition:=replace(definition,
  'if char_length(trim(coalesce(item->>''size'',''''))) not between 1 and 80 or char_length(trim(coalesce(item->>''component_color'','''')))>100 then raise exception ''invalid size or component color'' using errcode=''22023'';end if;',
  'if coalesce(item->>''size'','''') !~ ''^[0-9]{1,3}$'' or char_length(trim(coalesce(item->>''component_color'','''')))>100 then raise exception ''invalid size or component color'' using errcode=''22023'';end if;');
 execute definition;
end $normalize_report_rate$;

commit;