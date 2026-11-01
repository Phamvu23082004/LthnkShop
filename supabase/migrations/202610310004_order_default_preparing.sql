begin;
-- Only new orders change default; existing statuses and history stay intact.
alter table public.orders alter column status set default 'preparing';
do $status_default$
declare definition text;
begin
 select pg_get_functiondef('public.save_order(jsonb,uuid,integer)'::regprocedure) into definition;
 definition:=replace(definition,'select result_id,''pending'',auth.uid()','select result_id,''preparing'',auth.uid()');
 execute definition;
end $status_default$;
commit;
