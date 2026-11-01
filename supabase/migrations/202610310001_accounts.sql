begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique,
 full_name text not null check(char_length(full_name) between 2 and 100),
 role text not null default 'staff' check(role in ('admin','staff')),
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.employee_permissions (
 employee_id uuid not null references public.profiles(id) on delete cascade,
 permission text not null check(permission in ('orders.read','employees.read','inventory.read','analytics.read')),
 primary key(employee_id,permission)
);
create table public.account_audit (
 id bigint generated always as identity primary key,
 actor_id uuid, target_id uuid not null,
 action text not null,
 details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index account_audit_target_time on public.account_audit(target_id,created_at desc);

create function private.is_owner() returns boolean
language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and active) $$;
create function private.is_active() returns boolean
language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles where id=auth.uid() and active) $$;
create function private.has_permission(capability text) returns boolean
language sql stable security definer set search_path=''
as $$ select private.is_active() and (private.is_owner() or exists(
 select 1 from public.employee_permissions where employee_id=auth.uid() and permission=capability)) $$;
revoke all on function private.is_owner(),private.is_active(),private.has_permission(text) from public,anon;
grant execute on function private.is_owner(),private.is_active(),private.has_permission(text) to authenticated;

-- Metadata provides a display name only, never a role or an active flag.
create function private.on_auth_user_created() returns trigger
language plpgsql security definer set search_path=''
as $$ begin
 insert into public.profiles(id,email,full_name,role,active)
 values(new.id,new.email,
 left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Nhân viên'),100),
 'staff',false);
 return new;
end $$;
revoke all on function private.on_auth_user_created() from public,anon,authenticated;
create trigger lthnk_auth_user_created after insert on auth.users
for each row execute function private.on_auth_user_created();

create function private.sync_auth_email() returns trigger
language plpgsql security definer set search_path=''
as $$ begin
 update public.profiles set email=new.email where id=new.id;
 return new;
end $$;
revoke all on function private.sync_auth_email() from public,anon,authenticated;
create trigger lthnk_auth_email_updated after update of email on auth.users
for each row when (old.email is distinct from new.email) execute function private.sync_auth_email();

-- Existing Auth accounts are imported inactive; setup explicitly bootstraps one owner.
insert into public.profiles(id,email,full_name)
select id,email,'Nhân viên' from auth.users where email is not null
on conflict(id) do nothing;

alter table public.profiles enable row level security;
alter table public.employee_permissions enable row level security;
alter table public.account_audit enable row level security;
revoke all on public.profiles,public.employee_permissions,public.account_audit from anon,authenticated;
grant select on public.profiles,public.employee_permissions,public.account_audit to authenticated;
grant all on public.profiles,public.employee_permissions,public.account_audit to service_role;
grant usage,select on sequence public.account_audit_id_seq to service_role;
create policy profiles_select on public.profiles for select to authenticated
 using(private.is_active() and (id=auth.uid() or private.is_owner()));
create policy permissions_select on public.employee_permissions for select to authenticated
 using(private.is_active() and (employee_id=auth.uid() or private.is_owner()));
create policy audit_select on public.account_audit for select to authenticated using(private.is_owner());

create function public.manage_account(
 target_id uuid,new_name text,new_role text,new_active boolean,new_permissions text[]
) returns void language plpgsql security definer set search_path=''
as $$
declare previous public.profiles%rowtype;
begin
 -- Serialize owner changes; repeat authorization after acquiring the lock.
 perform pg_catalog.pg_advisory_xact_lock(82461031);
 if not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 if new_role is null or new_role not in ('admin','staff') or new_active is null
 or new_name is null or char_length(trim(new_name)) not between 2 and 100
 or new_permissions is null or array_position(new_permissions,null) is not null
 or not(new_permissions <@ array['orders.read','employees.read','inventory.read','analytics.read']::text[])
 then raise exception 'invalid account input' using errcode='22023'; end if;
 select * into previous from public.profiles where id=target_id for update;
 if not found then raise exception 'account not found' using errcode='P0002'; end if;
 if previous.role='admin' and previous.active and (new_role<>'admin' or not new_active)
 and not exists(select 1 from public.profiles where role='admin' and active and id<>target_id)
 then raise exception 'last active owner cannot be removed' using errcode='23514'; end if;
 update public.profiles set full_name=trim(new_name),role=new_role,active=new_active where id=target_id;
 delete from public.employee_permissions where employee_id=target_id;
 insert into public.employee_permissions(employee_id,permission)
 select target_id,p from (select distinct unnest(new_permissions) as p) s;
 insert into public.account_audit(actor_id,target_id,action,details)
 values(auth.uid(),target_id,'account.updated',jsonb_build_object(
 'previous_role',previous.role,'role',new_role,'previous_active',previous.active,
 'active',new_active,'permissions',new_permissions));
end $$;
revoke all on function public.manage_account(uuid,text,text,boolean,text[]) from public,anon;
grant execute on function public.manage_account(uuid,text,text,boolean,text[]) to authenticated;

-- Only the trusted server setup script can bootstrap; never a browser endpoint.
create function public.bootstrap_owner(target_id uuid,owner_name text)
returns void language plpgsql security definer set search_path=''
as $$ begin
 perform pg_catalog.pg_advisory_xact_lock(82461031);
 if exists(select 1 from public.profiles where role='admin')
 then raise exception 'owner already configured' using errcode='23514'; end if;
 if owner_name is null or char_length(trim(owner_name)) not between 2 and 100
 then raise exception 'invalid owner name' using errcode='22023'; end if;
 update public.profiles set role='admin',active=true,full_name=trim(owner_name) where id=target_id;
 if not found then raise exception 'account not found'; end if;
 insert into public.account_audit(actor_id,target_id,action) values(null,target_id,'owner.bootstrapped');
end $$;
revoke all on function public.bootstrap_owner(uuid,text) from public,anon,authenticated;
grant execute on function public.bootstrap_owner(uuid,text) to service_role;
commit;
