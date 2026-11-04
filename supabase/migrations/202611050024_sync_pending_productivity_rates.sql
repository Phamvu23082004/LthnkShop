begin;

create or replace function public.save_handmade_piece_rate(
 target_id uuid,
 component uuid,
 selected_product uuid,
 piece_size text,
 rate_vnd numeric,
 is_active boolean
)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; product text;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if component is null or not exists(select 1 from public.handmade_components where id=component) or selected_product is null
 or char_length(trim(coalesce(piece_size,''))) not between 1 and 80 or rate_vnd is null or rate_vnd not between 0 and 1000000000 or rate_vnd<>trunc(rate_vnd) or is_active is null then raise exception 'invalid wage rate' using errcode='22023';end if;
 select name into product from public.products where id=selected_product;
 if not found then raise exception 'product not found' using errcode='P0002';end if;

 if target_id is null then
  insert into public.handmade_piece_rates(component_id,product_id,product_name,size,unit_rate_vnd,active,updated_by)
  values(component,selected_product,product,trim(piece_size),rate_vnd,is_active,auth.uid())
  on conflict(component_id,product_id,size) do update set product_name=excluded.product_name,unit_rate_vnd=excluded.unit_rate_vnd,active=excluded.active,updated_by=auth.uid(),updated_at=now()
  returning id into result_id;
 else
  update public.handmade_piece_rates set component_id=component,product_id=selected_product,product_name=product,size=trim(piece_size),unit_rate_vnd=rate_vnd,active=is_active,updated_by=auth.uid(),updated_at=now()
  where id=target_id returning id into result_id;
  if result_id is null then raise exception 'rate not found' using errcode='P0002';end if;
 end if;

 -- Refresh only unreviewed lines in submitted reports. Reviewed lines keep
 -- their approved price snapshot even if the report still has pending lines.
 if is_active then
  update public.productivity_report_lines line
  set rate_snapshot_vnd=rate_vnd,rate_id=result_id
  from public.productivity_reports report
  where report.id=line.report_id
    and report.status='submitted'
    and line.reviewed_at is null
    and line.component_id=component
    and line.product_id=selected_product
    and line.size=trim(piece_size)
    and (line.rate_id=result_id or line.rate_id is null);
 end if;

 return result_id;
end $$;
revoke all on function public.save_handmade_piece_rate(uuid,uuid,uuid,text,numeric,boolean) from public,anon;
grant execute on function public.save_handmade_piece_rate(uuid,uuid,uuid,text,numeric,boolean) to authenticated;

commit;
