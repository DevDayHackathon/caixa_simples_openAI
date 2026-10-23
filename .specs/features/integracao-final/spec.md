# Integração final

## Problem Statement
Corrigir o PR Bruno e integrar agente, finanças, tarefas e voz sem mocks em produção.

## Assumptions & Open Questions
Open questions: none.
Empresa demo compartilhada com dados fictícios; preserva FinancePort/AgentPort v1. Sem credenciais reais disponíveis. Usuário autorizou correções, push e merge automático. Posteriormente autorizou criar e publicar o projeto Vercel, já realizado; migração/Vault/Cron remotos dependem da confirmação do banco demo autorizado. Sessão antiga assinada permanece compatível, nova sessão financeira é a autoridade. Modelos são configurados explicitamente no servidor.

## Requirements
- FINAL-01: WHEN migrações 001/002 forem aplicadas em Postgres vazio THEN o banco SHALL aceitar tarefas, histórico limitado a vinte entradas, quota e encerramento transacional sem erro.
- FINAL-02: WHEN a sessão financeira acessar agente ou executor THEN o servidor SHALL consultar somente o caixa persistido, validar Origin e manter a versão real; sem banco em produção SHALL responder erro recuperável.
- FINAL-03: WHEN o usuário aceitar/dispensar/ajustar proposta ou atuar no feed THEN o servidor SHALL validar a entidade/versão/confirmação, persistir a decisão e impedir duplicação de efeitos; uma proposta obsoleta SHALL ser rejeitada.
- FINAL-04: WHEN agente e voz estiverem configurados THEN /caixa SHALL oferecer conversa/feed e áudio real com sessão e quota persistida antes do provedor; sem configuração SHALL preservar finanças e erro textual.
- FINAL-05: WHEN os gates e revisão independente passarem THEN os commits SHALL ser publicados e incorporados à main; testes reais com credenciais SHALL permanecer explicitamente pendentes até sua configuração.

- FINAL-06: WHEN o usuário pedir acompanhamento com horário explícito de São Paulo THEN o agente SHALL receber o instante atual e fuso da empresa, aceitar instante ISO com offset e persistir o mesmo instante normalizado em UTC; datas sem horário SHALL exigir esclarecimento sem escrita.

- FINAL-07: WHEN uma proposta aceita ou dispensada for exibida após avanço da revisão financeira THEN o cartão SHALL preservar o estado final e não oferecer nova decisão; somente propostas pendentes de revisão anterior SHALL indicar desatualização.

## Out of Scope
Implementação de infraestrutura remota não integra este gate de código. O deploy demonstrativo foi autorizado e publicado em etapa posterior; configuração de credenciais, alterações remotas no Supabase e UAT real seguem separadas. Operações bancárias e envio externo de cobranças permanecem fora do escopo.

## User Stories
Como apresentador, quero perguntar sobre o caixa persistido e confirmar propostas para demonstrar decisões verificáveis.
Como usuário, quero receber um aviso de tarefa já programada ao reabrir a aplicação sem manter uma aba ativa.
Como equipe, queremos configurar as chaves no servidor e ensaiar voz e conversa com APIs reais após o gate local.

## Requirement Traceability
| ID | Tasks | Status |
| --- | --- | --- |
| FINAL-01 | T1, T5 | Verified |
| FINAL-02 | T2 | Verified |
| FINAL-03 | T3, T5 | Verified |
| FINAL-04 | T4 | Verified |
| FINAL-05 | T6, T7, T9 | Verified |
| FINAL-06 | T8 | Verified |
| FINAL-07 | T10 | Verified |

Sem questões em aberto para implementação. O ensaio com APIs reais depende das credenciais a serem configuradas pelo usuário e não é declarado realizado.
