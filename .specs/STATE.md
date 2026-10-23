# STATE

## Decisions

### AD-001
- **Decision**: O MVP usa dados informados, CSV e reservas virtuais; não executa operações bancárias.
- **Reason**: Cumprir o desafio e concentrar o diferencial na proatividade.
- **Trade-off**: Saldo não é sincronizado com banco e exige atualização do usuário.
- **Scope**: Todos os fluxos financeiros e de agente.
- **Date**: 2026-10-23
- **Status**: active

### AD-002
- **Decision**: Input do usuário e tarefa programada são fluxos separados que compartilham ferramentas financeiras.
- **Reason**: Solicitação explícita do usuário; uma tarefa pode agir sem conversa iniciada.
- **Trade-off**: É necessário manter estado de tarefas e execução persistida.
- **Scope**: Agente, executor e contratos.
- **Date**: 2026-10-23
- **Status**: active

## Handoff

- **Feature**: `.specs/features/caixa-proativo/`
- **Phase / Task**: especificação e proposta de divisão; nenhuma tarefa de produto executada.
- **Completed**: spec.md, context.md, design.md proposto, contracts.md, tasks.md, fixture, README e divisão da equipe; validate_spec e validate_tasks passaram em modo strict, sem erros ou avisos. Git inicializado em main.
- **Next step**: apresentar stack e divisão antes de criar as três branches, conforme solicitado.
- **Blockers**: revisão da proposta técnica antes de Execute; sem autorização de publicação remota.
- **Branch**: main; nenhuma branch da equipe foi criada. As próximas branches propostas são feat/jecky-experiencia-voz, feat/daniel-caixa-dados e feat/bruno-agente-proativo, após revisão e base comum T1. T1 não executada.
