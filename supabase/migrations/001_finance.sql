-- Finance state is a single versioned aggregate for the one-company demo.
-- Each RPC commit atomically replaces it, records history and deduplicates the result.
create table public.finance_state (
  business_id text primary key check (business_id = 'demo'),
  version bigint not null check (version > 0),
  data jsonb not null check (data->'business'->>'id' = business_id)
);
create table public.finance_history (
  business_id text not null references public.finance_state,
  version bigint not null, operation text not null,
  data jsonb not null, created_at timestamptz not null default now(),
  primary key (business_id, version)
);
create table public.finance_idempotency (
  operation text not null, key text not null, input jsonb not null, result jsonb not null,
  primary key (operation, key)
);
alter table public.finance_state enable row level security;
alter table public.finance_history enable row level security;
alter table public.finance_idempotency enable row level security;
revoke all on public.finance_state, public.finance_history, public.finance_idempotency from public, anon, authenticated;
grant select, insert, update on public.finance_state to service_role;
grant select, insert on public.finance_history, public.finance_idempotency to service_role;

insert into public.finance_state values ('demo', 1, jsonb_build_object(
  'business', jsonb_build_object('id','demo','currency','BRL','timezone','America/Sao_Paulo',
    'start_date','2026-10-23','opening_balance_cents',0,'reserve_threshold_cents',0,'reminders_enabled',true),
  'transactions','[]'::jsonb,'reservations','[]'::jsonb,'version',1,
  'updated_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));

create function public.finance_read(p_business_id text) returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if p_business_id is distinct from 'demo' then raise exception 'FORBIDDEN'; end if;
  return (select data from public.finance_state where business_id = p_business_id);
end $$;

create function public.finance_replay(p_operation text, p_key text, p_input jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved public.finance_idempotency;
begin
  select * into saved from public.finance_idempotency where operation = p_operation and key = p_key;
  if found then
    if saved.input is distinct from p_input then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return saved.result;
  end if;
  return null;
end $$;

create function public.finance_commit(p_business_id text, p_expected_version bigint, p_state jsonb,
  p_operation text, p_input jsonb, p_result jsonb, p_key text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_version bigint; saved jsonb;
begin
  if p_business_id is distinct from 'demo' or p_state->'business'->>'id' is distinct from 'demo'
    or exists (select 1 from jsonb_array_elements(p_state->'transactions') t where t->>'business_id' is distinct from 'demo')
    or exists (select 1 from jsonb_array_elements(p_state->'reservations') r where r->>'business_id' is distinct from 'demo')
    then raise exception 'FORBIDDEN'; end if;
  select version into current_version from public.finance_state where business_id = p_business_id for update;
  if p_key is not null then
    saved := public.finance_replay(p_operation, p_key, p_input);
    if saved is not null then return saved; end if;
  end if;
  if current_version <> p_expected_version or (p_state->>'version')::bigint <> current_version + 1 then raise exception 'CONFLICT'; end if;
  update public.finance_state set data = p_state, version = current_version + 1 where business_id = p_business_id;
  insert into public.finance_history values (p_business_id, current_version + 1, p_operation, p_state, now());
  if p_key is not null then insert into public.finance_idempotency values (p_operation, p_key, p_input, p_result); end if;
  return p_result;
end $$;
revoke execute on function public.finance_read(text), public.finance_replay(text,text,jsonb), public.finance_commit(text,bigint,jsonb,text,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.finance_read(text), public.finance_replay(text,text,jsonb), public.finance_commit(text,bigint,jsonb,text,jsonb,jsonb,text) to service_role;

-- Store parsed previews only. Expired previews are deleted on the next preview save.
create table public.finance_previews (id text primary key, data jsonb not null, expires_at timestamptz not null default now() + interval '30 minutes');
alter table public.finance_previews enable row level security;
revoke all on public.finance_previews from public, anon, authenticated;
grant select, insert, delete on public.finance_previews to service_role;
create function public.finance_preview_save(p_id text, p_data jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.finance_previews where expires_at <= now();
  insert into public.finance_previews(id,data) values (p_id,p_data);
  return '{}'::jsonb;
end $$;
create function public.finance_preview_read(p_id text) returns jsonb language sql security invoker set search_path = '' as $$
  select data from public.finance_previews where id = p_id and expires_at > now();
$$;
revoke execute on function public.finance_preview_save(text,jsonb), public.finance_preview_read(text) from public, anon, authenticated;
grant execute on function public.finance_preview_save(text,jsonb), public.finance_preview_read(text) to service_role;
