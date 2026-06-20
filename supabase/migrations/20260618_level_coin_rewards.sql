drop function if exists public.claim_level_completion(integer, integer, integer, integer);
drop function if exists public.claim_level_completion(integer, integer, integer, integer, integer);

create or replace function public.claim_level_completion(
  completed_level_id integer,
  earned_score integer,
  earned_stars integer,
  first_clear_reward integer default 50,
  star_reward integer default 10
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
  level_star_reward jsonb;
  safe_stars integer := least(3, greatest(0, earned_stars));
  rewarded_stars integer;
  new_star_count integer;
  total_coin_reward integer;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform public.apply_player_energy_refill();

  select
    coalesce(reward_claims -> 'levelFirstClear', '{}'::jsonb),
    coalesce(reward_claims -> 'levelStarReward', '{}'::jsonb)
  into level_first_clear, level_star_reward
  from public.player_economy
  where user_id = current_user_id;

  first_clear_claimed := coalesce((level_first_clear ->> completed_level_id::text)::boolean, false);
  rewarded_stars := least(3, greatest(0, coalesce((level_star_reward ->> completed_level_id::text)::integer, 0)));
  new_star_count := greatest(0, safe_stars - rewarded_stars);
  total_coin_reward :=
    case when first_clear_claimed then 0 else greatest(0, first_clear_reward) end
    + new_star_count * greatest(0, star_reward);

  update public.player_economy
  set
    coins = player_economy.coins + total_coin_reward,
    reward_claims = jsonb_set(
      jsonb_set(
        coalesce(player_economy.reward_claims, '{}'::jsonb),
        array['levelFirstClear', completed_level_id::text],
        'true'::jsonb,
        true
      ),
      array['levelStarReward', completed_level_id::text],
      to_jsonb(greatest(rewarded_stars, safe_stars)),
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

grant execute on function public.claim_level_completion(integer, integer, integer, integer, integer) to authenticated;
