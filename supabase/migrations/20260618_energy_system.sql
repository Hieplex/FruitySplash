alter table public.player_economy
add column if not exists energy_current integer not null default 30 check (energy_current >= 0),
add column if not exists energy_max integer not null default 30 check (energy_max >= 1 and energy_max <= 30),
add column if not exists energy_last_refill_at timestamptz not null default timezone('utc', now());

create or replace function public.apply_player_energy_refill(
  refill_interval_ms integer default 600000
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
  row_result public.player_economy;
  refill_count integer;
  next_energy integer;
  next_refill_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.ensure_player_economy();

  select *
  into row_result
  from public.player_economy
  where user_id = current_user_id;

  if row_result.energy_current >= row_result.energy_max then
    update public.player_economy
    set energy_current = energy_max,
        energy_last_refill_at = timezone('utc', now())
    where user_id = current_user_id
    returning * into row_result;
  else
    refill_count := greatest(
      0,
      floor(
        extract(epoch from (timezone('utc', now()) - row_result.energy_last_refill_at)) * 1000
        / greatest(1, refill_interval_ms)
      )::integer
    );

    if refill_count > 0 then
      next_energy := least(row_result.energy_max, row_result.energy_current + refill_count);
      next_refill_at := case
        when next_energy >= row_result.energy_max then timezone('utc', now())
        else row_result.energy_last_refill_at + (refill_count * refill_interval_ms) * interval '1 millisecond'
      end;

      update public.player_economy
      set energy_current = next_energy,
          energy_last_refill_at = next_refill_at
      where user_id = current_user_id
      returning * into row_result;
    end if;
  end if;

  return query
  select
    row_result.coins,
    row_result.boosters,
    row_result.energy_current,
    row_result.energy_max,
    row_result.energy_last_refill_at;
end;
$$;

grant execute on function public.apply_player_energy_refill(integer) to authenticated;

create or replace function public.spend_level_energy(
  refill_interval_ms integer default 600000
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
  row_result public.player_economy;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.apply_player_energy_refill(refill_interval_ms);

  update public.player_economy
  set energy_current = energy_current - 1
  where user_id = current_user_id
    and energy_current > 0
  returning * into row_result;

  if row_result.user_id is null then
    return;
  end if;

  return query
  select
    row_result.coins,
    row_result.boosters,
    row_result.energy_current,
    row_result.energy_max,
    row_result.energy_last_refill_at;
end;
$$;

grant execute on function public.spend_level_energy(integer) to authenticated;

drop function if exists public.buy_booster_pack(text, integer, integer);

create or replace function public.buy_booster_pack(
  booster_key text,
  coin_cost integer,
  booster_amount integer
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
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.apply_player_energy_refill();

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
  returning
    player_economy.coins,
    player_economy.boosters,
    player_economy.energy_current,
    player_economy.energy_max,
    player_economy.energy_last_refill_at;
end;
$$;

grant execute on function public.buy_booster_pack(text, integer, integer) to authenticated;

drop function if exists public.consume_booster_item(text);

create or replace function public.consume_booster_item(
  booster_key text
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
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.apply_player_energy_refill();

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
  returning
    player_economy.coins,
    player_economy.boosters,
    player_economy.energy_current,
    player_economy.energy_max,
    player_economy.energy_last_refill_at;
end;
$$;

grant execute on function public.consume_booster_item(text) to authenticated;

drop function if exists public.claim_level_completion(integer, integer, integer, integer);

create or replace function public.claim_level_completion(
  completed_level_id integer,
  earned_score integer,
  earned_stars integer,
  first_clear_reward integer default 50
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
  first_clear_claimed boolean;
  level_first_clear jsonb;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.apply_player_energy_refill();

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

grant execute on function public.claim_level_completion(integer, integer, integer, integer) to authenticated;
