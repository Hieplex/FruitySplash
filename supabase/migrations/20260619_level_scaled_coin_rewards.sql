drop function if exists public.claim_level_completion(integer, integer, integer, integer);
drop function if exists public.claim_level_completion(integer, integer, integer, integer, integer);
drop function if exists public.claim_level_completion(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer);

create or replace function public.claim_level_completion(
  completed_level_id integer,
  earned_score integer,
  earned_stars integer,
  first_clear_reward_base integer default 40,
  first_clear_reward_per_level integer default 2,
  star1_reward_base integer default 10,
  star1_reward_per_level integer default 1,
  star2_reward_base integer default 15,
  star2_reward_per_level integer default 2,
  star3_reward_base integer default 25,
  star3_reward_per_level integer default 3
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
  safe_level_id integer := greatest(1, completed_level_id);
  level_index integer := greatest(0, safe_level_id - 1);
  first_clear_claimed boolean;
  level_first_clear jsonb;
  level_star_reward jsonb;
  safe_stars integer := least(3, greatest(0, earned_stars));
  rewarded_stars integer;
  new_star_reward integer := 0;
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

  first_clear_claimed := coalesce((level_first_clear ->> safe_level_id::text)::boolean, false);
  rewarded_stars := least(3, greatest(0, coalesce((level_star_reward ->> safe_level_id::text)::integer, 0)));

  if rewarded_stars < 1 and safe_stars >= 1 then
    new_star_reward := new_star_reward + greatest(0, star1_reward_base + level_index * star1_reward_per_level);
  end if;

  if rewarded_stars < 2 and safe_stars >= 2 then
    new_star_reward := new_star_reward + greatest(0, star2_reward_base + level_index * star2_reward_per_level);
  end if;

  if rewarded_stars < 3 and safe_stars >= 3 then
    new_star_reward := new_star_reward + greatest(0, star3_reward_base + level_index * star3_reward_per_level);
  end if;

  total_coin_reward :=
    case
      when first_clear_claimed then 0
      else greatest(0, first_clear_reward_base + level_index * first_clear_reward_per_level)
    end
    + new_star_reward;

  update public.player_economy
  set
    coins = player_economy.coins + total_coin_reward,
    reward_claims = jsonb_set(
      jsonb_set(
        coalesce(player_economy.reward_claims, '{}'::jsonb),
        array['levelFirstClear', safe_level_id::text],
        'true'::jsonb,
        true
      ),
      array['levelStarReward', safe_level_id::text],
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

grant execute on function public.claim_level_completion(
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) to authenticated;
