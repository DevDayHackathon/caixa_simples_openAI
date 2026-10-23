# Revisão do Bruno e aceite do protótipo

A implementação posterior corrige os bloqueios e conecta os três módulos. Veja o estado atual em [integracao-financeira.md](integracao-financeira.md). A revisão abaixo preserva a evidência do head original; a matriz manual U01–U13 continua aplicável e ainda depende das credenciais.

## Revisão histórica do head original em 23/10/2026

**Decisão histórica: não aprovar nem fazer merge do PR #3 no head `533e73d1b21d78fbc11b3eb6e05792c730c67055`.** A migração não aplica em Postgres 17 e existem incompatibilidades entre os três módulos. Daniel e Jecky já estão na main (`452c817` e `1e3b9c7`). A extensão descrita em `docs/integracao-financeira.md` está na branch local `codex/integracao-financeira`, até `6f6315f`; não confundir essa extensão com código já publicado na main.

PR revisado: https://github.com/DevDayHackathon/caixa_simples_openAI/pull/3. A revisão usou o ref do PR: a branch anunciada por `git ls-remote` ainda apontava para `eaa8068`, enquanto o GitHub informou o head acima.

## Bloqueios reproduzidos e correções necessárias

| Prioridade | Evidência no head do Bruno | Resultado e correção |
| --- | --- | --- |
| P0 | `supabase/migrations/002_tasks.sql:150–152` | `consume_agent_rate_limit` usa `window` como variável; aplicar 001 e 002 com `psql -v ON_ERROR_STOP=1` falha com `syntax error at or near "window"`. Renomear e testar a migração inteira em banco vazio. |
| P1 | `supabase/migrations/002_tasks.sql:145` | Após contornar apenas o erro sintático em cópia descartável, duas chamadas de `append_agent_context` falham com `null value in column "history"`. `->-20` extrai um elemento; substituir por seleção ordenada das últimas vinte entradas mantendo array. Testar 2, 20 e mais de 20 entradas. |
| P1 | `src/features/tasks/server.ts:38`, `src/app/api/tasks/run/route.ts:21` | Agente e executor injetam `createMockFinancePort()`. Injetar o mesmo armazenamento financeiro persistido usado por `/caixa`, com a mesma proteção de ambiente. Não aceitar saldo de fixture quando o banco falhar. |
| P1 | `src/features/agent/session.ts:13`; financeiro em `src/features/finance/session.ts:4` | Agente lê `demo_session`; o financeiro emite `caixa_demo_session`. Unificar emissão, verificação, identificação da sessão, expiração e Origin; testar o cookie realmente emitido por `/api/finance/session`. |
| P1 | `src/features/tasks/server.ts:58` | Chama `read_task_commitment_status`, ausente nas migrações. Implementar leitura de `finance_state` e encerramento de tarefas por trigger em `finance_resolutions`, na transação financeira. Testar liquidação antes e durante execução. |
| P1 | `src/features/tasks/supabase-repository.ts:71–74`, `src/contracts/models.ts:55` | `SELECT *` inclui timestamps extras; SQL também retorna `eligible_at:null`. O contrato estrito rejeita ambos. Normalizar linhas SQL e validar save/get/list/claim com respostas reais. |
| P1 | `src/features/agent/turn.ts:38` | Propostas usam `businessVersion:1`. Obter versão financeira autoritativa antes de propor; validar ID, alvo, versão e confirmação no aceite. Ainda faltam ferramentas para aplicar decisões financeiras e tratar ações do feed; texto de sucesso não comprova uma mutação. |
| P1 | `src/features/agent/tools.ts:7` e definição de `get_cash_snapshot` | Ferramenta anuncia `as_of:string|null`, mas o parser rejeita null. Alinhar contrato e testar argumentos emitidos no formato strict. |

Também faltam na composição final: AgentPort e feed reais em `/caixa`, decisões persistidas de propostas, handlers de voz com sessão e quota compartilhada persistida, configuração do Cron/Vault e ensaio T22. Colocar as chaves não implementa esses pontos. As rotas de áudio atuais continuam desabilitadas por projeto.

## Verificações desta revisão

