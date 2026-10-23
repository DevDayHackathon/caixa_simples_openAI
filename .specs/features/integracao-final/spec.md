# Integração final

## Objective
Corrigir o PR Bruno e integrar agente, finanças, tarefas e voz sem mocks em produção.

## Assumptions
Empresa demo compartilhada com dados fictícios; preserva FinancePort/AgentPort v1. Sem credenciais reais disponíveis. Usuário autorizou correções, push e merge automático; não autorizou deploy nem migração remota. Sessão antiga assinada permanece compatível, nova sessão financeira é a autoridade. Modelos são configurados explicitamente no servidor.

## Requirements
- FINAL-01: WHEN migrações 001/002 forem aplicadas em Postgres vazio THEN o banco SHALL aceitar tarefas, histórico limitado a vinte entradas, quota e encerramento transacional sem erro.
- FINAL-02: WHEN a sessão financeira acessar agente ou executor THEN o servidor SHALL consultar somente o caixa persistido, validar Origin e manter a versão real; sem banco em produção SHALL responder erro recuperável.
- FINAL-03: WHEN o usuário aceitar/dispensar/ajustar proposta ou atuar no feed THEN o servidor SHALL validar a entidade/versão/confirmação, persistir a decisão e impedir duplicação de efeitos; uma proposta obsoleta SHALL ser rejeitada.
- FINAL-04: WHEN agente e voz estiverem configurados THEN /caixa SHALL oferecer conversa/feed e áudio real com sessão e quota persistida antes do provedor; sem configuração SHALL preservar finanças e erro textual.
- FINAL-05: WHEN os gates e revisão independente passarem THEN os commits SHALL ser publicados e incorporados à main; testes reais com credenciais SHALL permanecer explicitamente pendentes até sua configuração.

## Out of scope
Deploy, alterações remotas no Supabase, chaves reais, operações bancárias, envio externo de cobranças.
