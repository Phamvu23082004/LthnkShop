begin;

create or replace function public.delete_handmade_piece_rate(target_rate uuid)
returns void language plpgsql security definer set search_path='' as $$
declare rate_row public.handmade_piece_rates%rowtype;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if target_rate is null then raise exception 'rate id required' using errcode='22023';end if;
 select * into rate_row from public.handmade_piece_rates where id=target_rate for update;
 if not found then raise exception 'rate not found' using errcode='P0002';end if;

 -- Report lines retain their rate and wage snapshots; the FK to this row is ON DELETE SET NULL.
 delete from public.handmade_piece_rates where id=target_rate;
 insert into public.account_audit(actor_id,target_id,action,details)
 values(auth.uid(),target_rate,'production.piece_rate.deleted',jsonb_build_object(
  'component_id',rate_row.component_id,'product_id',rate_row.product_id,
  'size',rate_row.size,'unit_rate_vnd',rate_row.unit_rate_vnd
 ));
end $$;
revoke all on function public.delete_handmade_piece_rate(uuid) from public,anon;
grant execute on function public.delete_handmade_piece_rate(uuid) to authenticated;

commit;
