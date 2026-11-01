begin;
-- Distinct capability for mutations. Existing read grants do not acquire write access.
alter table public.employee_permissions drop constraint employee_permissions_permission_check;
alter table public.employee_permissions add constraint employee_permissions_permission_check
 check(permission in ('orders.read','orders.write','employees.read','inventory.read','analytics.read'));
-- Update account provisioning's capability allowlist without changing its authorization.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.manage_account(uuid,text,text,boolean,text[])'::regprocedure) into definition;
 definition:=replace(definition,'''orders.read'',''employees.read''','''orders.read'',''orders.write'',''employees.read''');
 execute definition;
end $migration$;

create sequence public.order_code_seq;
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 order_code text not null unique default ('DH-'||to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY')||'-'||lpad(nextval('public.order_code_seq')::text,8,'0')),
 ordered_on date not null check(ordered_on between '2000-01-01' and '2100-12-31'),
 customer_name text not null check(char_length(customer_name) between 2 and 100),
 phone text not null check(phone ~ '^[0-9+(). -]{6,25}$'),
 address text not null check(char_length(address) between 3 and 500),
 channel text not null check(char_length(channel) between 1 and 80),
 shipping_vnd numeric(18,0) not null check(shipping_vnd between 0 and 1000000000000),
 discount_vnd numeric(18,0) not null check(discount_vnd>=0),
 deposit_vnd numeric(18,0) not null check(deposit_vnd>=0),
 paid_vnd numeric(18,0) not null check(paid_vnd>=deposit_vnd),
 subtotal_vnd numeric(18,0) not null check(subtotal_vnd>=discount_vnd),
 total_vnd numeric(18,0) not null check(total_vnd between 0 and 1000000000000 and paid_vnd<=total_vnd),
 remaining_vnd numeric(18,0) generated always as (total_vnd-paid_vnd) stored,
 due_on date check(due_on between '2000-01-01' and '2100-12-31'),
 notes text not null default '' check(char_length(notes)<=2000),
 status text not null default 'pending' check(status in ('pending','preparing','producing','ready','shipping','completed','cancelled')),
 version integer not null default 1,
 search_text text not null default '',
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(total_vnd=subtotal_vnd+shipping_vnd-discount_vnd),
 check(due_on is null or due_on>=ordered_on)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 position integer not null, product_name text not null check(char_length(product_name) between 1 and 200),
 product_type text not null check(product_type in ('diy_kit','finished_product')),
 variant text not null default '' check(char_length(variant)<=200),
 quantity integer not null check(quantity between 1 and 10000),
 unit_price_vnd numeric(18,0) not null check(unit_price_vnd between 0 and 1000000000),
 line_total_vnd numeric(18,0) generated always as (quantity*unit_price_vnd) stored,
 unique(order_id,position)
);
create table public.order_status_history (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 old_status text,new_status text not null,
 actor_id uuid not null references public.profiles(id),actor_name text not null,
 reason text not null default '',created_at timestamptz not null default now()
);
-- Snapshots preserve financial/item edits; not a cash receipt ledger.
create table public.order_revisions (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 version integer not null,actor_id uuid not null references public.profiles(id),
 payload jsonb not null,created_at timestamptz not null default now(),unique(order_id,version)
);
create index orders_date_idx on public.orders(ordered_on desc,created_at desc,id);
create index orders_status_date_idx on public.orders(status,ordered_on desc);
create index history_order_idx on public.order_status_history(order_id,created_at);
create index revisions_order_idx on public.order_revisions(order_id);
do $$ declare t text;begin
 foreach t in array array['orders','order_items','order_status_history','order_revisions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy orders_read on public.%I for select to authenticated using(private.has_permission(''orders.read''))',t);
 end loop;
end $$;
revoke all on sequence public.order_code_seq from anon,authenticated;

