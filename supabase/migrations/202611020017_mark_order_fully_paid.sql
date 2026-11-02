begin;

create or replace function public.mark_order_fully_paid(target_id uuid,expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare current_order public.orders%rowtype;
begin
 if not(private.has_permission('orders.read') and private.has_permission('orders.write')) then
  raise exception 'forbidden' using errcode='42501';
 end if;
 select * into current_order from public.orders where id=target_id for update;
 if not found then raise exception 'not found' using errcode='P0002';end if;
 if current_order.version is distinct from expected_version then raise exception 'stale version' using errcode='40001';end if;
 if current_order.status='cancelled' then raise exception 'cancelled order is immutable' using errcode='23514';end if;
 update public.orders set paid_vnd=total_vnd,version=version+1,updated_at=now() where id=target_id;
end $$;
revoke all on function public.mark_order_fully_paid(uuid,integer) from public,anon;
grant execute on function public.mark_order_fully_paid(uuid,integer) to authenticated;

commit;
