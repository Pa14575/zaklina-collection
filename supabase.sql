create table if not exists public.products (
  id bigint primary key,
  name text not null,
  price numeric(12,2) not null default 0,
  sizes text default '',
  image text default ''
);

create table if not exists public.settings (
  id integer primary key default 1,
  momo text default '',
  phone text default '0559891283'
);

create table if not exists public.orders (
  id text primary key,
  name text not null,
  phone text not null,
  location text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  status text not null default 'Awaiting payment confirmation',
  created_at timestamptz not null default now()
);

insert into public.settings (id,momo,phone) values (1,'','0559891283')
on conflict (id) do nothing;

alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;

drop policy if exists "public read products" on public.products;
drop policy if exists "public read settings" on public.settings;
drop policy if exists "public create orders" on public.orders;
drop policy if exists "owner manage products" on public.products;
drop policy if exists "owner manage settings" on public.settings;
drop policy if exists "owner read orders" on public.orders;
drop policy if exists "owner update orders" on public.orders;
drop policy if exists "authenticated manage products" on public.products;
drop policy if exists "authenticated manage settings" on public.settings;
drop policy if exists "authenticated manage orders" on public.orders;

create policy "public read products" on public.products for select using (true);
create policy "public read settings" on public.settings for select using (true);
create policy "public create orders" on public.orders for insert with check (true);

-- Only the owner phone +233559891283 can create, edit or delete shop products.
create policy "owner manage products" on public.products for all to authenticated
using ((auth.jwt() ->> 'phone') = '+233559891283')
with check ((auth.jwt() ->> 'phone') = '+233559891283');

-- Only the owner can change public shop settings.
create policy "owner manage settings" on public.settings for all to authenticated
using ((auth.jwt() ->> 'phone') = '+233559891283')
with check ((auth.jwt() ->> 'phone') = '+233559891283' OR (auth.jwt() ->> 'phone') = '+233559891283');

-- Only the owner can view/update customer orders.
create policy "owner read orders" on public.orders for select to authenticated
using ((auth.jwt() ->> 'phone') = '+233559891283');
create policy "owner update orders" on public.orders for update to authenticated
using ((auth.jwt() ->> 'phone') = '+233559891283')
with check ((auth.jwt() ->> 'phone') = '+233559891283');

-- Public product image bucket
insert into storage.buckets (id,name,public) values ('product-images','product-images',true)
on conflict (id) do update set public=true;

drop policy if exists "authenticated upload product images" on storage.objects;
drop policy if exists "authenticated update product images" on storage.objects;
drop policy if exists "authenticated delete product images" on storage.objects;
drop policy if exists "owner upload product images" on storage.objects;
drop policy if exists "owner update product images" on storage.objects;
drop policy if exists "owner delete product images" on storage.objects;
create policy "owner upload product images" on storage.objects for insert to authenticated with check (bucket_id='product-images' and (auth.jwt() ->> 'phone') = '+233559891283');
create policy "owner update product images" on storage.objects for update to authenticated using (bucket_id='product-images' and (auth.jwt() ->> 'phone') = '+233559891283') with check (bucket_id='product-images' and (auth.jwt() ->> 'phone') = '+233559891283');
create policy "owner delete product images" on storage.objects for delete to authenticated using (bucket_id='product-images' and (auth.jwt() ->> 'phone') = '+233559891283');