create function public.save_order(payload jsonb,target_id uuid default null,expected_version integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 result_id uuid; previous public.orders%rowtype; row_item jsonb; seq integer:=0;
 subtotal numeric:=0; shipping numeric; discount numeric; deposit numeric; paid numeric; total numeric;
 request uuid; placed date; due date; search_value text;
begin
 if not(private.has_permission('orders.read') and private.has_permission('orders.write')) then raise exception 'forbidden' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'items') is distinct from 'array'
 then raise exception 'invalid payload' using errcode='22023';end if;
 if jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'invalid items' using errcode='22023';end if;
 request:=(payload->>'request_id')::uuid;
 if request is null then raise exception 'missing request id' using errcode='22023';end if;
 if target_id is null then
 perform pg_catalog.pg_advisory_xact_lock(hashtextextended(request::text,0));
 select * into previous from public.orders where request_id=request;
 if found then
 if previous.created_by<>auth.uid() then raise exception 'forbidden' using errcode='42501';end if;
 return previous.id;
 end if;
 else
 select * into previous from public.orders where id=target_id for update;
 if not found then raise exception 'not found' using errcode='P0002';end if;
 if previous.version is distinct from expected_version then raise exception 'stale version' using errcode='40001';end if;
 if previous.status='cancelled' then raise exception 'cancelled order is immutable' using errcode='23514';end if;
 end if;
 placed:=(payload->>'ordered_on')::date; due:=nullif(payload->>'due_on','')::date;
 foreach search_value in array array['shipping_vnd','discount_vnd','deposit_vnd','paid_vnd'] loop
 if jsonb_typeof(payload->search_value) is distinct from 'number' or (payload->>search_value)!~'^[0-9]+$'
 or (payload->>search_value)::numeric>1000000000000 then raise exception 'invalid money' using errcode='22023';end if;
 end loop;
 shipping:=(payload->>'shipping_vnd')::numeric;discount:=(payload->>'discount_vnd')::numeric;
 deposit:=(payload->>'deposit_vnd')::numeric;paid:=(payload->>'paid_vnd')::numeric;
 for row_item in select value from jsonb_array_elements(payload->'items') loop
 if jsonb_typeof(row_item) is distinct from 'object'
 or jsonb_typeof(row_item->'quantity') is distinct from 'number'
 or jsonb_typeof(row_item->'unit_price_vnd') is distinct from 'number'
 or coalesce(row_item->>'quantity','')!~'^[0-9]+$' or coalesce(row_item->>'unit_price_vnd','')!~'^[0-9]+$'
 then raise exception 'invalid line numbers' using errcode='22023';end if;
 if (row_item->>'quantity')::numeric not between 1 and 10000 or (row_item->>'unit_price_vnd')::numeric not between 0 and 1000000000
 then raise exception 'invalid line bounds' using errcode='22023';end if;
 subtotal:=subtotal+(row_item->>'quantity')::numeric*(row_item->>'unit_price_vnd')::numeric;
 end loop;
 total:=subtotal+shipping-discount;
 search_value:=concat_ws(' ',payload->>'customer_name',payload->>'phone',payload->>'channel',
 (select string_agg(concat_ws(' ',v->>'product_name',v->>'variant'),' ') from jsonb_array_elements(payload->'items') v));
 if target_id is null then
 insert into public.orders(request_id,ordered_on,customer_name,phone,address,channel,shipping_vnd,discount_vnd,deposit_vnd,paid_vnd,subtotal_vnd,total_vnd,due_on,notes,created_by,search_text)
 values(request,placed,trim(payload->>'customer_name'),trim(payload->>'phone'),trim(payload->>'address'),trim(payload->>'channel'),
 shipping,discount,deposit,paid,subtotal,total,due,coalesce(payload->>'notes',''),auth.uid(),search_value) returning id into result_id;
 insert into public.order_status_history(order_id,new_status,actor_id,actor_name,reason)
 select result_id,'pending',auth.uid(),full_name,'Tạo đơn hàng' from public.profiles where id=auth.uid();
 else
 result_id:=target_id;
 update public.orders set ordered_on=placed,customer_name=trim(payload->>'customer_name'),phone=trim(payload->>'phone'),
 address=trim(payload->>'address'),channel=trim(payload->>'channel'),shipping_vnd=shipping,discount_vnd=discount,
 deposit_vnd=deposit,paid_vnd=paid,subtotal_vnd=subtotal,total_vnd=total,due_on=due,notes=coalesce(payload->>'notes',''),
 search_text=search_value,version=version+1,updated_at=now() where id=result_id;
 delete from public.order_items where order_id=result_id;
 end if;
 update public.orders set search_text=order_code||' '||search_value where id=result_id;
 for row_item in select value from jsonb_array_elements(payload->'items') loop
 seq:=seq+1;
 insert into public.order_items(order_id,position,product_name,product_type,variant,quantity,unit_price_vnd)
 values(result_id,seq,trim(row_item->>'product_name'),row_item->>'product_type',coalesce(row_item->>'variant',''),(row_item->>'quantity')::integer,(row_item->>'unit_price_vnd')::numeric);
 end loop;
 insert into public.order_revisions(order_id,version,actor_id,payload)
 select result_id,version,auth.uid(),payload from public.orders where id=result_id;
 return result_id;
end $$;
revoke all on function public.save_order(jsonb,uuid,integer) from public,anon;
grant execute on function public.save_order(jsonb,uuid,integer) to authenticated;

create function public.change_order_status(target_id uuid,expected_version integer,next_status text,change_reason text default '')
returns void language plpgsql security definer set search_path='' as $$
declare previous public.orders%rowtype;
begin
 if not(private.has_permission('orders.read') and private.has_permission('orders.write')) then raise exception 'forbidden' using errcode='42501';end if;
 if next_status is null or next_status not in ('pending','preparing','producing','ready','shipping','completed','cancelled')
 or change_reason is null or char_length(change_reason)>1000 then raise exception 'invalid status' using errcode='22023';end if;
 select * into previous from public.orders where id=target_id for update;
 if not found then raise exception 'not found' using errcode='P0002';end if;
 if previous.version is distinct from expected_version then raise exception 'stale version' using errcode='40001';end if;
 if previous.status=next_status then return;end if;
 if previous.status='cancelled' then raise exception 'cancelled order is immutable' using errcode='23514';end if;
 if next_status='cancelled' and char_length(trim(change_reason))<3 then raise exception 'cancellation reason required' using errcode='22023';end if;
 update public.orders set status=next_status,version=version+1,updated_at=now() where id=target_id;
 insert into public.order_status_history(order_id,old_status,new_status,actor_id,actor_name,reason)
 select target_id,previous.status,next_status,auth.uid(),full_name,trim(change_reason) from public.profiles where id=auth.uid();
end $$;
revoke all on function public.change_order_status(uuid,integer,text,text) from public,anon;
grant execute on function public.change_order_status(uuid,integer,text,text) to authenticated;
commit;
