begin;

create or replace function public.delete_catalog_product(target_product uuid)
returns text language plpgsql security definer set search_path='' as $$
declare has_history boolean;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if target_product is null then raise exception 'product id required' using errcode='22023';end if;
 perform 1 from public.products where id=target_product for update;
 if not found then raise exception 'product not found' using errcode='P0002';end if;

 has_history:=
  exists(select 1 from public.order_items where product_id=target_product)
  or exists(select 1 from public.product_variants v join public.order_items i on i.variant_id=v.id where v.product_id=target_product)
  or exists(select 1 from public.handmade_piece_rates where product_id=target_product)
  or exists(select 1 from public.productivity_report_lines where product_id=target_product);

 if has_history then
  update public.products set active=false where id=target_product;
  update public.product_variants set active=false where product_id=target_product;
  insert into public.account_audit(actor_id,target_id,action,details)
  values(auth.uid(),target_product,'catalog.product.deactivated',jsonb_build_object('reason','historical references exist'));
  return 'deactivated';
 end if;

 delete from public.product_variants where product_id=target_product;
 delete from public.products where id=target_product;
 insert into public.account_audit(actor_id,target_id,action,details)
 values(auth.uid(),target_product,'catalog.product.deleted','{}'::jsonb);
 return 'deleted';
end $$;
revoke all on function public.delete_catalog_product(uuid) from public,anon;
grant execute on function public.delete_catalog_product(uuid) to authenticated;

commit;
