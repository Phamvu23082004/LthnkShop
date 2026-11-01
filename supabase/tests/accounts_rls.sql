-- Run against a LOCAL disposable Supabase database after migration. Everything rolls back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','owner@rls.test','{"role":"admin","full_name":"Owner Test"}'),
 ('10000000-0000-4000-8000-000000000002','staff@rls.test','{"role":"admin","active":true,"full_name":"Staff Test"}'),
 ('10000000-0000-4000-8000-000000000003','other@rls.test','{"full_name":"Other Test"}');
do $$ begin
 if exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000002' and (role<>'staff' or active))
 then raise exception 'FAIL metadata escalates role'; end if;
end $$;
select public.bootstrap_owner('10000000-0000-4000-8000-000000000001','Owner Test');
update public.profiles set active=true where id in ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003');
set local role anon;
do $$ begin
 begin perform 1 from public.profiles; raise exception 'FAIL anonymous read';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.profiles)<>1 then raise exception 'FAIL staff isolation'; end if;
 if private.is_owner() then raise exception 'FAIL staff owner check'; end if;
 if private.has_permission('analytics.read') then raise exception 'FAIL default capability'; end if;
 begin
 update public.profiles set role='admin' where id=auth.uid();
 raise exception 'FAIL direct self escalation';
 exception when insufficient_privilege then null; end;
 begin
 perform public.manage_account(auth.uid(),'Staff Test','admin',true,array[]::text[]);
 raise exception 'FAIL RPC self escalation';
 exception when insufficient_privilege then null; end;
 begin perform public.bootstrap_owner(auth.uid(),'Staff Test');raise exception 'FAIL bootstrap exposed';
 exception when insufficient_privilege then null;end;
 if (select count(*) from public.account_audit)<>0 then raise exception 'FAIL staff audit access';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.profiles)<>3 then raise exception 'FAIL owner visibility';end if;
 begin
 perform public.manage_account(auth.uid(),'Owner Test','staff',true,array[]::text[]);
 raise exception 'FAIL last owner downgrade';
 exception when check_violation then null;end;
 begin
 perform public.manage_account(auth.uid(),'Owner Test','admin',false,array[]::text[]);
 raise exception 'FAIL last owner disable';
 exception when check_violation then null;end;
 begin
 perform public.manage_account('10000000-0000-4000-8000-000000000002','Staff Test','staff',true,array['unknown.permission']);
 raise exception 'FAIL unknown permission';
 exception when invalid_parameter_value then null;end;
end $$;
select public.manage_account('10000000-0000-4000-8000-000000000002','Staff Test','staff',true,array['orders.read']);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin if not private.has_permission('orders.read') then raise exception 'FAIL capability grant';end if;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.manage_account('10000000-0000-4000-8000-000000000002','Staff Test','staff',false,array['orders.read']);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.profiles) then raise exception 'FAIL inactive read';end if;
 if private.has_permission('orders.read') then raise exception 'FAIL inactive capability';end if;
end $$;
rollback;
