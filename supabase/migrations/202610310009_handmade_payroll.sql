begin;

-- Staff need access to their own production workspace. RLS below keeps peer data private.
insert into public.employee_permissions(employee_id,permission)
select p.id,'employees.read' from public.profiles p
where p.active and p.role='staff'
on conflict do nothing;

create table if not exists public.handmade_components (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check(char_length(trim(name)) between 1 and 100),
 active boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
insert into public.handmade_components(name,sort_order) values
 ('Phôi đầu',1),('Tay',2),('Chân',3),('Thân',4),('Mũ trùm',5),('Hoa',6),('Các bộ phận khác',7)
on conflict(name) do nothing;

create table if not exists public.handmade_piece_rates (
 id uuid primary key default gen_random_uuid(),
 component_id uuid not null references public.handmade_components(id),
 product_id uuid not null references public.products(id),
 product_name text not null check(char_length(trim(product_name)) between 1 and 200),
 size text not null check(char_length(trim(size)) between 1 and 80),
 unit_rate_vnd numeric(18,0) not null check(unit_rate_vnd between 0 and 1000000000),
 active boolean not null default true,
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now(),
 unique(component_id,product_id,size)
);

create table if not exists public.productivity_reports (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.profiles(id),
 completed_on date not null check(completed_on between '2000-01-01' and '2100-12-31'),
 status text not null default 'draft' check(status in ('draft','submitted','returned','approved')),
 notes text not null default '' check(char_length(notes)<=2000),
 return_reason text not null default '' check(char_length(return_reason)<=1000),
 version integer not null default 1,
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.productivity_report_lines (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.productivity_reports(id) on delete cascade,
 component_id uuid not null references public.handmade_components(id),
 component_name text not null,
 product_id uuid not null references public.products(id),
 variant_id uuid not null,
 product_name text not null check(char_length(trim(product_name)) between 1 and 200),
 variant_name text not null check(char_length(trim(variant_name)) between 1 and 200),
 component_color text not null default '' check(char_length(component_color)<=100),
 size text not null check(char_length(trim(size)) between 1 and 80),
 quantity integer not null check(quantity between 1 and 10000),
 rate_snapshot_vnd numeric(18,0) check(rate_snapshot_vnd between 0 and 1000000000),
 approved_quantity integer check(approved_quantity between 0 and 10000),
 approved_unit_rate_vnd numeric(18,0) check(approved_unit_rate_vnd between 0 and 1000000000),
 rate_id uuid references public.handmade_piece_rates(id) on delete set null,
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(variant_id,product_id) references public.product_variants(id,product_id),
 check(approved_quantity is null or approved_quantity<=quantity),
 check((reviewed_at is null and approved_quantity is null and approved_unit_rate_vnd is null and reviewed_by is null)
    or (reviewed_at is not null and approved_quantity is not null and approved_unit_rate_vnd is not null and reviewed_by is not null))
);
-- Upgrade tables that were created by an earlier partial run of this migration.
alter table public.handmade_piece_rates add column if not exists product_id uuid references public.products(id);
update public.handmade_piece_rates r set product_id=p.id from public.products p
where r.product_id is null and lower(trim(r.product_name))=lower(trim(p.name));
create unique index if not exists handmade_piece_rates_component_product_size_uidx
 on public.handmade_piece_rates(component_id,product_id,size);

alter table public.productivity_report_lines add column if not exists product_id uuid references public.products(id);
alter table public.productivity_report_lines add column if not exists variant_id uuid;
alter table public.productivity_report_lines add column if not exists variant_name text;
 alter table public.productivity_report_lines add column if not exists component_color text not null default '' check(char_length(component_color)<=100);
update public.productivity_report_lines l set product_id=p.id from public.products p
where l.product_id is null and lower(trim(l.product_name))=lower(trim(p.name));
update public.productivity_report_lines l set variant_id=v.id,variant_name=v.name
from public.product_variants v
where l.variant_id is null and l.product_id=v.product_id and lower(trim(l.product_name))=lower(trim(v.name));
do $catalog_fks$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.productivity_report_lines'::regclass and conname='productivity_report_lines_catalog_variant_fkey') then
  alter table public.productivity_report_lines add constraint productivity_report_lines_catalog_variant_fkey
   foreign key(variant_id,product_id) references public.product_variants(id,product_id);
 end if;
end $catalog_fks$;
create index if not exists productivity_reports_employee_date on public.productivity_reports(employee_id,completed_on desc,created_at desc);
create index if not exists productivity_reports_status_date on public.productivity_reports(status,completed_on);
create index if not exists productivity_lines_report on public.productivity_report_lines(report_id,created_at);

create table if not exists public.productivity_report_events (
 id bigint generated always as identity primary key,
 report_id uuid not null references public.productivity_reports(id) on delete cascade,
 actor_id uuid not null references public.profiles(id),
 action text not null check(action in ('saved','submitted','returned','line_reviewed','approved')),
 details jsonb not null default '{}',
 created_at timestamptz not null default now()
);

create table if not exists public.payroll_entries (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.profiles(id),
 period_month date not null check(period_month=date_trunc('month',period_month)::date),
 entry_type text not null check(entry_type in ('advance','bonus','allowance','payment')),
 amount_vnd numeric(18,0) not null check(amount_vnd between 1 and 1000000000000),
 notes text not null default '' check(char_length(notes)<=1000),
 actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create index if not exists payroll_employee_period on public.payroll_entries(employee_id,period_month,created_at desc);

alter table public.handmade_components enable row level security;
alter table public.handmade_piece_rates enable row level security;
alter table public.productivity_reports enable row level security;
alter table public.productivity_report_lines enable row level security;
alter table public.productivity_report_events enable row level security;
alter table public.payroll_entries enable row level security;
revoke all on public.handmade_components,public.handmade_piece_rates,public.productivity_reports,
 public.productivity_report_lines,public.productivity_report_events,public.payroll_entries from anon,authenticated;
grant select on public.handmade_components,public.handmade_piece_rates,public.productivity_reports,
 public.productivity_report_lines,public.productivity_report_events,public.payroll_entries to authenticated;
drop policy if exists component_read on public.handmade_components;
create policy component_read on public.handmade_components for select to authenticated using(private.has_permission('employees.read'));
drop policy if exists rate_read on public.handmade_piece_rates;
create policy rate_read on public.handmade_piece_rates for select to authenticated using(private.has_permission('employees.read'));
drop policy if exists production_catalog_read on public.products;
create policy production_catalog_read on public.products for select to authenticated using(private.has_permission('employees.read'));
drop policy if exists production_variant_catalog_read on public.product_variants;
create policy production_variant_catalog_read on public.product_variants for select to authenticated using(private.has_permission('employees.read'));
drop policy if exists production_report_read on public.productivity_reports;
create policy production_report_read on public.productivity_reports for select to authenticated
 using(private.has_permission('employees.read') and (employee_id=auth.uid() or private.is_owner()));
drop policy if exists production_lines_read on public.productivity_report_lines;
create policy production_lines_read on public.productivity_report_lines for select to authenticated
 using(private.has_permission('employees.read') and exists(select 1 from public.productivity_reports r where r.id=report_id and (r.employee_id=auth.uid() or private.is_owner())));
drop policy if exists production_events_read on public.productivity_report_events;
create policy production_events_read on public.productivity_report_events for select to authenticated
 using(private.has_permission('employees.read') and exists(select 1 from public.productivity_reports r where r.id=report_id and (r.employee_id=auth.uid() or private.is_owner())));
drop policy if exists payroll_read on public.payroll_entries;
create policy payroll_read on public.payroll_entries for select to authenticated
 using(private.has_permission('employees.read') and (employee_id=auth.uid() or private.is_owner()));

create or replace function public.save_productivity_report(payload jsonb,target_id uuid default null,expected_version integer default null,submit_report boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; old public.productivity_reports%rowtype; item jsonb; component public.handmade_components%rowtype;
 product_row public.products%rowtype; variant_row public.product_variants%rowtype;
 line_row public.productivity_report_lines%rowtype; wage public.handmade_piece_rates%rowtype; n integer:=0;
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
 or coalesce(item->>'quantity','')!~'^[0-9]+$' or (item->>'quantity')::integer not between 1 and 10000 then raise exception 'invalid quantity' using errcode='22023';end if;
 select * into component from public.handmade_components where id=(item->>'component_id')::uuid and active;
 if not found then raise exception 'invalid component' using errcode='22023';end if;
 select * into product_row from public.products where id=(item->>'product_id')::uuid and active;
 if not found then raise exception 'invalid product' using errcode='22023';end if;
 select * into variant_row from public.product_variants where id=(item->>'variant_id')::uuid and product_id=product_row.id and active;
 if not found then raise exception 'invalid product variant' using errcode='22023';end if;
 if char_length(trim(coalesce(item->>'size',''))) not between 1 and 80 or char_length(trim(coalesce(item->>'component_color','')))>100 then raise exception 'invalid size or component color' using errcode='22023';end if;
 insert into public.productivity_report_lines(report_id,component_id,component_name,product_id,variant_id,product_name,variant_name,component_color,size,quantity)
 values(rid,component.id,component.name,product_row.id,variant_row.id,product_row.name,variant_row.name,trim(coalesce(item->>'component_color','')),trim(item->>'size'),(item->>'quantity')::integer);n:=n+1;
 end loop;
 if submit_report then
  for line_row in select * from public.productivity_report_lines where report_id=rid loop
   select * into wage from public.handmade_piece_rates where component_id=line_row.component_id and product_id=line_row.product_id and size=line_row.size and active;
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

create or replace function public.review_productivity_line(target_line uuid,approved_qty integer)
returns void language plpgsql security definer set search_path='' as $$
declare line_row public.productivity_report_lines%rowtype; report_row public.productivity_reports%rowtype;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if approved_qty is null or approved_qty<0 then raise exception 'invalid quantity' using errcode='22023';end if;
 select l.* into line_row from public.productivity_report_lines l join public.productivity_reports r on r.id=l.report_id
 where l.id=target_line for update of l;
 if not found then raise exception 'line not found' using errcode='P0002';end if;
 select * into report_row from public.productivity_reports where id=line_row.report_id for update;
 if report_row.status<>'submitted' or line_row.reviewed_at is not null then raise exception 'line is locked' using errcode='23514';end if;
 if approved_qty>line_row.quantity then raise exception 'approved quantity exceeds reported quantity' using errcode='22023';end if;
 if line_row.rate_snapshot_vnd is null then raise exception 'wage rate snapshot missing' using errcode='P0002';end if;
 update public.productivity_report_lines set approved_quantity=approved_qty,approved_unit_rate_vnd=line_row.rate_snapshot_vnd,reviewed_by=auth.uid(),reviewed_at=now() where id=target_line;
 insert into public.productivity_report_events(report_id,actor_id,action,details)
 values(report_row.id,auth.uid(),'line_reviewed',jsonb_build_object('line_id',target_line,'reported',line_row.quantity,'approved',approved_qty,'unit_rate_vnd',line_row.rate_snapshot_vnd));
 if not exists(select 1 from public.productivity_report_lines where report_id=report_row.id and reviewed_at is null) then
 update public.productivity_reports set status='approved',updated_at=now() where id=report_row.id;
 insert into public.productivity_report_events(report_id,actor_id,action) values(report_row.id,auth.uid(),'approved');
 end if;
end $$;
revoke all on function public.review_productivity_line(uuid,integer) from public,anon;
grant execute on function public.review_productivity_line(uuid,integer) to authenticated;

create or replace function public.return_productivity_report(target_report uuid,reason text)
returns void language plpgsql security definer set search_path='' as $$
declare report_row public.productivity_reports%rowtype;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if reason is null or char_length(trim(reason)) not between 3 and 1000 then raise exception 'return reason required' using errcode='22023';end if;
 select * into report_row from public.productivity_reports where id=target_report for update;
 if not found or report_row.status<>'submitted' then raise exception 'report cannot be returned' using errcode='23514';end if;
 update public.productivity_report_lines set rate_snapshot_vnd=null,approved_quantity=null,approved_unit_rate_vnd=null,rate_id=null,reviewed_by=null,reviewed_at=null where report_id=target_report;
 update public.productivity_reports set status='returned',return_reason=trim(reason),updated_at=now() where id=target_report;
 insert into public.productivity_report_events(report_id,actor_id,action,details) values(target_report,auth.uid(),'returned',jsonb_build_object('reason',trim(reason)));
end $$;
revoke all on function public.return_productivity_report(uuid,text) from public,anon;
grant execute on function public.return_productivity_report(uuid,text) to authenticated;

create or replace function public.save_handmade_component(target_id uuid,component_name text,is_active boolean,position_value integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if component_name is null or char_length(trim(component_name)) not between 1 and 100 or is_active is null or position_value not between 0 and 10000 then raise exception 'invalid component' using errcode='22023';end if;
 if target_id is null then insert into public.handmade_components(name,active,sort_order) values(trim(component_name),is_active,position_value) returning id into result_id;
 else update public.handmade_components set name=trim(component_name),active=is_active,sort_order=position_value,updated_at=now() where id=target_id returning id into result_id;
 if result_id is null then raise exception 'component not found' using errcode='P0002';end if;end if;
 return result_id;
end $$;
revoke all on function public.save_handmade_component(uuid,text,boolean,integer) from public,anon;
grant execute on function public.save_handmade_component(uuid,text,boolean,integer) to authenticated;

create or replace function public.save_handmade_piece_rate(target_id uuid,component uuid,selected_product uuid,piece_size text,rate_vnd numeric,is_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; product text;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if component is null or not exists(select 1 from public.handmade_components where id=component) or selected_product is null
 or char_length(trim(coalesce(piece_size,''))) not between 1 and 80 or rate_vnd is null or rate_vnd not between 0 and 1000000000 or rate_vnd<>trunc(rate_vnd) or is_active is null then raise exception 'invalid wage rate' using errcode='22023';end if;
 select name into product from public.products where id=selected_product;
 if not found then raise exception 'product not found' using errcode='P0002';end if;
 if target_id is null then insert into public.handmade_piece_rates(component_id,product_id,product_name,size,unit_rate_vnd,active,updated_by)
 values(component,selected_product,product,trim(piece_size),rate_vnd,is_active,auth.uid()) on conflict(component_id,product_id,size) do update set product_name=excluded.product_name,unit_rate_vnd=excluded.unit_rate_vnd,active=excluded.active,updated_by=auth.uid(),updated_at=now() returning id into result_id;
 else update public.handmade_piece_rates set component_id=component,product_id=selected_product,product_name=product,size=trim(piece_size),unit_rate_vnd=rate_vnd,active=is_active,updated_by=auth.uid(),updated_at=now() where id=target_id returning id into result_id;
 if result_id is null then raise exception 'rate not found' using errcode='P0002';end if;end if;
 return result_id;
end $$;
revoke all on function public.save_handmade_piece_rate(uuid,uuid,uuid,text,numeric,boolean) from public,anon;
grant execute on function public.save_handmade_piece_rate(uuid,uuid,uuid,text,numeric,boolean) to authenticated;

create or replace function public.add_payroll_entry(target_employee uuid,month_start date,kind text,amount numeric,entry_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=target_employee and role='staff') or month_start is null or month_start<>date_trunc('month',month_start)::date
 or kind not in ('advance','bonus','allowance','payment') or amount is null or amount not between 1 and 1000000000000 or amount<>trunc(amount)
 or entry_note is null or char_length(entry_note)>1000 then raise exception 'invalid payroll entry' using errcode='22023';end if;
 insert into public.payroll_entries(employee_id,period_month,entry_type,amount_vnd,notes,actor_id)
 values(target_employee,month_start,kind,amount,trim(entry_note),auth.uid()) returning id into result_id;
 return result_id;
end $$;
revoke all on function public.add_payroll_entry(uuid,date,text,numeric,text) from public,anon;
grant execute on function public.add_payroll_entry(uuid,date,text,numeric,text) to authenticated;

create or replace function public.get_payroll_summary(start_date date,end_date date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501';end if;
 if start_date is null or end_date is null or start_date>=end_date or start_date<'2000-01-01' or end_date>'2101-01-01' then raise exception 'invalid period' using errcode='22023';end if;
 with staff as (select id,full_name from public.profiles where role='staff'), earned as (
  select r.employee_id,sum(l.approved_quantity*l.approved_unit_rate_vnd)::numeric as amount
  from public.productivity_reports r join public.productivity_report_lines l on l.report_id=r.id
  where l.reviewed_at is not null and r.completed_on>=start_date and r.completed_on<end_date group by r.employee_id
 ), entries as (
  select employee_id,
   coalesce(sum(amount_vnd) filter(where entry_type='advance'),0) as advances,
   coalesce(sum(amount_vnd) filter(where entry_type='bonus'),0) as bonuses,
   coalesce(sum(amount_vnd) filter(where entry_type='allowance'),0) as allowances,
   coalesce(sum(amount_vnd) filter(where entry_type='payment'),0) as payments
  from public.payroll_entries where period_month>=date_trunc('month',start_date)::date and period_month<date_trunc('month',end_date-1)::date+interval '1 month' group by employee_id
 ) select coalesce(jsonb_agg(jsonb_build_object('employee_id',s.id,'employee_name',s.full_name,
 'earned',coalesce(e.amount,0)::text,'advances',coalesce(p.advances,0)::text,'bonuses',coalesce(p.bonuses,0)::text,
 'allowances',coalesce(p.allowances,0)::text,'payments',coalesce(p.payments,0)::text,
 'remaining',(coalesce(e.amount,0)-coalesce(p.advances,0)+coalesce(p.bonuses,0)+coalesce(p.allowances,0)-coalesce(p.payments,0))::text)
 order by s.full_name),'[]'::jsonb) into result from staff s left join earned e on e.employee_id=s.id left join entries p on p.employee_id=s.id;
 return result;
end $$;
revoke all on function public.get_payroll_summary(date,date) from public,anon;
grant execute on function public.get_payroll_summary(date,date) to authenticated;

create or replace function public.get_my_work_dashboard()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.is_active() then raise exception 'forbidden' using errcode='42501';end if;
 select jsonb_build_object(
  'pending_reports',(select count(*)::text from public.productivity_reports where employee_id=auth.uid() and status='submitted'),
  'returned_reports',(select count(*)::text from public.productivity_reports where employee_id=auth.uid() and status='returned'),
  'approved_income',(select coalesce(sum(l.approved_quantity*l.approved_unit_rate_vnd),0)::text from public.productivity_reports r join public.productivity_report_lines l on l.report_id=r.id where r.employee_id=auth.uid() and l.reviewed_at is not null and r.completed_on>=date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date),
  'month_label',to_char(now() at time zone 'Asia/Ho_Chi_Minh','MM/YYYY'),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'completed_on',r.completed_on,'status',r.status,'notes',r.notes,'return_reason',r.return_reason,'reported_quantity',x.reported,'approved_quantity',x.approved,'reviewed_lines',x.reviewed,'earned',x.earned) order by r.completed_on desc,r.created_at desc),'[]'::jsonb)
   from (select * from public.productivity_reports where employee_id=auth.uid() order by completed_on desc,created_at desc limit 10) r
   cross join lateral (select coalesce(sum(quantity),0)::text reported,coalesce(sum(approved_quantity),0)::text approved,count(*) filter(where reviewed_at is not null)::text reviewed,coalesce(sum(approved_quantity*approved_unit_rate_vnd),0)::text earned from public.productivity_report_lines where report_id=r.id) x)
 ) into result;
 return result;
end $$;
revoke all on function public.get_my_work_dashboard() from public,anon;
grant execute on function public.get_my_work_dashboard() to authenticated;

commit;

