# Integração final

## Problem Statement
Corrigir o PR Bruno e integrar agente, finanças, tarefas e voz sem mocks em produção.

## Assumptions & Open Questions
Open questions: none.
Empresa demo compartilhada com dados fictícios; preserva FinancePort/AgentPort v1. Sem credenciais reais disponíveis. Usuário autorizou correções, push e merge automático; não autorizou deploy nem migração remota. Sessão antiga assinada permanece compatível, nova sessão financeira é a autoridade. Modelos são configurados explicitamente no servidor.

## Requirements
- FINAL-01: WHEN migrações 001/002 forem aplicadas em Postgres vazio THEN o banco SHALL aceitar tarefas, histórico limitado a vinte entradas, quota e encerramento transacional sem erro.
- FINAL-02: WHEN a sessão financeira acessar agente ou executor THEN o servidor SHALL consultar somente o caixa persistido, validar Origin e manter a versão real; sem banco em produção SHALL responder erro recuperável.
- FINAL-03: WHEN o usuário aceitar/dispensar/ajustar proposta ou atuar no feed THEN o servidor SHALL validar a entidade/versão/confirmação, persistir a decisão e impedir duplicação de efeitos; uma proposta obsoleta SHALL ser rejeitada.
- FINAL-04: WHEN agente e voz estiverem configurados THEN /caixa SHALL oferecer conversa/feed e áudio real com sessão e quota persistida antes do provedor; sem configuração SHALL preservar finanças e erro textual.
- FINAL-05: WHEN os gates e revisão independente passarem THEN os commits SHALL ser publicados e incorporados à main; testes reais com credenciais SHALL permanecer explicitamente pendentes até sua configuração.

## Out of Scope
Deploy, alterações remotas no Supabase, chaves reais, operações bancárias, envio externo de cobranças.

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
| FINAL-04 | T4 | Implementing |
| FINAL-05 | T6 | Implementing |

Sem questões em aberto para implementação. O ensaio com APIs reais depende das credenciais a serem configuradas pelo usuário e não é declarado realizado.