- Cópia isolada do head Bruno: lint e tipos passaram; 51 unitários e 27 testes de integração passaram. Os testes de persistência do agente simulam o SDK/RPC; não aplicam a migração real.
- Composição descartável de `6f6315f` com os arquivos do Bruno: lint, tipos, 135 unitários e 77 testes de integração passaram. Isso não supera os bloqueios SQL reproduzidos separadamente.
- Build de produção e os 10 E2E existentes da composição passaram. Eles cobrem a experiência financeira e prévia; não atestam agente/voz/Cron reais integrados.
- Postgres 17 local descartável: aplicação de 001 + 002 falhou na variável `window`; com essa variável corrigida somente no scratch, a segunda gravação de contexto falhou por NOT NULL.
- Nenhuma chave real foi lida, chamada OpenAI paga executada, migração remota aplicada ou Cron ativado. A revisão independente confirmou os bloqueios de contratos e composição.

## Onde colocar as chaves

Na máquina que executa Next, criar `.env.local` na raiz do projeto a partir de `.env.example`. O arquivo está ignorado pelo Git. Preencher todos os campos abaixo; não enviar os valores por chat nem adicioná-los ao código:

```dotenv
APP_ORIGIN=http://localhost:3000
SUPABASE_URL=<URL do projeto demo>
SUPABASE_SERVICE_ROLE_KEY=<chave privilegiada do projeto demo>
OPENAI_API_KEY=<chave OpenAI>
OPENAI_MODEL=<modelo habilitado para Responses e ferramentas>
OPENAI_TRANSCRIBE_MODEL=<modelo habilitado para transcrição>
OPENAI_TTS_MODEL=<modelo habilitado para síntese>
SESSION_SECRET=<segredo aleatório de pelo menos 32 caracteres>
TASK_RUNNER_SECRET=<outro segredo aleatório independente>
```

Reiniciar Next após alterações. Gerar cada segredo separadamente com `openssl rand -hex 32`. Usar a URL exata de `APP_ORIGIN` no navegador. Todas as chaves são exclusivas do servidor, sem prefixo `NEXT_PUBLIC_`; a aplicação atual não pede chave pública do Supabase no cliente. `TEST_DATABASE_URL` é somente para testes automatizados em Postgres loopback, nunca o banco demo remoto.

Na implantação, cadastrar as mesmas variáveis no ambiente de produção da Vercel e republicar a versão validada. Em Supabase Vault, configurar `task_runner_secret` com o mesmo valor de `TASK_RUNNER_SECRET` e `task_runner_url` com a URL HTTPS completa de `/api/tasks/run`. Não usar localhost como URL do executor remoto. A proteção de Preview existente recusa banco remoto; usar o ambiente de produção/demo acordado, sem remover a proteção para contorná-la.

Aplicar migrações somente após corrigir os bloqueios e ensaiá-las em banco descartável. A 001 cria a empresa fictícia; preparar datas dentro do horizonte de trinta dias e dados de teste. Habilitar extensões e o único job condicional conforme `docs/deploy-gratuito.md` depois de configurar Vault e validar o endpoint. Não executar o SQL do head original não corrigido no projeto remoto.

## Ordem de integração e gates

1. Corrigir migração, serialização e histórico do Bruno; adicionar regressões em SQL real, não apenas mocks. Revalidar o novo head do PR.
2. Unificar sessão e FinancePort; implementar leitura/trigger de encerramento e decisões de propostas com CAS, confirmação e idempotência. Exercitar as rotas reais entre módulos.
3. Injetar AgentPort/feed no caixa persistido e ligar voz à autorização e quota persistida antes de qualquer chamada ao provedor. Preservar transcrição editável e reprodução explícita.
4. Rodar `npm run check`, incluindo migrações 001 + 002 reais, e build no candidato composto. Verificação independente deve passar antes de aprovação/merge. Publicar também os commits da extensão financeira que ainda estão locais.
5. Com credenciais configuradas, executar a matriz abaixo no ambiente demo. Aprovação do ensaio exige evidência do navegador, banco e execução do Cron, sem registrar segredos. Suítes automatizadas destrutivas continuam usando só banco local.

## Matriz manual com APIs ativas — ainda não executada

Usar somente empresa e contrapartes fictícias. Registrar para cada caso: commit, ambiente, horário de São Paulo, IDs de compromisso/tarefa/ocorrência, resultado esperado/observado e PASS/FAIL. Qualquer falha bloqueia a apresentação do respectivo fluxo como pronto.

