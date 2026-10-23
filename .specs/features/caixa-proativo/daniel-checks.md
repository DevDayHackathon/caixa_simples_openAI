# Evidências Daniel — T2–T8

Data: 2026-10-23. Branch: feat/daniel-caixa-dados; base eaa8068, comum às três branches.

Skills: karpathy-guidelines aplicada; tlc-spec-driven indisponível e comunicada antes da implementação. Verificação da feature completa permanece pendente nas demais frentes. Sem push, deploy ou migração remota.

Preflight: npm ci e npm run check passaram (15 unitários, 6 integração, 3 E2E). Chromium instalado pelo script da base. Postgres 17.11 portátil EDB em output/ ignorado, loopback:55432; sem Docker disponível. Banco temporário exclusivo por suíte, removido ao terminar; mesmas funções SQL da produção, transporte psql local em vez de HTTPS Supabase.

## T2

Persistencia: recarga por adaptador novo, CAS antigo rejeitado, escopo demo, historico por versao, RLS/RPC bloqueadas e guarda loopback. Testes: tests/integration/finance/persistence.test.ts. Gate: 15 unitarios, 12 integracao, 3 E2E, lint/tipos/build.

Gate: npm run check, sem skip/remoção. Casos novos: 6. Log: output/finance-local/t2-gate.log.
