-- Reviewable actions belong to the signed session and survive server restarts.
create table public.agent_proposals (
 session_id text not null, id text not null, proposal jsonb not null,
 result jsonb, created_at timestamptz not null default now(), primary key(session_id,id)
);
alter table public.agent_proposals enable row level security;
revoke all on public.agent_proposals from public,anon,authenticated;
grant select,insert,update on public.agent_proposals to service_role;

create function public.save_agent_proposal(p_session text,p_proposal jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare saved jsonb;
begin
 insert into public.agent_proposals(session_id,id,proposal) values(p_session,p_proposal->>'id',p_proposal) on conflict do nothing;
 select proposal into saved from public.agent_proposals where session_id=p_session and id=p_proposal->>'id';
 return saved;
end $$;
create function public.read_agent_proposal(p_session text,p_id text)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('proposal',proposal,'result',result) from public.agent_proposals where session_id=p_session and id=p_id;
$$;
create function public.decide_agent_proposal(p_session text,p_id text,p_status text,p_version bigint,p_result jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare saved public.agent_proposals; actual bigint;
begin
 select version into actual from public.finance_state where business_id='demo' for update;
 select * into saved from public.agent_proposals where session_id=p_session and id=p_id for update;
 if not found then raise exception 'PROPOSAL_NOT_FOUND'; end if;
 if p_status not in ('accepted','dismissed') then raise exception 'INVALID_DECISION'; end if;
 if saved.proposal->>'status'=p_status then return saved.proposal; end if;
 if saved.proposal->>'status'<>'pending' or (saved.proposal->>'based_on_version')::bigint<>p_version or actual<>p_version then raise exception 'CONFLICT'; end if;
 update public.agent_proposals set proposal=jsonb_set(proposal,'{status}',to_jsonb(p_status)),result=p_result where session_id=p_session and id=p_id returning * into saved;
 return saved.proposal;
end $$;
-- FinancePort performs domain validation. This wrapper atomically commits its
-- validated financial revision and proposal receipt; either both persist or neither.
create function public.commit_agent_proposal(p_session text,p_id text,p_business_id text,p_expected_version bigint,
 p_state jsonb,p_operation text,p_input jsonb,p_result jsonb,p_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare saved public.agent_proposals; receipt jsonb;
begin
 perform 1 from public.finance_state where business_id=p_business_id for update;
 select * into saved from public.agent_proposals where session_id=p_session and id=p_id for update;
 if not found then raise exception 'PROPOSAL_NOT_FOUND'; end if;
 if saved.proposal->>'status'='accepted' then return saved.result; end if;
 if saved.proposal->>'status'<>'pending' or (saved.proposal->>'based_on_version')::bigint<>p_expected_version then raise exception 'CONFLICT'; end if;
 receipt:=public.finance_commit(p_business_id,p_expected_version,p_state,p_operation,p_input,p_result,p_key);
 update public.agent_proposals set proposal=jsonb_set(proposal,'{status}','"accepted"'),result=receipt where session_id=p_session and id=p_id;
 return receipt;
end $$;

create function public.read_agent_notice(p_id text)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select to_jsonb(n) from public.agent_notifications n where id=p_id and business_id='demo';
$$;
create function public.mark_agent_notice_read(p_id text,p_occurrence text,p_target text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.agent_notifications set read_at=coalesce(read_at,now()) where id=p_id and business_id='demo' and occurrence_key=p_occurrence and target_id=p_target;
 return found;
end $$;

revoke all on function public.save_agent_proposal(text,jsonb), public.read_agent_proposal(text,text),
 public.decide_agent_proposal(text,text,text,bigint,jsonb), public.commit_agent_proposal(text,text,text,bigint,jsonb,text,jsonb,jsonb,text),
 public.read_agent_notice(text),public.mark_agent_notice_read(text,text,text) from public,anon,authenticated;
grant execute on function public.save_agent_proposal(text,jsonb), public.read_agent_proposal(text,text),
 public.decide_agent_proposal(text,text,text,bigint,jsonb), public.commit_agent_proposal(text,text,text,bigint,jsonb,text,jsonb,jsonb,text),
 public.read_agent_notice(text),public.mark_agent_notice_read(text,text,text) to service_role;

create function public.create_agent_notification(p_notice jsonb,p_attempt int)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare current_task public.agent_tasks; inserted text;
begin
 perform 1 from public.finance_state where business_id=p_notice->>'business_id' for update;
 select * into current_task from public.agent_tasks where id=split_part(p_notice->>'occurrence_key',':',1) for update;
 if not found or current_task.status<>'running' or current_task.business_id<>p_notice->>'business_id' or current_task.target_id<>p_notice->>'target_id' then return false; end if;
 if not exists(select 1 from public.agent_task_runs r where r.task_id=current_task.id and r.scheduled_due_at=current_task.due_at
  and r.status='running' and r.attempt=p_attempt and r.lease_until>clock_timestamp()
  and current_task.id||':'||current_task.due_at::text=p_notice->>'occurrence_key') then raise exception 'STALE_OCCURRENCE'; end if;
 insert into public.agent_notifications select * from jsonb_populate_record(null::public.agent_notifications,p_notice)
 on conflict(occurrence_key) do nothing returning id into inserted;
 return inserted is not null;
end $$;
revoke all on function public.create_agent_notification(jsonb,int) from public,anon,authenticated;
grant execute on function public.create_agent_notification(jsonb,int) to service_role;

create function public.list_agent_proposals(p_session text)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(p.proposal),'[]'::jsonb) from
 (select proposal from public.agent_proposals where session_id=p_session order by created_at desc limit 10) p;
$$;
revoke all on function public.list_agent_proposals(text) from public,anon,authenticated;
grant execute on function public.list_agent_proposals(text) to service_role;