| Caso | Ação | Resultado esperado e evidência |
| --- | --- | --- |
| U01 — Persistência | Abrir `/caixa`, importar CSV válido e confirmar; recarregar e abrir outra aba. | Mesmos compromissos e versão em ambas as abas; banco contém o lote uma vez. Prévia não grava. CSV inválido mostra erros e não grava parcialmente. |
| U02 — Caixa e IA reais | Perguntar “Qual meu saldo e o menor saldo previsto? Liste as datas e explique de onde vieram”. Comparar com o painel e registros. Criar um compromisso e repetir. | Ferramenta financeira consulta o banco; resposta corresponde aos valores calculados pelo FinancePort e à versão atual. Há chamada Responses no provedor, sem fixture silenciosa. |
| U03 — Contexto | Fazer três perguntas encadeadas sobre o mesmo compromisso e recarregar. | Segunda/terceira mensagens funcionam, referência se conserva dentro da sessão prevista; `agent_contexts.history` permanece array limitado. Nova sessão tem o comportamento de isolamento definido. |
| U04 — Decisão confirmada | Pedir proposta de reserva; dispensar. Pedir outra e aceitar explicitamente. | Dispensa não grava reserva; aceite produz uma reserva virtual persistida e atualiza versão/saldos. Repetir a mesma requisição não duplica. Nenhuma operação bancária é executada. |
| U05 — Versão e ajustes | Gerar proposta na aba A; modificar compromisso na B; tentar aceitar em A. Pedir ajuste e nova simulação. | Proposta antiga rejeitada/reavaliada; simulação não altera base. Alteração de previsão só grava após confirmação específica na versão correta. |
| U06 — Transcrição OpenAI | Permitir microfone, gravar frase curta e transcrever; editar antes de enviar. Repetir com permissão negada. | Transcrição real preenche editor e não envia sozinha; agente recebe texto editado somente ao enviar. Permissão negada mantém conversa textual. Não salvar áudio permanentemente. |
| U07 — Síntese OpenAI | Receber resposta, clicar para ouvir, fechar diálogo e testar falha de síntese. | Chamada real de síntese apenas ao clicar; áudio reproduz; captura/recursos liberados ao sair. Falha mantém texto legível; síntese acima de 1.200 caracteres é recusada. |
| U08 — Agendamento | Pedir lembrete de um compromisso pendente com dia/hora explícitos de São Paulo alguns minutos à frente; perguntar horário agendado. Repetir com horário ambíguo. | `due_at` UTC corresponde ao horário pedido; motivo, alvo e condição de parada persistidos. Ambiguidade pede esclarecimento sem criar tarefa arbitrária. |
| U09 — Sem aba aberta | Fechar todas as abas após U08; aguardar o próximo ciclo de cinco minutos mais tempo de processamento; reabrir. | Cron despacha executor sem input do usuário; ocorrência e notificação única estão no banco e no feed. Reexecutar não duplica aviso. Conferir histórico Cron e resultado HTTP, não apenas texto do chat. |
| U10 — Compromisso resolvido | Criar lembrete, liquidar antes do vencimento; depois repetir com liquidação concorrente ao executor. | Tarefa encerrada na transação; nenhum novo lembrete de compromisso resolvido. Saldo realizado/reserva atualizados corretamente. |
| U11 — Cron ocioso e retomada | Deixar somente tarefas futuras ou nenhuma; observar ciclo. Depois preparar seis tarefas vencidas e simular lease expirada em ambiente de ensaio isolado. | Sem elegíveis: zero HTTP Vercel/OpenAI. Com seis: até cinco aquisições por lote, restante persistido. Retomada após expiração/retry não duplica ocorrência/notificação. |
| U12 — Falhas e autorização | Testar sem cookie, Origin diferente e segredo inválido do executor; atingir quota de áudio/conversa; testar provedor/banco indisponível. | 401/403/429 conforme rota; executor não processa sem segredo. Rejeições de autorização/quota não chamam provedor. Falhas de dependência não expõem segredos nem exibem sucesso presumido. |
| U13 — Apresentação | Ensaiar importação → pergunta → proposta → decisão → voz → lembrete sem aba, desktop e celular. | Sem mistura entre prévia simulada `/` e `/caixa`; rascunho de cobrança nunca é enviado externamente. Console/rede sem credenciais, controles utilizáveis e ausência de regressão visual. |

**Critério final:** código integrado e gates locais aprovados não substituem U02/U06/U07/U09 com serviços ativos. Esses casos permanecem pendentes até configuração das credenciais e conclusão da integração T21/T22.
