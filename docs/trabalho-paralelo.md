# Trabalho paralelo — Jecky, Daniel e Bruno

Status: proposta para revisão. Três branches planejadas, nenhuma criada nesta etapa. Associação de pessoas é uma distribuição inicial por domínio, não uma suposição sobre experiência individual.

## Base comum antes do paralelo

1. Revisar requisitos, defaults, stack e ownership juntos.
2. Daniel prepara T1 em main e os três revisam: configuração única, contratos executáveis, fixtures, mocks, scripts e lockfile. Essa implementação ainda não foi iniciada.
3. Criar exatamente uma branch para cada integrante a partir do mesmo commit de T1.
4. Cada pessoa usa um clone ou worktree próprio. Trocar de branch no mesmo diretório não permite trabalho simultâneo de três pessoas.

## Divisão

| Pessoa | Branch proposta | Tarefas | Entrega |
| --- | --- | --- | --- |
| Jecky | feat/jecky-experiencia-voz | T15–T20 | Painel, importação visual, cenários, conversa, decisões, áudio e notificações |
| Daniel | feat/daniel-caixa-dados | T2–T8 | Banco financeiro, CSV, saldo, projeção, contas, cenários, reservas e APIs financeiras |
| Bruno | feat/bruno-agente-proativo | T9–T14 | Ferramentas, conversa com IA, iniciativas, tarefas persistidas, executor e APIs do agente |

Não se deve criar três branches por pessoa. A proposta é **três branches no total**, uma por integrante.

## Jecky — experiência e voz

Desenvolver os componentes que permitem ao dono entender o caixa e agir sem navegar por muitos menus. Começar com mocks v1 da base comum. Não implementar outra fórmula de saldo no navegador. O áudio é capturado na UI, mas transcrição/síntese usam endpoints server-side da própria área de áudio.

Área: `src/features/experience/`, `src/app/page.tsx`, `src/app/api/audio/`. Testes de componentes e áudio acompanham cada tarefa. A entrada do usuário e as notificações vindas de tarefas precisam ficar distinguíveis na conversa.

Entregar: interface com CSV e saldo inicial; gráfico e dias negativos; comparação base/hipótese; texto/voz; aceitar/corrigir/adiar/dispensar; feed de iniciativas; estados vazios e de erro.

## Daniel — fonte de verdade financeira

Implementar cálculo em centavos e persistência consistente. É responsável pelo CSV e pelos registros que UI e agente consultam. Depois da base comum, não altera catálogo de IA nem componentes da interface.

Área: `src/features/finance/`, `src/app/api/finance/`, `supabase/migrations/001_finance.sql`. Entrega interface FinancePort e adaptador real. Bruno pode usar mock até essa implementação estar pronta.

Entregar: importação atômica e idempotente; resumo; curva de 30 dias; alteração de previsão preservando vencimento; liquidação sem dupla contagem; simulações isoladas; reserva virtual sem duplicação; conflitos de versão e testes F1/F2.

## Bruno — iniciativa e acompanhamento

Implementar os dois caminhos separados. No caminho do usuário, responder e avaliar consequências. No programado, recarregar contexto e verificar pendência antes de notificar. O executor não depende de uma aba aberta nem de novo pedido do usuário.

Área: `src/features/agent/`, `src/features/tasks/`, `src/app/api/agent/`, `src/app/api/tasks/`, `supabase/migrations/002_tasks.sql`. Não duplicar lógica financeira; utilizar FinancePort.

Entregar: ferramentas validadas; esclarecimento de ambiguidades; alerta de déficit; rascunho de cobrança; proposta de reserva; criação de lembrete; aquisição de ocorrência; deduplicação; encerramento/reagendamento; histórico e tratamento de falhas. Nenhum canal de cobrança externa é implementado.

## Dependências sem bloqueio desnecessário

- T1 é pré-requisito compartilhado. Jecky e Bruno começam seus módulos com mocks e testes de contrato.
- Dentro da própria branch, cada pessoa respeita as dependências detalhadas em tasks.md.
- Daniel entrega primeiro importação e snapshot; isso libera a primeira integração real da UI.
- Bruno entrega o catálogo e o turno antes do refinamento do cron; o executor é testado com relógio controlável e banco isolado.
- Jecky pode entregar o painel textual e depois áudio; a entrega final ainda precisa incluir o caminho por voz.
- T21 reúne os adaptadores reais, com Jecky coordenando UI, Daniel números e Bruno agente.
- T22 ensaia cron e demonstração. Um verificador independente fecha a validação depois da implementação, não agora.

## Regras para evitar conflitos

Uma pessoa é dona de cada área. Não editar package.json, lockfile, contratos ou migração do colega sem combinar. Dependência nova é incorporada na base e sincronizada, nunca resolvida com três lockfiles divergentes. Nomes de migração são distintos e Bruno não depende de objetos financeiros além do contrato definido.

Cada tarefa inclui implementação e testes, atualiza o seu status e gera um commit atômico. Para evitar conflito em tasks.md, cada pessoa altera apenas seus blocos e as linhas de requisitos correspondentes; integração concilia linhas que têm mais de um responsável. Nenhum teste é removido para resolver merge.

Branches partem do mesmo commit. Sincronizar base antes de integrar. Ordem proposta de incorporação: Daniel, Bruno, Jecky, depois T21/T22; não confundir essa ordem de integração com a execução paralela. Rodar gate completo após cada incorporação. Nenhum push ou deploy foi autorizado nesta etapa.

## Prompts de início para uso com IA

### Jecky

Leia spec.md, context.md, contracts.md e os blocos T15–T20 em tasks.md da feature caixa-proativo. Trabalhe somente na área de experiência/voz na sua branch. Ative tlc-spec-driven e siga tarefas em ordem, com testes co-localizados e um commit por tarefa. Consuma mocks v1 até os adaptadores reais estarem disponíveis. Não altere contratos compartilhados sem combinar. Não faça push ou deploy.

### Daniel

Leia a especificação caixa-proativo, contratos e tarefas T2–T8; T1 precisa estar concluída na base comum. Ative tlc-spec-driven e implemente a fonte de verdade financeira em centavos, com F1/F2 e banco isolado nos testes. Um commit por tarefa, incluindo status e evidência do gate. Não implemente IA nem interface. Não faça push ou deploy.

### Bruno

Leia a especificação caixa-proativo, contratos e tarefas T9–T14. Ative tlc-spec-driven e mantenha separados input do usuário e tarefa programada. Use FinancePort, inicialmente com mocks, sem duplicar cálculos. Teste reprocessamento, concorrência e compromisso já resolvido. Não execute transação bancária nem envie cobrança externa. Um commit por tarefa. Não faça push, provisionamento ou deploy sem autorização.
