# Evidências Daniel — T2–T8

Data: 2026-10-23. Branch: feat/daniel-caixa-dados; base eaa8068, comum às três branches.

Skills: karpathy-guidelines aplicada; tlc-spec-driven indisponível e comunicada antes da implementação. Verificação da feature completa permanece pendente nas demais frentes. Sem push, deploy ou migração remota.

Preflight: npm ci e npm run check passaram (15 unitários, 6 integração, 3 E2E). Chromium instalado pelo script da base. Postgres 17.11 portátil EDB em output/ ignorado, loopback:55432; sem Docker disponível. Banco temporário exclusivo por suíte, removido ao terminar; mesmas funções SQL da produção, transporte psql local em vez de HTTPS Supabase.

## T2

Persistencia: recarga por adaptador novo, CAS antigo rejeitado, escopo demo, historico por versao, RLS/RPC bloqueadas e guarda loopback. Testes: tests/integration/finance/persistence.test.ts. Gate: 15 unitarios, 12 integracao, 3 E2E, lint/tipos/build.

Gate: npm run check, sem skip/remoção. Casos novos: 6. Log: output/finance-local/t2-gate.log.

## T3

CSV: F1, retry, reimportacao identica, rollback com linha invalida/conflitante, IDs repetidos, limites UTF8/1000, datas/cabecalho, RFC4180, concorrencia e expiracao/stale. Testes: tests/integration/finance/import.test.ts. Previa parseada expira em 30 minutos; CSV bruto descartado. Gate: 15 unitarios, 22 integracao, 3 E2E.

Gate: npm run check, sem skip/remoção. Casos novos: 10. Log: output/finance-local/t3-gate.log.

## T4

Calculo puro: F1 100000/300000/150000, janela fixa ate 21/11, vazio/zero, abertura, realizados, incerteza, dividas vencidas, reservas, overflow e escopo. Somatorios BigInt validados como centavos seguros. Testes: src/features/finance/cash.test.ts. Gate quick: 25 unitarios, lint e tipos verdes.

Gate: npm run check, sem skip/remoção. Casos novos: 10. Log: output/finance-local/t4-gate.log.
