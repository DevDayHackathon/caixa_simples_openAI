create extension if not exists pgcrypto;

create table if not exists public.agent_tasks (
  id text primary key,
  business_id text not null,
  target_id text not null,
  kind text not null check (kind in ('payment_reminder','collection_followup','cash_review')),
  due_at timestamptz not null,
  status text not null check (status in ('pending','running','completed','cancelled','failed')),
  version integer not null check (version > 0),
  dedup_key text not null,
  stop_condition text not null check (length(trim(stop_condition)) > 0),
  timezone text not null check (timezone = 'America/Sao_Paulo'),
  lead_time_minutes integer check (lead_time_minutes is null or lead_time_minutes >= 0),
  scheduling_reason text not null check (length(trim(scheduling_reason)) > 0),
  schedule_source text not null check (schedule_source in ('user','agent','default')),
  eligible_at timestamptz,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_tasks_due_idx on public.agent_tasks(status, due_at, eligible_at) where status in ('pending','running');
create unique index if not exists agent_tasks_active_dedup_idx on public.agent_tasks(dedup_key) where status in ('pending','running');

create table if not exists public.agent_task_runs (
  task_id text not null references public.agent_tasks(id) on delete cascade,
  scheduled_due_at timestamptz not null,
  status text not null check (status in ('running','completed','failed','pending')),
  attempt integer not null default 1 check (attempt >= 1),
  lease_until timestamptz not null,
  error text,
  updated_at timestamptz not null default now(),
  primary key(task_id, scheduled_due_at)
);

create table if not exists public.agent_notifications (
  id text primary key,
  business_id text not null,
  occurrence_key text not null unique,
  target_id text not null,
  kind text not null,
  title text not null,
  explanation text not null,
  proposal_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.agent_contexts (
  session_id text primary key,
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array'),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_rate_limits (
  scope text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key(scope, window_start)
);

create table if not exists public.agent_dispatch_leases (
  id integer primary key check (id = 1),
  lease_until timestamptz not null default '-infinity'
);
insert into public.agent_dispatch_leases(id) values (1) on conflict do nothing;

alter table public.agent_tasks enable row level security;
alter table public.agent_task_runs enable row level security;
alter table public.agent_notifications enable row level security;
alter table public.agent_contexts enable row level security;
alter table public.agent_rate_limits enable row level security;
alter table public.agent_dispatch_leases enable row level security;

create or replace function public.schedule_agent_task(p_task jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare existing public.agent_tasks; saved public.agent_tasks;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_task->>'dedup_key', 0));
  select * into existing from public.agent_tasks where dedup_key = p_task->>'dedup_key' and status in ('pending','running') for update;
  if found then
    if existing.due_at = (p_task->>'due_at')::timestamptz then
      return to_jsonb(existing) - 'context' - 'created_at' - 'updated_at';
    end if;
    update public.agent_tasks set status='cancelled', version=version+1, updated_at=now() where id=existing.id;
  end if;
  insert into public.agent_tasks(id,business_id,target_id,kind,due_at,status,version,dedup_key,stop_condition,timezone,
    lead_time_minutes,scheduling_reason,schedule_source,eligible_at)
  values(p_task->>'id',p_task->>'business_id',p_task->>'target_id',p_task->>'kind',(p_task->>'due_at')::timestamptz,
    p_task->>'status',(p_task->>'version')::int,p_task->>'dedup_key',p_task->>'stop_condition',p_task->>'timezone',
    nullif(p_task->>'lead_time_minutes','null')::int,p_task->>'scheduling_reason',p_task->>'schedule_source',nullif(p_task->>'eligible_at','')::timestamptz)
  returning * into saved;
  return to_jsonb(saved) - 'context' - 'created_at' - 'updated_at';
end $$;

create or replace function public.transition_agent_task(p_task_id text, p_expected_version int, p_next_status text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare saved public.agent_tasks;
begin
  update public.agent_tasks set status=p_next_status, version=version+1, updated_at=now()
  where id=p_task_id and version=p_expected_version and status in ('pending','failed') and p_next_status='cancelled'
  returning * into saved;
  if not found then raise exception 'Tarefa alterada; recarregue o contexto.' using errcode='P0001'; end if;
  return to_jsonb(saved) - 'context' - 'created_at' - 'updated_at';
end $$;

create or replace function public.claim_due_agent_tasks(p_now timestamptz, p_limit int default 5, p_lease_seconds int default 120)
returns table(task jsonb, occurrence_key text, attempt int, lease_until timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare candidate public.agent_tasks; run public.agent_task_runs; acquired_at timestamptz := clock_timestamp();
begin
  for candidate in
    select t.* from public.agent_tasks t
    left join public.agent_task_runs r on r.task_id=t.id and r.scheduled_due_at=t.due_at
    where t.status in ('pending','running') and t.due_at <= p_now and coalesce(t.eligible_at, t.due_at) <= p_now
      and (r.task_id is null or (r.status <> 'completed' and r.lease_until <= p_now and coalesce(t.eligible_at,r.updated_at) <= p_now))
    order by t.due_at,t.id for update of t skip locked limit least(greatest(p_limit,0),5)
  loop
    insert into public.agent_task_runs(task_id,scheduled_due_at,status,attempt,lease_until,error,updated_at)
    values(candidate.id,candidate.due_at,'running',1,acquired_at+make_interval(secs=>p_lease_seconds),null,acquired_at)
    on conflict(task_id,scheduled_due_at) do update set status='running',attempt=public.agent_task_runs.attempt+1,
      lease_until=excluded.lease_until,error=null,updated_at=excluded.updated_at returning * into run;
    update public.agent_tasks set status='running',version=version+1,updated_at=acquired_at where id=candidate.id returning * into candidate;
    task := to_jsonb(candidate) - 'created_at' - 'updated_at'; occurrence_key := candidate.id || ':' || candidate.due_at::text;
    attempt := run.attempt; lease_until := run.lease_until; return next;
  end loop;
end $$;

create or replace function public.finish_agent_occurrence(p_task_id text,p_scheduled_due_at timestamptz,p_status text,p_error text default null,p_eligible_at timestamptz default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_status not in ('completed','failed','pending') then raise exception 'Status de ocorrência inválido'; end if;
  update public.agent_task_runs set status=p_status,error=left(p_error,1000),lease_until='-infinity',updated_at=now()
    where task_id=p_task_id and scheduled_due_at=p_scheduled_due_at and status='running';
  if not found then raise exception 'Ocorrência não adquirida' using errcode='P0001'; end if;
  update public.agent_tasks set status=p_status,eligible_at=p_eligible_at,version=version+1,updated_at=now()
    where id=p_task_id and status='running';
end $$;

create or replace function public.append_agent_context(p_session_id text,p_entries jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.agent_contexts(session_id,history) values(p_session_id,p_entries)
  on conflict(session_id) do update set history=(select coalesce(jsonb_agg(item order by ord), '[]'::jsonb) from jsonb_array_elements(public.agent_contexts.history || excluded.history) with ordinality as h(item,ord) where ord > jsonb_array_length(public.agent_contexts.history || excluded.history)-20), updated_at=now();
end $$;

create or replace function public.consume_agent_rate_limit(p_scope text,p_limit int default 10)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare rate_window timestamptz := date_trunc('minute',now()); count_now int;
begin
  insert into public.agent_rate_limits(scope,window_start,request_count) values(p_scope,rate_window,1)
  on conflict(scope,window_start) do update set request_count=agent_rate_limits.request_count+1 returning request_count into count_now;
  delete from public.agent_rate_limits where window_start < now()-interval '2 hours';
  return count_now <= p_limit;
end $$;

create or replace function public.dispatch_due_agent_tasks()
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare endpoint text; secret text; dispatched bigint;
begin
  if not exists(select 1 from public.agent_tasks t left join public.agent_task_runs r on r.task_id=t.id and r.scheduled_due_at=t.due_at
    where t.status in ('pending','running') and t.due_at<=now() and coalesce(t.eligible_at,t.due_at)<=now()
      and (r.task_id is null or (r.status<>'completed' and r.lease_until<=now()))) then return false; end if;
  update public.agent_dispatch_leases set lease_until=now()+interval '4 minutes' where id=1 and lease_until<=now();
  if not found then return false; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name='task_runner_secret' limit 1;
  select decrypted_secret into endpoint from vault.decrypted_secrets where name='task_runner_url' limit 1;
  if secret is null or endpoint is null then
    update public.agent_dispatch_leases set lease_until='-infinity' where id=1;
    raise exception 'Executor não configurado no Vault';
  end if;
  select net.http_post(url:=endpoint,headers:=jsonb_build_object('Authorization','Bearer '||secret,'Content-Type','application/json'),body:='{}'::jsonb) into dispatched;
  if dispatched is null then update public.agent_dispatch_leases set lease_until='-infinity' where id=1; return false; end if;
  return true;
end $$;

revoke all on function public.schedule_agent_task(jsonb) from public, anon, authenticated;
revoke all on function public.transition_agent_task(text,int,text) from public, anon, authenticated;
revoke all on function public.claim_due_agent_tasks(timestamptz,int,int) from public, anon, authenticated;
revoke all on function public.finish_agent_occurrence(text,timestamptz,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.append_agent_context(text,jsonb) from public, anon, authenticated;
revoke all on function public.consume_agent_rate_limit(text,int) from public, anon, authenticated;
revoke all on function public.dispatch_due_agent_tasks() from public, anon, authenticated;
grant execute on function public.schedule_agent_task(jsonb) to service_role;
grant execute on function public.transition_agent_task(text,int,text) to service_role;
grant execute on function public.claim_due_agent_tasks(timestamptz,int,int) to service_role;
grant execute on function public.finish_agent_occurrence(text,timestamptz,text,text,timestamptz) to service_role;
grant execute on function public.append_agent_context(text,jsonb) to service_role;
grant execute on function public.consume_agent_rate_limit(text,int) to service_role;
grant execute on function public.dispatch_due_agent_tasks() to postgres, service_role;

-- The service key is server-only; all browser roles remain denied.
revoke all on public.agent_tasks, public.agent_task_runs, public.agent_notifications,
  public.agent_contexts, public.agent_rate_limits, public.agent_dispatch_leases from public, anon, authenticated;
grant select, insert, update on public.agent_tasks, public.agent_notifications, public.agent_contexts to service_role;

create or replace function public.read_task_commitment_status(p_business_id text,p_target_id text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare result text;
begin
  if p_business_id <> 'demo' then raise exception 'FORBIDDEN'; end if;
  select t->>'status' into result from public.finance_state f,
    lateral jsonb_array_elements(f.data->'transactions') t
    where f.business_id=p_business_id and t->>'id'=p_target_id;
  if result is null then raise exception 'COMMITMENT_NOT_FOUND'; end if;
  return result;
end $$;
revoke all on function public.read_task_commitment_status(text,text) from public,anon,authenticated;
grant execute on function public.read_task_commitment_status(text,text) to service_role;

create or replace function public.close_resolved_agent_tasks()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.agent_tasks set status='cancelled',version=version+1,updated_at=now()
 where business_id=new.business_id and target_id=new.transaction_id and status in ('pending','running','failed');
 return new;
end $$;
revoke all on function public.close_resolved_agent_tasks() from public,anon,authenticated;
create trigger close_resolved_tasks after insert on public.finance_resolutions
 for each row execute function public.close_resolved_agent_tasks();

-- Lock the financial revision until notification insertion commits. Settlement and
-- notification cannot pass each other after the runner's final application check.
create or replace function public.guard_agent_notification()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.finance_state where business_id=new.business_id for update;
 if public.read_task_commitment_status(new.business_id,new.target_id) <> 'pending' then return null; end if;
 return new;
end $$;
revoke all on function public.guard_agent_notification() from public,anon,authenticated;
create trigger guard_agent_notification before insert on public.agent_notifications
 for each row execute function public.guard_agent_notification();
