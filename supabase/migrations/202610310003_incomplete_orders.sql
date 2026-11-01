begin;
-- Preorders can arrive before contact details or the original order date are known.
alter table public.orders alter column ordered_on drop not null;
alter table public.orders drop constraint if exists orders_phone_check;
alter table public.orders add constraint orders_phone_check check(phone='' or phone ~ '^[0-9+(). -]{6,25}$');
alter table public.orders drop constraint if exists orders_address_check;
alter table public.orders add constraint orders_address_check check(address='' or char_length(address) between 3 and 500);
create index if not exists orders_due_on_idx on public.orders(due_on);
commit;
