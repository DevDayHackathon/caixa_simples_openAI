# Caixa proativo — Design proposto

**Spec**: `.specs/features/caixa-proativo/spec.md`
**Status**: Draft. Recomendação pronta para revisão; sem implementação nem provisionamento.

## Architecture Overview

Recomendação: uma aplicação Next.js/TypeScript. Interface e endpoints no mesmo projeto. Supabase Free persiste dados. Um único Supabase Cron verifica o banco a cada cinco minutos e só chama o executor HTTP protegido na Vercel Hobby quando há tarefa vencida e elegível. O agente conversa via Responses API e usa ferramentas tipadas. Cálculos financeiros são funções determinísticas, nunca texto livre gerado pelo modelo.

Alternativas de mesmo escopo:

| Abordagem | Benefício | Custo | Recomendação |
| --- | --- | --- | --- |
| Next.js + Supabase + cron HTTP | Uma linguagem e contratos compartilhados; poucos serviços | Dependência do Supabase e configuração do cron | Escolhida como proposta |
| React + FastAPI + Postgres + worker | Python para agente e worker separado | Duas linguagens e mais contratos/deploys para três pessoas | Viável, mais integração |
| Next.js + Postgres + fila dedicada | Controle de execução e retries | Serviço adicional para administrar | Desnecessário neste recorte |

O usuário solicitou recomendação direta; aprovação desta proposta ocorre antes do bootstrap, junto da divisão de branches. Não há decisão de stack registrada como aprovada em STATE.md.

## Stack

| Camada | Escolha proposta | Motivo |
| --- | --- | --- |
| Aplicação | Next.js App Router + React + TypeScript | UI, endpoints e tipos no mesmo repositório |
| Interface | Tailwind CSS e componentes acessíveis simples | Pouco código para a IA manter; sem design system novo obrigatório |
| Validação | Zod | Validar inputs e argumentos antes das ferramentas |
| Banco | Supabase Postgres; migrações SQL | Persistir tarefas e garantir transações/uniqueness |
| Agendamento | Supabase Cron/pg_cron + pg_net para POST protegido | Funciona sem aba ou mensagem do usuário |
| Agente | SDK oficial OpenAI, Responses API e function calling | Catálogo explícito de operações permitidas |
| Voz | Gravação no navegador → transcrição → agente → síntese | Turnos simples, transcrição editável e fallback textual |
| Testes | Vitest; integração com banco isolado; Playwright E2E | Cálculo isolado, persistência real e fluxos verificáveis |
| Publicação futura | Vercel Hobby + Supabase Free | Restrição confirmada; detalhes e quotas em docs/deploy-gratuito.md |

Fixar versões estáveis compatíveis e lockfile em T1. Modelos de agente, transcrição e síntese por variáveis de ambiente, escolhidos entre os disponíveis na conta e conferidos na documentação antes do primeiro uso. Não há promessa de preço, quota ou modelo específico nesta especificação.

## Components

| Responsável | Área exclusiva | Interface |
| --- | --- | --- |
| Jecky | `src/features/experience/`, `src/app/page.tsx`, `src/app/api/audio/` | Consome contratos; UI de caixa, CSV, chat, simulação, voz e notificações |
| Daniel | `src/features/finance/`, `src/app/api/finance/`, migrações financeiras | Cálculo, importação, compromissos, cenários e reservas |
| Bruno | `src/features/agent/`, `src/features/tasks/`, `src/app/api/agent/`, `src/app/api/tasks/`, migrações de tarefas | Catálogo, interpretação, proatividade e execução agendada |
| Base comum | `src/contracts/`, `package.json`, lockfile, configuração | T1 fecha contratos e comandos antes de as três frentes começarem |

Jecky importa um cliente tipado, não código interno do banco. Bruno depende da interface FinancePort, não da implementação de Daniel. Daniel publica respostas com os mesmos formatos usados nos mocks. Testes ficam junto de cada módulo; alteração compartilhada exige combinação explícita.

## Data Models

Definições completas e operações em `contracts.md`. `business` tem saldo inicial, início de horizonte e timezone. `transactions` guarda direção, valor, status, vencimento, previsão, liquidação e versão. `reservations` referencia compromisso e valor ativo. `tasks` referencia entidade, motivo, próxima execução, estado e versão. `task_runs` distingue ocorrências e aquisição. `notifications`, `proposals` e `action_log` guardam acompanhamento e auditoria.

## Dois fluxos

1. Usuário envia input. O agente valida a intenção e consulta ferramentas. Mutações publicam nova versão financeira. A avaliação proativa prepara propostas e tarefas. A UI mostra resultado e próximos passos.
2. Cron verifica elegibilidade dentro do banco; sem trabalho, termina sem HTTP nem IA. Havendo trabalho, dispara executor. Ele adquire ocorrência vencida, recarrega o estado e encerra se já resolvido. Se pendente, prepara notificação/proposta, registra uma única entrega e decide a próxima execução. Não precisa chamar IA quando regra determinística basta.

