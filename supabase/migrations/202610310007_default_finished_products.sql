begin;
-- Preserve existing product IDs, variants, prices and active flags.
lock table public.products in share row exclusive mode;
insert into public.products(name,product_type)
select seed.name,'finished_product'
from (values ('Twinkle'),('Bonet'),('Khăn'),('Túi'),('Bikini'),('Khác')) as seed(name)
where not exists (
 select 1 from public.products p
 where p.product_type='finished_product' and lower(trim(p.name))=lower(seed.name)
);
commit;
