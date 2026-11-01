begin;

-- Remove the legacy channel field. The platform is captured separately by
-- sales_platform, and order search no longer indexes channel.
do $remove_order_channel_from_writer$
declare definition text; original_definition text;
begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='channel') then
  select pg_get_functiondef('private.save_order_snapshot(jsonb,uuid,integer)'::regprocedure)
  into definition;
  original_definition:=definition;

  -- pg_get_functiondef may fold or indent lines differently across versions.
  -- Remove the channel search term, insert column/value and update assignment
  -- while allowing arbitrary whitespace between tokens.
  definition:=regexp_replace(definition,
   'payload->>''channel''\s*,', '', 'g');
  definition:=regexp_replace(definition,
   'channel\s*,\s*shipping_vnd', 'shipping_vnd', 'g');
  definition:=regexp_replace(definition,
   'trim\(payload->>''address''\)\s*,\s*trim\(payload->>''channel''\)\s*,\s*shipping',
   'trim(payload->>''address''),shipping', 'g');
  definition:=regexp_replace(definition,
   'channel\s*=\s*trim\(payload->>''channel''\)\s*,', '', 'g');

  if definition=original_definition or position('channel' in definition)>0 then
   raise exception 'Could not remove channel references from private.save_order_snapshot';
  end if;
  execute definition;
 end if;
end
$remove_order_channel_from_writer$;

alter table public.orders drop column if exists channel;

commit;
