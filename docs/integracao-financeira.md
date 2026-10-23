# Integração do protótipo Fôlego

Daniel fornece o financeiro persistido, Jecky a experiência/voz e Bruno o agente/tarefas. A composição conecta esses módulos em `/caixa`. A prévia `/` continua identificada como simulada, sem exigir credenciais. Produção não usa memória ou fixtures quando uma dependência está ausente.

## Configurar antes de executar

Use Node24, `npm ci` e copie `.env.example` para `.env.local` na raiz. Preencha somente no servidor:

```dotenv
APP_ORIGIN=http://localhost:3000
SESSION_SECRET=<segredo aleatório com pelo menos 32 caracteres>
SUPABASE_URL=<URL do projeto demo>
SUPABASE_SERVICE_ROLE_KEY=<chave privilegiada somente no servidor>
OPENAI_API_KEY=<chave OpenAI>
OPENAI_MODEL=<modelo habilitado para Responses e ferramentas>
OPENAI_TRANSCRIBE_MODEL=<modelo habilitado para transcrição>
OPENAI_TTS_MODEL=<modelo habilitado para síntese>
TASK_RUNNER_SECRET=<outro segredo aleatório independente>
```

Gere os dois segredos separadamente com `openssl rand -hex 32`. Não use prefixo `NEXT_PUBLIC_`. Não envie chaves por chat nem versionamento. Reinicie Next após preencher o arquivo, execute `npm run dev` e abra a URL exata de `APP_ORIGIN`, inclusive porta e protocolo.

No Supabase demo, aplicar **na ordem** as migrações corrigidas:

1. `supabase/migrations/001_finance.sql`: financeiro, empresa fictícia, resolução e idempotência.
2. `supabase/migrations/002_tasks.sql`: contexto, tarefas, quota, executor condicional e resolução transacional.
3. `supabase/migrations/003_agent_actions.sql`: propostas, decisões atômicas e notificação com validação da tentativa.

Não reaplicar 001/003 em banco já migrado; usar o controle de migrações do ambiente. Não foi aplicado SQL em banco remoto por esta entrega. Banco de teste automatizado deve ser exclusivamente Postgres loopback, nunca a demo remota. A empresa `demo` é compartilhada e só deve receber dados fictícios; a sessão não representa uma conta privada por usuário.

Na Vercel, cadastrar as mesmas variáveis no ambiente de produção/demo. Preview conserva a proteção de banco exclusivamente loopback. Uma chave configurada não remove essa proteção. Deploy e ativação do banco/Cron são passos de ambiente separados.

## Jornada integrada

1. `/caixa` emite ou conserva o cookie HttpOnly financeiro e carrega empresa, transações e snapshot da mesma revisão. Esse cookie também autentica agente, feed e voz; atualizar a tela não troca a identidade de uma sessão ainda válida.
2. Importar CSV mostra a prévia; confirmar grava um lote atômico. Simulação não altera a base. Ações manuais de criação, reserva virtual, alteração e liquidação continuam exigindo confirmação.
3. Com banco, chave e modelo de conversa configurados, a área de acompanhamento oferece conversa e iniciativas reais. `get_finance_workspace` entrega compromissos, reservas e propostas da sessão; saldos e cenários vêm exclusivamente do serviço financeiro.
4. Propostas concretas exibem ID, alvo e versão. Aceitar valida a referência e a revisão financeira. Reserva e alteração de previsão gravam a mudança e o recibo de aceite na mesma transação; repetir o aceite não duplica efeitos. Dispensa não muda finanças. Ajustar prepara uma nova proposta para revisão. Proposta desatualizada exige nova avaliação.
5. Simulações só oferecem aceite com compromisso e nova data definidos. Alertas automáticos sem parâmetros executáveis permanecem informativos no painel de risco; não geram um botão que aparenta aplicar uma hipótese indefinida. Cobrança é rascunho, sem envio externo.
6. Agendamento grava alvo pendente, horário UTC, motivo, origem e condição de encerramento. O feed atualiza ao abrir/focar e após ações, sem polling contínuo. A consulta atual mostra os vinte avisos mais recentes. Ler persiste leitura; adiar cria/substitui acompanhamento; cancelar encerra os acompanhamentos ativos relacionados. Marcar resolvido confere o estado financeiro; se ainda pendente, orienta confirmar a liquidação manualmente.
7. Com os modelos de áudio configurados, gravação usa transcrição real por turnos; texto permanece editável e não é enviado sozinho. Síntese ocorre somente ao clicar. Falha de microfone, modelo ou provedor preserva o texto.

