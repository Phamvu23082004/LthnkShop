begin;

-- New orders record only the deposit. Preserve legacy paid amounts when
-- existing order details are edited, including completed orders.
do $migration$
declare definition text; marker text:=' result:=private.save_order_snapshot(payload,target_id,expected_version);';
begin
 select pg_get_functiondef('public.save_order(jsonb,uuid,integer)'::regprocedure) into definition;
 if position('preserve_completed_payment' in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Could not find save_order snapshot call'; end if;
  definition:=replace(definition,marker,
   E' -- preserve_completed_payment: deposits are the only payment input before completion.\n'
   ||E' if target_id is null then\n'
   ||E'  payload:=jsonb_set(payload,''{paid_vnd}'',coalesce(payload->''deposit_vnd'',''0''::jsonb),true);\n'
   ||E' else\n'
   ||E'  select * into prior from public.orders where id=target_id;\n'
   ||E'  if prior.status=''completed'' or prior.paid_vnd<>prior.deposit_vnd then\n'
   ||E'   payload:=jsonb_set(payload,''{paid_vnd}'',to_jsonb(prior.paid_vnd),true);\n'
   ||E'  else\n'
   ||E'   payload:=jsonb_set(payload,''{paid_vnd}'',coalesce(payload->''deposit_vnd'',''0''::jsonb),true);\n'
   ||E'  end if;\n'
   ||E' end if;\n'||marker);
  execute definition;
 end if;
end
$migration$;

create or replace function public.update_completed_order_payment(target_id uuid,expected_version integer,actual_paid_vnd numeric)
returns void language plpgsql security definer set search_path='' as $$
declare current_order public.orders%rowtype;
begin
 if not(private.has_permission('orders.read') and private.has_permission('orders.write')) then raise exception 'forbidden' using errcode='42501';end if;
 select * into current_order from public.orders where id=target_id for update;
 if not found then raise exception 'not found' using errcode='P0002';end if;
 if current_order.version is distinct from expected_version then raise exception 'stale version' using errcode='40001';end if;
 if current_order.status<>'completed' then raise exception 'order is not completed' using errcode='23514';end if;
 if actual_paid_vnd is null or actual_paid_vnd<>trunc(actual_paid_vnd)
  or actual_paid_vnd<current_order.deposit_vnd or actual_paid_vnd>current_order.total_vnd then
  raise exception 'invalid completed payment' using errcode='23514';
 end if;
 update public.orders set paid_vnd=actual_paid_vnd,version=version+1,updated_at=now() where id=target_id;
end $$;
revoke all on function public.update_completed_order_payment(uuid,integer,numeric) from public,anon;
grant execute on function public.update_completed_order_payment(uuid,integer,numeric) to authenticated;

commit;
