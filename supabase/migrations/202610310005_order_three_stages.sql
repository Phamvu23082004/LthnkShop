begin;
-- Three production stages. Cancellation remains a separate terminal operation.
alter table public.orders drop constraint if exists orders_status_check;
insert into public.order_status_history(order_id,old_status,new_status,actor_id,actor_name,reason)
select o.id,o.status,case when o.status='pending' then 'preparing' else 'producing' end,p.id,p.full_name,
'Chuẩn hóa quy trình thành Chưa Làm / Đang Làm / Hoàn Thành'
from public.orders o cross join lateral
(select id,full_name from public.profiles where role='admin' and active order by created_at limit 1) p
where o.status in ('pending','ready','shipping');
update public.orders set status=case when status='pending' then 'preparing' else 'producing' end,
version=version+1,updated_at=now() where status in ('pending','ready','shipping');
alter table public.orders add constraint orders_status_check check(status in ('preparing','producing','completed','cancelled'));
alter table public.orders alter column status set default 'preparing';
do $three_stages$
declare definition text;
begin
 select pg_get_functiondef('public.change_order_status(uuid,integer,text,text)'::regprocedure) into definition;
 definition:=replace(definition,'''pending'',''preparing'',''producing'',''ready'',''shipping'',''completed'',''cancelled''',
 '''preparing'',''producing'',''completed'',''cancelled''');
 execute definition;
end $three_stages$;
commit;
