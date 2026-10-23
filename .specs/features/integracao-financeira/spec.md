# Integração financeira independente do agente

## Objetivo
Conectar a interface Fôlego aos dados fictícios persistidos, mantendo a prévia sem credenciais em `/` e disponibilizando `/caixa` sem fallback silencioso para mocks. Não executar operações bancárias.

## Critérios de aceitação
- INT-01: WHEN a área persistida abre THEN o sistema SHALL emitir sessão demo e carregar snapshot, compromissos e configurações da mesma revisão.
- INT-02: WHEN CSV é confirmado ou previsão é alterada THEN o sistema SHALL atualizar todos os dados financeiros e remover hipóteses da revisão anterior.
- INT-03: WHEN o usuário cria, liquida ou reserva um compromisso THEN o sistema SHALL persistir a ação somente após confirmação e atualizar o painel; uma recarga SHALL conservar os dados.
- INT-04: IF sessão expira, banco falha ou versão conflita THEN o sistema SHALL mostrar erro recuperável sem substituir dados por mocks ou repetir mutações automaticamente.
- INT-05: WHEN o gate roda localmente ou em CI THEN o sistema SHALL executar testes financeiros em Postgres isolado de loopback e os testes existentes sem skips.
- INT-06: WHILE a integração do agente e quota persistida está pendente THEN o sistema SHALL identificar conversa e áudio indisponíveis na área persistida, mantendo sua composição documentada e sem habilitar chamadas pagas.

## Limites
Somente empresa demo e dados fictícios. Sem deploy, migração remota ou push. Não alterar FinancePort v1 nem implementar agente, cron ou migrações do Bruno. Leitura agregada é endpoint adicional de experiência, não mudança no contrato v1. Horizonte permanece fixo em 30 dias; fora dele usar data de referência explícita dentro da janela. Áudio seguro continua dependendo da quota compartilhada de Bruno.
