begin;

-- Productivity reports identify the product; a variant is optional.
alter table public.productivity_report_lines
 alter column variant_id drop not null,
 alter column variant_name drop not null;

create or replace function public.save_productivity_report(payload jsonb,target_id uuid default null,expected_version integer default null,submit_report boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; old public.productivity_reports%rowtype; item jsonb; component public.handmade_components%rowtype;
 product_row public.products%rowtype; line_row public.productivity_report_lines%rowtype;
 wage public.handmade_piece_rates%rowtype; n integer:=0;
 report_date date; note_value text;
begin
 if not private.has_permission('employees.read') or private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'lines') is distinct from 'array'
 or jsonb_array_length(payload->'lines') not between 1 and 50 then raise exception 'invalid payload' using errcode='22023';end if;
 report_date:=(payload->>'completed_on')::date;note_value:=coalesce(payload->>'notes','');
 if report_date not between '2000-01-01' and '2100-12-31' or char_length(note_value)>2000 then raise exception 'invalid report fields' using errcode='22023';end if;
 if target_id is null then
  insert into public.productivity_reports(employee_id,completed_on,notes,status,submitted_at)
  values(auth.uid(),report_date,note_value,case when submit_report then 'submitted' else 'draft' end,case when submit_report then now() end) returning id into rid;
 else
  select * into old from public.productivity_reports where id=target_id for update;
  if not found or old.employee_id<>auth.uid() then raise exception 'not found' using errcode='P0002';end if;
  if old.version is distinct from expected_version then raise exception 'stale report' using errcode='40001';end if;
  if old.status not in ('draft','returned') then raise exception 'report is locked' using errcode='23514';end if;
  update public.productivity_reports set completed_on=report_date,notes=note_value,
   status=case when submit_report then 'submitted' else 'draft' end,return_reason='',submitted_at=case when submit_report then now() end,
   version=version+1,updated_at=now() where id=target_id;
  rid:=target_id;delete from public.productivity_report_lines where report_id=rid;
 end if;
 for item in select value from jsonb_array_elements(payload->'lines') loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'quantity') is distinct from 'number'
   or coalesce(item->>'quantity','') !~ '^[0-9]+$' or (item->>'quantity')::integer not between 1 and 10000 then
   raise exception 'invalid quantity' using errcode='22023';
  end if;
  select * into component from public.handmade_components where id=(item->>'component_id')::uuid and active;
  if not found then raise exception 'invalid component' using errcode='22023';end if;
  select * into product_row from public.products where id=(item->>'product_id')::uuid and active;
  if not found then raise exception 'invalid product' using errcode='22023';end if;
  if coalesce(item->>'size','') !~ '^[0-9]{1,3}$' or char_length(trim(coalesce(item->>'component_color','')))>100 then
   raise exception 'invalid size or component color' using errcode='22023';
  end if;
  insert into public.productivity_report_lines(report_id,component_id,component_name,product_id,product_name,component_color,size,quantity)
  values(rid,component.id,component.name,product_row.id,product_row.name,trim(coalesce(item->>'component_color','')),trim(item->>'size'),(item->>'quantity')::integer);
  n:=n+1;
 end loop;
 if submit_report then
  for line_row in select * from public.productivity_report_lines where report_id=rid loop
   select * into wage from public.handmade_piece_rates
   where component_id=line_row.component_id and product_id=line_row.product_id
    and regexp_replace(lower(trim(size)),'[^0-9]','','g')=trim(line_row.size) and active;
   if not found then raise exception 'wage rate not found' using errcode='P0002';end if;
   update public.productivity_report_lines set rate_snapshot_vnd=wage.unit_rate_vnd,rate_id=wage.id where id=line_row.id;
  end loop;
 end if;
 insert into public.productivity_report_events(report_id,actor_id,action,details)
 values(rid,auth.uid(),case when submit_report then 'submitted' else 'saved' end,jsonb_build_object('lines',n));
 return rid;
end $$;
revoke all on function public.save_productivity_report(jsonb,uuid,integer,boolean) from public,anon;
grant execute on function public.save_productivity_report(jsonb,uuid,integer,boolean) to authenticated;

commit;