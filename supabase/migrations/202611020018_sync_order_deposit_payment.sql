begin;

-- When an in-progress order has only its deposit recorded, editing that
-- deposit must update paid_vnd too. Preserve completed and legacy payments.
do $migration$
declare definition text;
       old_line text:='  payload:=jsonb_set(payload,''{paid_vnd}'',to_jsonb(prior.paid_vnd),true);';
       new_block text:=E'  if prior.status=''completed'' or prior.paid_vnd<>prior.deposit_vnd then\n'
        ||E'   payload:=jsonb_set(payload,''{paid_vnd}'',to_jsonb(prior.paid_vnd),true);\n'
        ||E'  else\n'
        ||E'   payload:=jsonb_set(payload,''{paid_vnd}'',coalesce(payload->''deposit_vnd'',''0''::jsonb),true);\n'
        ||E'  end if;';
begin
 select pg_get_functiondef('public.save_order(jsonb,uuid,integer)'::regprocedure) into definition;
 if position('prior.paid_vnd<>prior.deposit_vnd' in definition)=0 then
  if position(old_line in definition)=0 then raise exception 'Could not find save_order payment preservation clause';end if;
  definition:=replace(definition,old_line,new_block);
  execute definition;
 end if;
end
$migration$;

commit;