Uma notificação gerada com a aba fechada fica no banco até o próximo acesso. Não há push externo. Para a demo, um relógio controlado dispara as mesmas ocorrências pelo mesmo executor, claramente identificado como simulação de horário. Isso não substitui testar o cron real depois do provisionamento autorizado.

## Error Handling Strategy

| Erro | Tratamento | Resultado observável |
| --- | --- | --- |
| CSV inválido | Validar antes de transação | 422 com linhas/campos; zero inserções |
| Versão antiga / ID conflitante | Rejeitar, não sobrescrever | 409 com versão atual |
| Sem sessão / segredo incorreto | Interromper antes do domínio | 401/403; zero efeitos |
| Excesso de mensagens/áudio | Limite por sessão no servidor | 429 e retry_after_seconds |
| OpenAI indisponível | Não confirmar efeitos inexistentes | 503; texto e painel continuam disponíveis |
| Executor concorrente | Aquisição atômica e unicidade | Uma ocorrência e uma notificação |
| Notificação já persistida e retry | Reutilizar chave da ocorrência | Sem segunda entrega |
| Falha durante execução | Lease de 120 s; retry elegível após 60 s, 300 s e 900 s, processado no próximo tick de cinco minutos; após três retries estado failed | Histórico visível, reprocessamento manual idempotente |

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Sem app, manifests ou testes | Diretório atual | Não há convenções executáveis para reaproveitar | T1 cria base comum e fixa comandos; nenhum gate de produto é declarado passado hoje |
| Implementação por IA em três frentes | Contratos compartilhados | Tipos divergentes e conflitos | Um dono por área, mocks e contratos versionados |
| Agendamento condicionado à infraestrutura | Executor e cron | Pode aparentar proatividade sem executar ao fundo | Persistência + teste de cron sem cliente, não apenas temporizador de browser |
| Valores inventados pelo modelo | Catálogo de ferramentas | Recomendações financeiras incoerentes | IA recebe resultados determinísticos e não faz cálculo de saldo |
| Dados fake acessíveis na demo | Sessão de demonstração | Mutação pública indevida | Cookie assinado, validação de origem, empresa fixa, limites e ausência de dados reais |
| Mudança de data concorrente | Compromissos versionados | Ação stale | expected_version e conflito 409 |

## Code Reuse Analysis

Não há aplicação existente. Documentos e fixture são a fonte de comportamento. O HTML é explicação de fluxo, não frontend a reaproveitar como aplicação. Nenhum scaffold ou dependência foi instalado.

## Research

Consulta em 23/10/2026. Não há Context7 disponível nesta sessão; após inspeção local/documental, foram consultadas fontes oficiais.

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers): endpoints junto da aplicação.
- [Supabase Cron](https://supabase.com/docs/guides/cron): execução persistida e chamadas HTTP.
- [Agendamento com pg_cron e pg_net](https://supabase.com/docs/guides/functions/schedule-functions): mecanismo de disparo e armazenamento de credenciais; endpoint escolhido aqui é Next.js, sem runtime Edge adicional.
- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling): ferramentas com argumentos estruturados.
- [OpenAI Audio](https://developers.openai.com/api/reference/typescript/resources/audio): referência de transcrição/síntese; reconferir modelos e limites na implementação.

## Restrições confirmadas de hospedagem gratuita

Aplicar docs/deploy-gratuito.md: runtime Node.js, maxDuration 60 s, lote até cinco tarefas com orçamento de 30 s, cron Supabase com verificação SQL de cinco minutos e despacho HTTP condicional, e retries no próximo tick elegível. Sem worker residente, armazenamento local persistente ou timers de browser para agendamento. Dados e rate limit em Postgres por API HTTPS/RPC. Áudio até 3 MiB/60 s, multipart sem base64. Síntese limitada a 1.200 caracteres/3 MiB. Preview sem credenciais nem cron de produção. Nenhuma função continua processando trabalho depois da resposta. O executor automático usa regras/rascunhos determinísticos sem chamada OpenAI por tick. Infraestrutura gratuita não inclui consumo da API de IA.

A precisão do agendamento é por verificação periódica, não horário exato garantido. Supabase pausado ou quotas esgotadas impedem execução; registrar e exibir indisponibilidade. Um responsável centraliza publicação no Hobby, respeitando restrições de Git/autoria da plataforma. Não alterar autores para viabilizar deploy.

## Horários definidos pelo agente

O agente decide o horário antes de criar a tarefa e registra referência do compromisso, due_at UTC, timezone, antecedência, motivo, origem user/agent/default e condição de encerramento. Um pedido temporal explícito do usuário prevalece sobre a sugestão. O cron não chama IA para escolher quando acordar. Uma mudança no compromisso reavalia tarefas associadas; não mantém lembrete baseado em uma versão antiga sem verificar pertinência. A proposta usa verificação SQL condicional com bloqueio de despacho temporário, além da aquisição atômica de ocorrência já especificada.
