create table if not exists public.player_economy (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  boosters jsonb not null default jsonb_build_object(
    'bomb', 3,
    'lineRocket', 3,
    'fruityCross', 3,
    'lightningFruits', 3,
    'hammer', 0
  ),
  reward_claims jsonb not null default jsonb_build_object('levelFirstClear', jsonb_build_object()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.player_economy enable row level security;

create policy "player_economy_select_own"
on public.player_economy
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "player_economy_insert_own"
on public.player_economy
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "player_economy_update_own"
on public.player_economy
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.touch_player_economy_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists player_economy_touch_updated_at on public.player_economy;
create trigger player_economy_touch_updated_at
before update on public.player_economy
for each row
execute procedure public.touch_player_economy_updated_at();

create or replace function public.ensure_player_economy()
returns public.player_economy
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  row_result public.player_economy;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.player_economy (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select *
  into row_result
  from public.player_economy
  where user_id = current_user_id;

  return row_result;
end;
$$;

grant execute on function public.ensure_player_economy() to authenticated;

create or replace function public.buy_booster_pack(
  booster_key text,
  coin_cost integer,
  booster_amount integer
)
returns table (coins integer, boosters jsonb)
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.ensure_player_economy();

  return query
  update public.player_economy
  set
    coins = player_economy.coins - greatest(0, coin_cost),
    boosters = jsonb_set(
      player_economy.boosters,
      array[booster_key],
      to_jsonb(coalesce((player_economy.boosters ->> booster_key)::integer, 0) + greatest(0, booster_amount)),
      true
    )
  where
    user_id = current_user_id
    and coin_cost > 0
    and booster_amount > 0
    and player_economy.coins >= coin_cost
  returning player_economy.coins, player_economy.boosters;
end;
$$;

grant execute on function public.buy_booster_pack(text, integer, integer) to authenticated;

create or replace function public.consume_booster_item(
  booster_key text
)
returns table (coins integer, boosters jsonb)
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.ensure_player_economy();

  return query
  update public.player_economy
  set boosters = jsonb_set(
    player_economy.boosters,
    array[booster_key],
    to_jsonb(greatest(coalesce((player_economy.boosters ->> booster_key)::integer, 0) - 1, 0)),
    true
  )
  where
    user_id = current_user_id
    and coalesce((player_economy.boosters ->> booster_key)::integer, 0) > 0
  returning player_economy.coins, player_economy.boosters;
end;
$$;

grant execute on function public.consume_booster_item(text) to authenticated;

create or replace function public.claim_level_completion(
  completed_level_id integer,
  earned_score integer,
  earned_stars integer,
  first_clear_reward integer default 50
)
returns table (coins integer, boosters jsonb)
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  first_clear_claimed boolean;
  level_first_clear jsonb;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.ensure_player_economy();

  select coalesce(reward_claims -> 'levelFirstClear', '{}'::jsonb)
  into level_first_clear
  from public.player_economy
  where user_id = current_user_id;

  first_clear_claimed := coalesce((level_first_clear ->> completed_level_id::text)::boolean, false);

  update public.player_economy
  set
    coins = player_economy.coins + case
      when first_clear_claimed then 0
      else greatest(0, first_clear_reward)
    end,
    reward_claims = jsonb_set(
      coalesce(player_economy.reward_claims, '{}'::jsonb),
      array['levelFirstClear', completed_level_id::text],
      'true'::jsonb,
      true
    )
  where user_id = current_user_id;

  return query
  select player_economy.coins, player_economy.boosters
  from public.player_economy
  where user_id = current_user_id;
end;
$$;

grant execute on function public.claim_level_completion(integer, integer, integer, integer) to authenticated;
