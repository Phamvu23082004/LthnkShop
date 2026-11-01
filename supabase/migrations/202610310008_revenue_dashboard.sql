begin;
-- Aggregates only; no customer details or raw order rows are exposed.
create or replace function public.get_revenue_dashboard(start_date date default null,end_date date default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.has_permission('analytics.read') then raise exception 'forbidden' using errcode='42501';end if;
 if (start_date is null)<>(end_date is null) or (start_date is not null and
 (start_date>=end_date or start_date<'2000-01-01'::date or end_date>'2101-01-01'::date))
 then raise exception 'invalid period' using errcode='22023';end if;
 with selected as materialized(
 select * from public.orders
 where start_date is null or (ordered_on>=start_date and ordered_on<end_date)
 ), bounds as (
 select date_trunc('month',coalesce(start_date,min(ordered_on),(now() at time zone 'Asia/Ho_Chi_Minh')::date))::date as first_month,
 date_trunc('month',coalesce(end_date-1,max(ordered_on),(now() at time zone 'Asia/Ho_Chi_Minh')::date))::date as last_month from selected
 ), months as (
 select generate_series(first_month,last_month,interval '1 month')::date as month from bounds
 ), monthly_totals as (
 select date_trunc('month',ordered_on)::date as month,
 coalesce(sum(total_vnd) filter(where status<>'cancelled'),0)::text as order_value,
 coalesce(sum(paid_vnd),0)::text as received,
 coalesce(sum(deposit_vnd),0)::text as deposits,
 coalesce(sum(remaining_vnd) filter(where status<>'cancelled'),0)::text as outstanding
 from selected where ordered_on is not null group by 1
 ), best as (
 select i.product_name,i.product_type,sum(i.quantity)::text as quantity,
 sum(i.line_total_vnd)::text as item_value
 from public.order_items i join selected o on o.id=i.order_id where o.status<>'cancelled'
 group by i.product_name,i.product_type
 order by sum(i.quantity) desc,sum(i.line_total_vnd) desc,i.product_name limit 10
 )
 select jsonb_build_object(
 'summary',(select jsonb_build_object(
 'orders',count(*)::text,
 'processing',count(*) filter(where status not in ('completed','cancelled'))::text,
 'completed',count(*) filter(where status='completed')::text,
 'cancelled',count(*) filter(where status='cancelled')::text,
 'order_value',coalesce(sum(total_vnd) filter(where status<>'cancelled'),0)::text,
 'completed_value',coalesce(sum(total_vnd) filter(where status='completed'),0)::text,
 'received',coalesce(sum(paid_vnd),0)::text,
 'deposits',coalesce(sum(deposit_vnd),0)::text,
 'outstanding',coalesce(sum(remaining_vnd) filter(where status<>'cancelled'),0)::text,
 'cancelled_received',coalesce(sum(paid_vnd) filter(where status='cancelled'),0)::text,
 'undated',count(*) filter(where ordered_on is null)::text
 ) from selected),
 'monthly',(select coalesce(jsonb_agg(jsonb_build_object(
 'month',to_char(m.month,'YYYY-MM'),
 'order_value',coalesce(t.order_value,'0'),'received',coalesce(t.received,'0'),
 'deposits',coalesce(t.deposits,'0'),'outstanding',coalesce(t.outstanding,'0')
 ) order by m.month),'[]'::jsonb) from months m left join monthly_totals t on t.month=m.month),
 'bestsellers',(select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) from best b),
 'excluded_undated',(select count(*)::text from public.orders where ordered_on is null and start_date is not null)
 ) into result;
 return result;
end $$;
revoke all on function public.get_revenue_dashboard(date,date) from public,anon;
grant execute on function public.get_revenue_dashboard(date,date) to authenticated;
commit;
