# Financeiro — Daniel

`store.ts` usa o SDK Supabase já instalado, por HTTPS/RPC. O estado da empresa demo é um agregado JSONB versionado no Postgres. Compare-and-swap, histórico e deduplicação pertencem à mesma transação SQL; não há fonte de verdade em memória ou arquivos. Uma consulta recupera uma revisão consistente de contas e reservas. O agregado mantém o recorte de uma empresa e até 1.000 linhas por importação.

Aplicar `supabase/migrations/001_finance.sql` somente em ambiente autorizado. Papéis `anon` e `authenticated` não podem ler/escrever nem executar as RPCs. Chave privilegiada é exclusiva do servidor. O contrato público v1 permanece em `src/contracts/`.

Testes: Postgres local, `TEST_DATABASE_URL` em loopback (padrão `postgresql://postgres@127.0.0.1:55432/postgres`), `PSQL_PATH` apontando ao executável psql. O usuário local precisa criar bancos. Cada suíte cria `caixa_finance_test_<uuid>`, aplica a migração, testa como `service_role` e remove exclusivamente seu banco no encerramento. Ausência de banco falha os testes, nunca usa mock ou skip. Nenhuma URL remota é aceita pelo helper.

Nesta máquina, sem Docker, os binários PostgreSQL 17.11 da EDB estão em `output/finance-local/pgsql/` (ignorado). O cluster local exclusivo está em `output/finance-local/data/`, iniciado com `pg_ctl -D output/finance-local/data -l output/finance-local/server.log -o "-h 127.0.0.1 -p 55432" -w start`; parar com `pg_ctl -D output/finance-local/data -w stop`. O pgAdmin distribuído junto foi movido para `output/finance-local/node_modules/pgadmin/` para não entrar na compilação TS. Em outro ambiente pode-se usar o Postgres do Supabase CLI local e definir as duas variáveis, sem alterar scripts ou dependências compartilhadas.

## Integração com tarefas

`finance_resolutions(business_id, transaction_id, version, status)` recebe um evento ao transicionar uma pendência para settled/cancelled. O evento, a liberação das reservas, o novo estado, seu histórico e a deduplicação são gravados na mesma transação. A migração `002_tasks.sql`, de Bruno, pode anexar um trigger AFTER INSERT nessa tabela para encerrar suas tarefas relacionadas atomicamente. Esse trigger deve permitir operação com `service_role`, usar nomes qualificados e não chamar rede/IA. Se falhar, toda a liquidação reverte (teste `transactions.test.ts`). T2–T8 não criam nem alteram tabelas de tarefas; o fechamento delas será integrado com Bruno em T21.

`calculateCash(state, asOf)` e `simulate(state, input, asOf)` são determinísticos. `asOf` deve pertencer ao horizonte fixo da empresa. Pendências de saída atrasadas continuam comprometendo a projeção; entradas sem nova data ficam incertas. Previsão posterior ao fim da janela não move a janela. Criação/importação exige datas na janela. Simular ou alterar previsão permite adiamento para depois dela.

Reservas são uma classificação do saldo atual: não entram como despesa na curva. `expected_version` da reserva é a versão do compromisso; a criação da reserva avança a revisão financeira e mantém a versão do compromisso. Reconfirmação equivalente reutiliza a reserva ativa. Valores acima do livre/devido retornam `available_cents`. Reduzir o valor devido abaixo da reserva ativa é conflito.
