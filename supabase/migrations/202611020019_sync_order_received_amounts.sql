begin;

-- The amount entered as received is the current paid amount in this workflow.
-- Keep both legacy columns synchronized while retaining older values in revisions.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.save_order(jsonb,uuid,integer)'::regprocedure) into definition;
 if position('to_jsonb(prior.paid_vnd)' in definition)>0 then
  definition:=replace(definition,'to_jsonb(prior.paid_vnd)','coalesce(payload->''deposit_vnd'',''0''::jsonb)');
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
  or actual_paid_vnd<0 or actual_paid_vnd>current_order.total_vnd then
  raise exception 'invalid completed payment' using errcode='23514';
 end if;
 update public.orders set paid_vnd=actual_paid_vnd,deposit_vnd=actual_paid_vnd,version=version+1,updated_at=now() where id=target_id;
end $$;
revoke all on function public.update_completed_order_payment(uuid,integer,numeric) from public,anon;
grant execute on function public.update_completed_order_payment(uuid,integer,numeric) to authenticated;

create or replace function public.mark_order_fully_paid(target_id uuid,expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare current_order public.orders%rowtype;
begin
 if not(private.has_permission('orders.read') and private.has_permission('orders.write')) then raise exception 'forbidden' using errcode='42501';end if;
 select * into current_order from public.orders where id=target_id for update;
 if not found then raise exception 'not found' using errcode='P0002';end if;
 if current_order.version is distinct from expected_version then raise exception 'stale version' using errcode='40001';end if;
 if current_order.status='cancelled' then raise exception 'cancelled order is immutable' using errcode='23514';end if;
 update public.orders set paid_vnd=total_vnd,deposit_vnd=total_vnd,version=version+1,updated_at=now() where id=target_id;
end $$;
revoke all on function public.mark_order_fully_paid(uuid,integer) from public,anon;
grant execute on function public.mark_order_fully_paid(uuid,integer) to authenticated;

commit;
