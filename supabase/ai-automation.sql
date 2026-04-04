-- ================================================
-- AEGIS INSURANCE — AI AUTOMATION + PREMIUM ENGINE
-- Run this after supabase/schema.sql
-- ================================================

create extension if not exists "uuid-ossp";

-- ================================================
-- AI TABLES
-- ================================================

create table if not exists public.claim_ai_queue (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid not null unique references public.claims(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_claim_ai_queue_status_next_attempt
  on public.claim_ai_queue(status, next_attempt_at, created_at);

create table if not exists public.claim_ai_evaluations (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid not null unique references public.claims(id) on delete cascade,
  suggested_decision text not null check (suggested_decision in ('approve', 'reject', 'manual_review')),
  applied_decision text check (applied_decision in ('approved', 'rejected', 'pending')),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  risk_score numeric(5,4) not null check (risk_score >= 0 and risk_score <= 1),
  rationale text not null,
  factors jsonb not null default '{}'::jsonb,
  model_provider text not null,
  model_name text not null,
  model_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_claim_ai_eval_decision
  on public.claim_ai_evaluations(suggested_decision, confidence desc);

create table if not exists public.claim_decision_audit (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  source text not null check (source in ('ai', 'admin')),
  decision text not null check (decision in ('approved', 'rejected', 'pending')),
  actor_id uuid references public.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_claim_decision_audit_claim_created
  on public.claim_decision_audit(claim_id, created_at desc);

-- ================================================
-- PREMIUM FUNCTIONS
-- ================================================

create or replace function public.tier_coverage_percent(p_tier text)
returns numeric
language sql
immutable
as $$
  select case p_tier
    when 'basic' then 0.50
    when 'standard' then 0.75
    when 'premium' then 1.00
    else 0.50
  end;
$$;

create or replace function public.calculate_driver_claim_cap(p_driver_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_avg_weekly numeric(10,2);
  v_cap numeric(10,2);
begin
  select dp.tier, coalesce(nullif(dp.avg_weekly_earnings, 0), 3000)
  into v_tier, v_avg_weekly
  from public.driver_profiles dp
  where dp.user_id = p_driver_id;

  if v_tier is null then
    return 1500;
  end if;

  v_cap := round(v_avg_weekly * public.tier_coverage_percent(v_tier), 2);
  return greatest(v_cap, 500);
end;
$$;

create or replace function public.recompute_driver_premium(p_driver_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.driver_profiles%rowtype;
  v_base numeric(10,2);
  v_tier_mult numeric(6,4);
  v_zone_mult numeric(6,4);
  v_behavior_mult numeric(6,4);
  v_claims_30d int;
  v_total_claims int;
  v_rejected_claims int;
  v_reject_ratio numeric(6,4);
  v_premium numeric(10,2);
begin
  select * into v_profile
  from public.driver_profiles
  where user_id = p_driver_id;

  if v_profile.user_id is null then
    return 0;
  end if;

  -- Base premium anchored on weekly earnings with a minimum floor.
  v_base := greatest(coalesce(v_profile.avg_weekly_earnings, 0) * 0.04, 60);

  v_tier_mult := case v_profile.tier
    when 'basic' then 1.00
    when 'standard' then 1.35
    when 'premium' then 1.80
    else 1.00
  end;

  select count(*) into v_claims_30d
  from public.claims c
  where c.driver_id = p_driver_id
    and c.filed_at >= now() - interval '30 days';

  select
    count(*),
    count(*) filter (where c.status = 'rejected')
  into v_total_claims, v_rejected_claims
  from public.claims c
  where c.driver_id = p_driver_id
    and c.filed_at >= now() - interval '90 days';

  v_reject_ratio := case when v_total_claims = 0 then 0 else v_rejected_claims::numeric / v_total_claims end;

  select coalesce(max(case de.severity
    when 'severe' then 1.35
    when 'moderate' then 1.18
    else 1.08
  end), 1.00)
  into v_zone_mult
  from public.disruption_events de
  where de.is_active = true
    and (
      (v_profile.city <> '' and lower(de.city) = lower(v_profile.city))
      or (v_profile.zone <> '' and lower(de.zone) = lower(v_profile.zone))
    );

  v_behavior_mult := least(1.45, 1 + (v_claims_30d * 0.04) + (v_reject_ratio * 0.12));

  v_premium := round(v_base * v_tier_mult * v_zone_mult * v_behavior_mult, 2);

  update public.driver_profiles
  set premium_amount = v_premium,
      tier_updated_at = now()
  where user_id = p_driver_id;

  return v_premium;
end;
$$;

create or replace function public.recompute_all_driver_premiums()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in select user_id from public.driver_profiles loop
    perform public.recompute_driver_premium(r.user_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Refresh premium whenever a driver profile changes key premium factors.
create or replace function public.trg_recompute_premium_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_driver_premium(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_recompute_premium_profile on public.driver_profiles;
create trigger trg_recompute_premium_profile
after insert or update of tier, avg_weekly_earnings, zone, city
on public.driver_profiles
for each row
execute function public.trg_recompute_premium_from_profile();

-- Refresh premium when claim behavior changes.
create or replace function public.trg_recompute_premium_from_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_driver_premium(new.driver_id);
  return new;
end;
$$;

drop trigger if exists trg_recompute_premium_claim on public.claims;
create trigger trg_recompute_premium_claim
after insert or update of status on public.claims
for each row
execute function public.trg_recompute_premium_from_claim();

-- ================================================
-- AI QUEUE + DECISION FUNCTIONS
-- ================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_claim_ai_queue_touch on public.claim_ai_queue;
create trigger trg_claim_ai_queue_touch
before update on public.claim_ai_queue
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_claim_ai_eval_touch on public.claim_ai_evaluations;
create trigger trg_claim_ai_eval_touch
before update on public.claim_ai_evaluations
for each row
execute function public.touch_updated_at();

create or replace function public.enqueue_claim_for_ai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.claim_ai_queue (claim_id, status, next_attempt_at)
  values (new.id, 'pending', now())
  on conflict (claim_id) do update
  set status = 'pending', next_attempt_at = now(), last_error = null;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_claim_for_ai on public.claims;
create trigger trg_enqueue_claim_for_ai
after insert on public.claims
for each row execute function public.enqueue_claim_for_ai();

create or replace function public.claim_ai_dequeue(p_batch_size int default 10)
returns table(queue_id uuid, claim_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'claim_ai_dequeue is service_role only';
  end if;

  return query
  with picked as (
    select q.id, q.claim_id
    from public.claim_ai_queue q
    where q.status in ('pending', 'failed')
      and (q.next_attempt_at is null or q.next_attempt_at <= now())
      and q.attempts < 5
    order by q.created_at
    limit greatest(p_batch_size, 1)
    for update skip locked
  )
  update public.claim_ai_queue q
  set status = 'processing',
      attempts = q.attempts + 1,
      updated_at = now(),
      last_error = null
  from picked
  where q.id = picked.id
  returning q.id, q.claim_id;
end;
$$;

create or replace function public.claim_ai_mark_failed(
  p_queue_id uuid,
  p_error text,
  p_retry_after_seconds int default 300
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'claim_ai_mark_failed is service_role only';
  end if;

  update public.claim_ai_queue
  set status = 'failed',
      last_error = left(coalesce(p_error, 'unknown worker failure'), 800),
      next_attempt_at = now() + make_interval(secs => greatest(p_retry_after_seconds, 60))
  where id = p_queue_id;
end;
$$;

create or replace function public.apply_ai_claim_decision(
  p_queue_id uuid,
  p_claim_id uuid,
  p_suggested_decision text,
  p_confidence numeric,
  p_risk_score numeric,
  p_rationale text,
  p_factors jsonb default '{}'::jsonb,
  p_model_provider text default 'rules',
  p_model_name text default 'deterministic-baseline',
  p_model_version text default 'v1'
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cap numeric(10,2);
  v_claimed numeric(10,2);
  v_approved numeric(10,2);
  v_applied text := 'pending';
begin
  if auth.role() <> 'service_role' then
    raise exception 'apply_ai_claim_decision is service_role only';
  end if;

  if p_suggested_decision not in ('approve', 'reject', 'manual_review') then
    raise exception 'Invalid AI decision: %', p_suggested_decision;
  end if;

  insert into public.claim_ai_evaluations (
    claim_id,
    suggested_decision,
    confidence,
    risk_score,
    rationale,
    factors,
    model_provider,
    model_name,
    model_version
  )
  values (
    p_claim_id,
    p_suggested_decision,
    p_confidence,
    p_risk_score,
    left(coalesce(p_rationale, ''), 1000),
    coalesce(p_factors, '{}'::jsonb),
    p_model_provider,
    p_model_name,
    p_model_version
  )
  on conflict (claim_id) do update
  set suggested_decision = excluded.suggested_decision,
      confidence = excluded.confidence,
      risk_score = excluded.risk_score,
      rationale = excluded.rationale,
      factors = excluded.factors,
      model_provider = excluded.model_provider,
      model_name = excluded.model_name,
      model_version = excluded.model_version,
      updated_at = now();

  if p_suggested_decision = 'approve' then
    select c.claimed_amount, public.calculate_driver_claim_cap(c.driver_id)
      into v_claimed, v_cap
    from public.claims c
    where c.id = p_claim_id;

    v_approved := least(coalesce(v_claimed, 0), coalesce(v_cap, 0));

    update public.claims
    set status = 'approved',
        approved_amount = v_approved,
        rejection_reason = null,
        reviewed_by = null,
        reviewed_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'ai_decision', 'approve',
          'ai_confidence', p_confidence,
          'ai_risk_score', p_risk_score,
          'ai_rationale', left(p_rationale, 500)
        )
    where id = p_claim_id
      and status = 'pending';

    v_applied := 'approved';
  elsif p_suggested_decision = 'reject' then
    update public.claims
    set status = 'rejected',
        approved_amount = 0,
        rejection_reason = left(coalesce(p_rationale, 'Rejected by AI policy checks.'), 500),
        reviewed_by = null,
        reviewed_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'ai_decision', 'reject',
          'ai_confidence', p_confidence,
          'ai_risk_score', p_risk_score
        )
    where id = p_claim_id
      and status = 'pending';

    v_applied := 'rejected';
  else
    -- Leave pending for manual review.
    update public.claims
    set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'ai_decision', 'manual_review',
      'ai_confidence', p_confidence,
      'ai_risk_score', p_risk_score,
      'ai_rationale', left(p_rationale, 500)
    )
    where id = p_claim_id
      and status = 'pending';

    v_applied := 'pending';
  end if;

  update public.claim_ai_evaluations
  set applied_decision = v_applied
  where claim_id = p_claim_id;

  insert into public.claim_decision_audit (claim_id, source, decision, actor_id, reason, metadata)
  values (
    p_claim_id,
    'ai',
    v_applied,
    null,
    left(coalesce(p_rationale, ''), 500),
    jsonb_build_object('confidence', p_confidence, 'risk_score', p_risk_score)
  );

  update public.claim_ai_queue
  set status = 'completed',
      next_attempt_at = null,
      last_error = null,
      updated_at = now()
  where id = p_queue_id;

  return v_applied;
end;
$$;

-- ================================================
-- RLS FOR NEW TABLES
-- ================================================

alter table public.claim_ai_queue enable row level security;
alter table public.claim_ai_evaluations enable row level security;
alter table public.claim_decision_audit enable row level security;

drop policy if exists "Admins read ai queue" on public.claim_ai_queue;
create policy "Admins read ai queue" on public.claim_ai_queue
  for select using (public.is_admin());

drop policy if exists "Admins read ai evaluations" on public.claim_ai_evaluations;
create policy "Admins read ai evaluations" on public.claim_ai_evaluations
  for select using (public.is_admin());

drop policy if exists "Managers read company ai evaluations" on public.claim_ai_evaluations;
create policy "Managers read company ai evaluations" on public.claim_ai_evaluations
  for select using (
    public.is_manager()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id
        and c.company_id = public.get_user_company()
    )
  );

drop policy if exists "Drivers read own ai evaluations" on public.claim_ai_evaluations;
create policy "Drivers read own ai evaluations" on public.claim_ai_evaluations
  for select using (
    public.is_driver()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id
        and c.driver_id = auth.uid()
    )
  );

drop policy if exists "Admins read decision audit" on public.claim_decision_audit;
create policy "Admins read decision audit" on public.claim_decision_audit
  for select using (public.is_admin());

drop policy if exists "Managers read company decision audit" on public.claim_decision_audit;
create policy "Managers read company decision audit" on public.claim_decision_audit
  for select using (
    public.is_manager()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id
        and c.company_id = public.get_user_company()
    )
  );

drop policy if exists "Drivers read own decision audit" on public.claim_decision_audit;
create policy "Drivers read own decision audit" on public.claim_decision_audit
  for select using (
    public.is_driver()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id
        and c.driver_id = auth.uid()
    )
  );

-- Initialize all existing driver premiums once.
select public.recompute_all_driver_premiums();

-- Backfill queue for existing pending claims.
insert into public.claim_ai_queue (claim_id, status, next_attempt_at)
select c.id, 'pending', now()
from public.claims c
where c.status = 'pending'
on conflict (claim_id) do nothing;
