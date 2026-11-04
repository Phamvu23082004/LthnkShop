begin;

create or replace function public.delete_handmade_component(target_component uuid)
returns text language plpgsql security definer set search_path='' as $$
declare has_history boolean;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if target_component is null then raise exception 'component id required' using errcode='22023';end if;
 perform 1 from public.handmade_components where id=target_component for update;
 if not found then raise exception 'component not found' using errcode='P0002';end if;

 has_history:=exists(select 1 from public.productivity_report_lines where component_id=target_component);
 if has_history then
  update public.handmade_components set active=false,updated_at=now() where id=target_component;
  update public.handmade_piece_rates set active=false,updated_at=now() where component_id=target_component;
  insert into public.account_audit(actor_id,target_id,action,details)
  values(auth.uid(),target_component,'production.component.deactivated',jsonb_build_object('reason','historical references exist'));
  return 'deactivated';
 end if;

 delete from public.handmade_piece_rates where component_id=target_component;
 delete from public.handmade_components where id=target_component;
 insert into public.account_audit(actor_id,target_id,action,details)
 values(auth.uid(),target_component,'production.component.deleted','{}'::jsonb);
 return 'deleted';
end $$;
revoke all on function public.delete_handmade_component(uuid) from public,anon;
grant execute on function public.delete_handmade_component(uuid) to authenticated;

commit;
