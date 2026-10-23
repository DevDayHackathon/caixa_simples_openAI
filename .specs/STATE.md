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

### AD-003
- **Decision**: A implantação alvo usa Vercel Hobby e Supabase Free; o Supabase Cron dispara o executor HTTP na Vercel a cada cinco minutos.
- **Reason**: Restrição explícita do usuário; Cron Vercel Hobby tem frequência máxima diária.
- **Trade-off**: Entrega por verificação periódica, quotas gratuitas e possível pausa do banco; não há worker permanente nem garantia de horário exato.
- **Scope**: Hospedagem, tarefas, payload de voz, persistência e publicação da equipe.
- **Date**: 2026-10-23
- **Status**: superseded by AD-004

### AD-004
- **Decision**: O agente define due_at e justificativa antes de criar tarefa. Supabase Cron verifica o banco a cada cinco minutos e só despacha HTTP à Vercel se houver tarefa vencida elegível; sem trabalho, nenhuma chamada Vercel/OpenAI.
- **Reason**: Aceite explícito do usuário para evitar chamadas inúteis, preservando acompanhamento independente de input.
- **Trade-off**: Permanece a checagem SQL periódica e a precisão de cinco minutos; aquisição e rechecagem no executor continuam necessárias.
- **Scope**: Agendamento e executor; mantém Vercel Hobby e Supabase Free da AD-003.
- **Date**: 2026-10-23
- **Status**: active

## Handoff

- **Feature**: `.specs/features/caixa-proativo/`
- **Phase / Task**: especificação e proposta de divisão; nenhuma tarefa de produto executada.
- **Completed**: spec.md, context.md, design.md proposto, contracts.md, tasks.md, fixture, README e divisão da equipe; validate_spec e validate_tasks passaram em modo strict, sem erros ou avisos. Git inicializado em main.
- **Next step**: entregar mensagens específicas e checklist de T1 em docs/mensagens-equipe.md; T1 não iniciada e branches não criadas. Depois, revisar stack e divisão com implantação gratuita confirmada, antes de criar as três branches. Guia em docs/deploy-gratuito.md. HOST-01 a HOST-04 adicionados; áudio até 3 MiB.
- **Blockers**: revisão da proposta técnica antes de Execute; sem autorização de publicação remota.
- **Branch**: main; nenhuma branch da equipe foi criada. As próximas branches propostas são feat/jecky-experiencia-voz, feat/daniel-caixa-dados e feat/bruno-agente-proativo, após revisão e base comum T1. T1 não executada.
