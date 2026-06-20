create table if not exists public.player_coin_purchases (
  transaction_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  coin_amount integer not null check (coin_amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.player_coin_purchases enable row level security;

create policy "player_coin_purchases_select_own"
on public.player_coin_purchases
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "player_coin_purchases_insert_own"
on public.player_coin_purchases
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create or replace function public.grant_purchased_coin_pack(
  product_id text,
  transaction_id text,
  coin_amount integer
)
returns table (
  coins integer,
  boosters jsonb,
  energy_current integer,
  energy_max integer,
  energy_last_refill_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_purchase_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if product_id is null or btrim(product_id) = '' then
    raise exception 'product_id is required';
  end if;

  if transaction_id is null or btrim(transaction_id) = '' then
    raise exception 'transaction_id is required';
  end if;

  if coin_amount <= 0 then
    raise exception 'coin_amount must be positive';
  end if;

  perform public.apply_player_energy_refill();

  insert into public.player_coin_purchases (transaction_id, user_id, product_id, coin_amount)
  values (transaction_id, current_user_id, product_id, coin_amount)
  on conflict (transaction_id) do nothing;

  get diagnostics inserted_purchase_count = row_count;

  if inserted_purchase_count > 0 then
    update public.player_economy
    set coins = least(999999, player_economy.coins + coin_amount)
    where user_id = current_user_id;
  end if;

  return query
  select
    player_economy.coins,
    player_economy.boosters,
    player_economy.energy_current,
    player_economy.energy_max,
    player_economy.energy_last_refill_at
  from public.player_economy
  where user_id = current_user_id;
end;
$$;

grant execute on function public.grant_purchased_coin_pack(text, text, integer) to authenticated;
