# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Valide o aceite de cada tipo de proposta automática contra o mesmo contrato usado pelas propostas preparadas por ferramenta.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `agent` · harmful: 0
- features: integracao-final
- evidence: FINAL-03 src/features/agent/proactivity.ts:14 (agent)
- last seen: 2026-10-23T18:39:02Z

### L-002 - No gateway SQL de testes, consulte funções set-returning pela cláusula FROM antes de agregar ou converter seu resultado JSON.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: integracao-final
- evidence: tests/integration/tasks-sql-runtime.test.ts (tests)
- last seen: 2026-10-23T18:39:02Z

### L-003 - Provisione um banco e servidor por cenário E2E mutável e valide a suíte com um único worker para detectar dependência de ordem.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: integracao-final
- evidence: tests/e2e/finance.spec.ts:33 CI21335e6 (tests)
- last seen: 2026-10-23T18:50:47Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