O horizonte financeiro é fixo em trinta dias. O painel informa sua data de referência. Se hoje estiver fora dessa janela, preparar dados demo com datas válidas antes de testar agente/simulação/reserva; não deslocar registros silenciosamente.

## Autorização, limites e execução

Mutadores validam Origin contra `APP_ORIGIN`. O servidor conserva compatibilidade com sessões antigas assinadas do agente, mas novas sessões são emitidas pelo financeiro. Sem sessão/origem válida, voz e conversa não chamam o provedor. Sem banco configurado em produção, há erro recuperável; fallback em memória existe exclusivamente nos testes isolados do legado.

Quota persistida por minuto: dez chamadas por sessão e trinta para a demo compartilhada, com contadores separados para conversa e áudio. O teto da demo impede contornar a quota apenas emitindo outra sessão. Áudio mantém até60s/3MiB; síntese até1.200 caracteres e saída até3MiB. Nenhum áudio é armazenado permanentemente.

O executor protegido por `TASK_RUNNER_SECRET` adquire no máximo cinco tarefas por lote. Valida compromisso novamente antes de notificar. A inserção bloqueia primeiro a revisão financeira e depois a tarefa, confere tentativa/lease e usa ocorrência única. Um executor expirado não finaliza a tentativa retomada. A liquidação cancela tarefas relacionadas na transação financeira; cancelamento de tarefa em execução também impede nova notificação.

O processamento automático usa regras e rascunhos, sem chamar OpenAI em cada ciclo. Para executar com a aba fechada, configurar as extensões necessárias e um único Supabase Cron condicional, conforme `docs/deploy-gratuito.md`. Supabase Vault precisa de `task_runner_secret` igual a `TASK_RUNNER_SECRET` e `task_runner_url` com a URL HTTPS completa de `/api/tasks/run`. Sem tarefas elegíveis, a função retorna sem HTTP Vercel/OpenAI. Chaves da aplicação sozinhas não ativam o job.

Depois de habilitar Cron/pg_net e cadastrar os dois nomes no Vault pelo painel do ambiente demo, o responsável pode ativar o job único:

```sql
select cron.schedule(
  'caixa-agent-due',
  '*/5 * * * *',
  'select public.dispatch_due_agent_tasks();'
);
```

Conferir a lista e o histórico de Jobs no Supabase antes do ensaio U09. O mesmo nome atualiza o job existente, conforme a [documentação oficial de Cron](https://supabase.com/docs/guides/cron/quickstart); o [guia de agendamento com Vault/pg_net](https://supabase.com/docs/guides/functions/schedule-functions) explica as dependências. Esse comando não foi executado no projeto remoto.

## Evidências e aceite

`npm run check` executa lint, tipos, unitários, integração SQL e E2E de produção local; `.github/workflows/check.yml` fornece Postgres17/Node24/Chromium. `tests/integration/agent-sql.test.ts` aplica a migração real. `agent-actions.test.ts` cobre decisão/versão/recibo. `tasks-sql-runtime.test.ts` usa SDK Supabase sobre Postgres real para aquisição, notificação, cancelamento e retomada. O E2E `agent-integrated.spec.ts` percorre navegador→rotas reais→proposta→aceite→SQL→recarga, usando somente um provedor OpenAI simulado localmente.

Configuração de credenciais, OpenAI/Supabase remotos, extensões/Vault/Cron e ensaio humano com aba fechada permanecem pendentes do ambiente. A matriz U01–U13 em [revisao-bruno-e-uat.md](revisao-bruno-e-uat.md) define resultados observáveis. Passar o gate local não declara esse ensaio realizado.

Referência de implementação: [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling). Segredos e modelos são explícitos no servidor; não há escolha silenciosa de modelo pago.
