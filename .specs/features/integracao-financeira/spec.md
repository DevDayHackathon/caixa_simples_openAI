# Integração financeira independente do agente

## Problem Statement
Conectar a interface Fôlego aos dados fictícios persistidos, mantendo a prévia sem credenciais em `/` e disponibilizando `/caixa` sem fallback silencioso para mocks. Não executar operações bancárias.

## User Stories

Como usuário da empresa demo, quero gerenciar compromissos persistidos pela interface antes da integração do agente.

### Critérios de aceitação
- INT-01: WHEN a área persistida abre THEN o sistema SHALL emitir sessão demo e carregar snapshot, compromissos e configurações da mesma revisão.
- INT-02: WHEN CSV é confirmado ou previsão é alterada THEN o sistema SHALL atualizar todos os dados financeiros e remover hipóteses da revisão anterior.
- INT-03: WHEN o usuário cria, liquida ou reserva um compromisso THEN o sistema SHALL persistir a ação somente após confirmação e atualizar o painel; uma recarga SHALL conservar os dados.
- INT-04: IF sessão expira, banco falha ou versão conflita THEN o sistema SHALL mostrar erro recuperável sem substituir dados por mocks ou repetir mutações automaticamente.
- INT-05: WHEN o gate roda localmente ou em CI THEN o sistema SHALL executar testes financeiros em Postgres isolado de loopback e os testes existentes sem skips.
- INT-06: WHILE a integração do agente e quota persistida está pendente THEN o sistema SHALL identificar conversa e áudio indisponíveis na área persistida, mantendo sua composição documentada e sem habilitar chamadas pagas.

## Out of Scope
Somente empresa demo e dados fictícios. Sem deploy, migração remota ou push. Não alterar FinancePort v1 nem implementar agente, cron ou migrações do Bruno. Leitura agregada é endpoint adicional de experiência, não mudança no contrato v1. Horizonte permanece fixo em 30 dias; fora dele usar data de referência explícita dentro da janela. Áudio seguro continua dependendo da quota compartilhada de Bruno.

## Assumptions & Open Questions
- Assumimos uma empresa fictícia compartilhada, conforme a demo existente; não há contas privadas por usuário.
- `/` preserva a prévia; `/caixa` usa somente persistência, com sessão assinada e dados da mesma revisão.
- Não há autorização para provisionamento remoto, push ou deploy nesta entrega.
- A quota persistida e as decisões via AgentPort permanecem sob integração com Bruno. Nenhuma questão bloqueia o recorte financeiro.

## Requirement Traceability
| Requirement ID | Tasks | Status |
| --- | --- | --- |
| INT-01 | T2, T3 | In Progress |
| INT-02 | T3 | In Progress |
| INT-03 | T3 | In Progress |
| INT-04 | T2, T3 | In Progress |
| INT-05 | T1 | Verified local |
| INT-06 | T4 | In Progress |
