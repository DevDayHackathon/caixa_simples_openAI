# Caixa proativo — Specification

Status: T1 implementada e verificada; funcionalidades de produto ainda pendentes em T2–T22.
Data: 2026-10-23. Prioridades: P1 = MVP; P2 = evolução; P3 = futuro.

## Problem Statement

O dono de um pequeno negócio precisa entender o dinheiro disponível e os compromissos que podem apertar o caixa. A solução combina informações fornecidas pelo usuário com um agente que acompanha pendências, prepara cobranças, recomenda reservas e retoma o contexto quando tarefas agendadas disparam.

Fontes de escopo: `contexto_hackathon_painel_de_caixa.md`, conversa da equipe, `pesquisa_solucoes_caixa_hackathon.md` e `fluxos_agente_proativo.html`. Recursos dos concorrentes são referências, não obrigações do projeto.

## Goals

- Demonstrar CSV, resumo, alteração de recebimento e período afetado em até três minutos.
- Demonstrar dois pontos de entrada reais e independentes: usuário e tarefa programada.
- Permitir consultar, registrar, alterar, simular e decidir por texto e voz.
- Demonstrar reserva virtual, rascunho de cobrança e encerramento de lembrete resolvido.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Integração bancária / Open Finance | MVP calcula com CSV, saldo inicial e conversa |
| Transferências, Pix, boletos e reserva bancária real | Reserva é apenas compromisso virtual no painel |
| Envio de cobrança por WhatsApp, SMS ou e-mail | MVP prepara texto para copiar; não contata terceiros |
| Contabilidade, fiscal, crédito e antecipação | Não são necessários ao desafio |
| Múltiplas empresas, moedas e usuários com permissões distintas | Demonstração de uma empresa fictícia em BRL |
| Estoque completo e previsão estatística de inadimplência | Reposição é P2; trinta dias não sustentam inferências robustas |
| Push no dispositivo e conversa telefônica contínua | MVP mantém caixa de notificações; áudio é por turnos |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Origem dos números | CSV e dados fornecidos pelo usuário, com saldo inicial | Aceito na conversa; não depende de banco | Sim |
| Entradas do agente | Usuário ou disparo de tarefa criada pelo agente | Correção explícita do usuário | Sim |
| Equipe | Jecky: experiência/voz; Daniel: caixa/dados; Bruno: agente/tarefas | Proposta por domínio, sem presumir experiência individual | Proposta |
| Recorte | BRL; empresa fictícia; 30 dias consecutivos | Enunciado do desafio | Sim |
| Datas | Calendário America/Sao_Paulo; instantes armazenados em UTC | Evita diferença entre vencimento e horário do servidor | Proposta |
| Persistência | Dados, tarefas e notificações sobrevivem a recarga/reinício | Lembretes não podem depender da memória de uma aba | Proposta |
| Notificação sem usuário conectado | Registrar no servidor e mostrar no próximo acesso | Não acrescenta um canal externo ao MVP | Proposta |
| Rotinas permitidas | Criar lembretes internos automaticamente com preferência habilitada e exibi-los | Torna proatividade concreta sem solicitar confirmação repetida | Proposta |
| Reservas | Aprovação por ação; opção explícita de automação fica P2 | Evita comprometer valores sem decisão do dono | Proposta |
| Segurança da demo | Somente dados fictícios; sessão assinada de demonstração, sem cadastro | Mantém demo acessível e bloqueia acesso direto indevido às mutações | Proposta |
| Limites | CSV até 1 MiB/1.000 linhas; áudio até 60 s/3 MiB; mensagem até 4.000 caracteres | Limita custo e processamento da demo | Proposta |
| Hospedagem | Vercel Hobby e Supabase Free | Restrição explícita do usuário; detalhes em docs/deploy-gratuito.md | Sim |
| Stack | Next.js/TypeScript, Supabase/Postgres/Cron, OpenAI, Tailwind, Zod, Vitest e Playwright | Recomendação solicitada; revisar divisão antes de criar branches | Proposta |
| Qualidade | Unitários, integração e E2E conforme tasks.md | Não existem testes nem aplicação neste diretório | Proposta |
| Visão ideal versus MVP | Todas as funções principais de caixa e proatividade em P1; estoque em P2 | Evita que reposição impeça a entrega obrigatória | Proposta |

**Open questions:** none — ambiguidades de produto resolvidas ou registradas como propostas acima. Aprovação dessas propostas ainda não ocorreu. Agente define horário individual; SQL do cron só despacha tarefas vencidas elegíveis, conforme aceite do usuário. Modelos, versões e comandos serão fixados no bootstrap, antes de executar tarefas dependentes.

## Business Rules

Valores em centavos inteiros positivos, com direção `in` ou `out`. Saldo inicial é o saldo de abertura do primeiro dia e não inclui as movimentações desse dia. O horizonte é `[start_date, start_date + 29 dias]`. Caixa diário é saldo de fechamento.

Saldo atual na data consultada = saldo inicial + entradas realizadas até essa data − saídas realizadas até essa data. Totais de entradas/saídas realizadas não incluem previsões. Saldo previsto futuro parte do atual e acumula compromissos pendentes nas datas esperadas. Vencimento original nunca é reescrito pela alteração de previsão. Reserva reduz o disponível livre, mas não o saldo bancário nem o saldo projetado; a conta futura já participa da projeção uma única vez.

Recebível vencido sem nova data fica identificado como incerto e excluído das entradas futuras até atualização. O painel mostra essa exclusão; não presume recebimento hoje. Saldo zero não é negativo. Caixa positivo não equivale a lucro.

## User Stories

### P1: US1 — Importar e confiar nos dados

**User Story**: Como dono, quero informar saldo inicial e importar movimentações para começar sem digitar tudo.

**Acceptance Criteria**:
1. WHEN um CSV válido é confirmado THEN o sistema SHALL persistir todas as linhas da prévia em uma única importação. [DATA-01]
2. IF uma linha possui valor, direção, status ou data inválidos THEN o sistema SHALL rejeitar a importação inteira com a linha e o campo inválido identificados. [DATA-02]
3. WHEN a mesma chave de importação é reenviada THEN o sistema SHALL retornar o resultado anterior sem inserir movimentações adicionais. [DATA-03]
4. WHEN os dados persistidos são carregados THEN o sistema SHALL apresentar origem, atualização e a indicação de saldo calculado sem conexão bancária. [DATA-04]

**Independent Test**: importar a fixture oficial, recarregar e reenviar a mesma importação; permanecem duas movimentações.

### P1: US2 — Entender e simular o caixa

**User Story**: Como dono, quero enxergar entradas, saídas e o impacto de um atraso para decidir antes de faltar dinheiro.

**Acceptance Criteria**:
1. WHEN a fixture F1 é consultada em 23/10/2026 THEN o sistema SHALL retornar saldo atual 100000 e totais realizados de entrada e saída iguais a zero. [CASH-01]
2. WHEN a projeção base F1 é calculada THEN o sistema SHALL retornar saldo de fechamento 300000 em 25/10 e 150000 em 27/10. [CASH-02]
3. WHEN o recebimento F1 é simulado para 01/11 THEN o sistema SHALL identificar saldo mínimo -50000 e intervalo negativo de 27/10 a 31/10 inclusive. [CASH-03]
4. WHILE uma simulação está ativa o sistema SHALL preservar os registros do cenário-base. [CASH-04]
5. WHEN a alteração de previsão é confirmada THEN o sistema SHALL manter o vencimento original do recebimento. [CASH-05]
6. WHEN uma conta prevista é confirmada como realizada THEN o sistema SHALL contabilizar seu valor uma única vez no saldo. [CASH-06]

**Independent Test**: usar F1 e comparar os valores diários com os resultados acima, sem depender de IA.

### P1: US3 — Conversar por texto e voz

**User Story**: Como dono, quero falar uma intenção sem aprender menus financeiros.

**Acceptance Criteria**:
1. WHEN um input válido solicita consulta, registro, mudança de previsão, simulação ou decisão sobre proposta THEN o agente SHALL encaminhar a intenção à ferramenta correspondente do catálogo. [AGENT-01]
2. IF o pedido identifica mais de um compromisso possível ou omite um campo obrigatório THEN o agente SHALL solicitar esclarecimento antes de executar a mutação. [AGENT-02]
3. WHEN um áudio válido é enviado THEN o sistema SHALL exibir a transcrição editável antes de confirmar uma mutação financeira. [VOICE-01]
4. WHEN uma resposta textual é produzida THEN o sistema SHALL disponibilizar reprodução por áudio acionada pelo usuário. [VOICE-02]
5. IF transcrição, síntese ou agente falha THEN o sistema SHALL manter disponível o caminho por texto sem registrar mutação como concluída. [VOICE-03]

**Independent Test**: os mesmos pedidos em texto e áudio transcrito resultam nos mesmos contratos de ferramenta; um pedido ambíguo não altera contas.

### P1: US4 — Receber recomendações úteis após um input

**User Story**: Como dono, quero que o agente perceba consequências além da pergunta que fiz.

**Acceptance Criteria**:
1. WHEN uma importação ou mutação financeira é concluída THEN o agente SHALL avaliar o contexto atualizado antes de selecionar iniciativas. [PRO-01]
2. WHEN a projeção cruza o limite de reserva configurado THEN o sistema SHALL preparar um alerta com período, menor saldo, compromissos causadores e alternativa simulável. [PRO-02]
3. WHEN há recebível vencido sem confirmação THEN o agente SHALL preparar rascunho com cliente, valor e vencimento conhecidos, sem alegar envio. [PRO-03]
4. WHEN existem mais de três iniciativas elegíveis THEN o sistema SHALL apresentar no máximo três, ordenadas por primeiro dia afetado, maior déficit e identificador como desempate. [PRO-04]

**Independent Test**: atualizar F1 para atraso e obter alerta com -50000 no período correto; não basta responder à consulta original.

### P1: US5 — Separar dinheiro para fornecedores

**User Story**: Como dono, quero saber quanto já tem destino e quanto está livre.

**Acceptance Criteria**:
1. WHEN o usuário aceita reserva de 50000 na fixture F2 THEN o sistema SHALL retornar saldo 100000, reservado 50000 e livre 50000. [RES-01]
2. WHEN a mesma reserva F2 é confirmada novamente THEN o sistema SHALL manter o total reservado em 50000. [RES-02]
3. WHEN o fornecedor vinculado é pago THEN o sistema SHALL encerrar sua reserva sem subtrair o valor duas vezes. [RES-03]
4. IF uma proposta de reserva excede o saldo atual menos reservas ativas THEN o sistema SHALL rejeitar a confirmação e informar o valor disponível. [RES-04]

**Independent Test**: criar F2, aceitar duas vezes e liquidar o fornecedor; reserva termina e saldo final é 50000.

### P1: US6 — Acompanhar por tarefas programadas

**User Story**: Como dono, quero que o agente volte a uma pendência no momento combinado sem eu iniciar uma conversa.

**Acceptance Criteria**:
1. WHEN há compromisso futuro e lembretes internos estão habilitados THEN o agente SHALL criar tarefa persistida com referência, horário e critério de encerramento. [TASK-01]
2. WHEN chega o horário de tarefa pendente THEN o executor SHALL reconsultar o compromisso mesmo sem input do usuário ou aba aberta. [TASK-02]
3. WHEN a tarefa encontra compromisso já resolvido THEN o executor SHALL encerrar a tarefa sem produzir nova cobrança ou lembrete. [TASK-03]
4. WHEN uma ocorrência pendente é entregue mais de uma vez ao executor THEN o sistema SHALL produzir no máximo uma notificação para essa ocorrência. [TASK-04]
5. WHEN o usuário adia um lembrete para um horário explícito THEN o sistema SHALL reagendar a tarefa sem manter uma segunda ocorrência ativa equivalente. [TASK-05]
6. IF o executor falha THEN o sistema SHALL registrar o erro e permitir reprocessar a mesma ocorrência sem duplicar seus efeitos. [TASK-06]

7. WHEN o agente cria uma tarefa THEN o sistema SHALL persistir o horário decidido previamente e sua justificativa nos campos de agendamento definidos em contracts.md. [TASK-07]
8. WHEN o usuário informa horário explícito de lembrete THEN o sistema SHALL usar esse horário em vez da antecedência sugerida pelo agente. [TASK-08]

**Independent Test**: criar tarefa vencida, fechar o cliente, executar o processamento no servidor e reabrir para ler uma notificação persistida; repetir processamento e permanecer uma.

### P1: US7 — Preservar integridade e limites

**User Story**: Como dono, quero que valores e decisões permaneçam coerentes quando a aplicação ou a IA falhar.

**Acceptance Criteria**:
1. The sistema SHALL manter as credenciais de OpenAI, banco privilegiado e executor fora das respostas e do código entregue ao navegador. [SAFE-01]
2. IF uma mutação usa versão de compromisso desatualizada THEN o sistema SHALL rejeitá-la com conflito e solicitar recarga do contexto. [SAFE-02]
3. IF o executor recebe chamada sem segredo válido THEN o sistema SHALL rejeitá-la sem processar tarefas. [SAFE-03]
4. The agente SHALL usar resultados das ferramentas financeiras como origem dos valores apresentados. [SAFE-04]
5. WHILE a demo está em execução o sistema SHALL limitar alterações à empresa fictícia associada à sessão válida. [SAFE-05]
6. WHEN o contexto financeiro aparece dentro de CSV ou mensagem THEN o agente SHALL tratar instruções contidas nesses dados como conteúdo sem permissão para alterar o catálogo de ações. [SAFE-06]

**Independent Test**: duas atualizações sobre a mesma versão não se sobrescrevem; chamadas indevidas falham; conteúdo importado não autoriza transferências nem envio externo.

### P2: US8 — Reposição e personalização

**User Story**: Como dono, quero conectar necessidade de estoque e capacidade financeira depois que o núcleo estiver estável.

**Acceptance Criteria**:
1. WHERE há estoque atual, consumo diário e prazo de entrega o sistema SHALL apresentar a data estimada de ruptura usando estoque dividido pelo consumo diário. [STOCK-01]
2. WHEN uma compra de reposição é simulada THEN o sistema SHALL mostrar seu impacto sem confirmar compra ou alterar estoque. [STOCK-02]

**Independent Test**: estoque 20, consumo 5/dia e entrega em 3 dias resulta em cobertura de 4 dias e pedido necessário em até 1 dia, com premissas visíveis.

### P1: US9 — Executar dentro da infraestrutura gratuita

**User Story**: Como equipe, queremos publicar a demo sem contratar Vercel Pro ou Supabase pago.

**Acceptance Criteria**:
1. WHEN o ambiente de produção é configurado THEN o sistema SHALL usar Supabase Cron para verificar tarefas elegíveis no banco a cada cinco minutos, sem Cron Vercel. [HOST-01]
2. WHEN um lote vencido é processado THEN o executor SHALL adquirir no máximo cinco ocorrências, mantendo as demais pendentes para o próximo tick. [HOST-02]
3. IF uma gravação excede 3 MiB ou 60 segundos THEN o cliente SHALL interromper a captura e disponibilizar alternativa textual sem enviar arquivo acima do limite. [HOST-03]
4. WHEN uma instância serverless é substituída THEN o sistema SHALL recuperar estado financeiro e tarefas do Postgres sem depender de arquivos locais ou memória da instância anterior. [HOST-04]

5. IF a verificação SQL não encontra tarefa vencida elegível THEN o sistema SHALL encerrar a verificação sem chamada HTTP à Vercel ou à OpenAI. [HOST-05]

**Independent Test**: validar cron/configuração; processar seis tarefas e observar cinco aquisições; simular limite de gravação; reiniciar instância e reler o estado. Configuração real só é verificada depois da implantação autorizada; o teste local usa o mesmo executor.

## Edge Cases

- CSV acima dos limites, IDs repetidos no arquivo, data fora do horizonte e cabeçalho inválido: rejeitar antes da confirmação, sem escrita parcial (DATA-02).
- Mesmo ID com conteúdo diferente em nova importação: conflito; não substituir silenciosamente (DATA-03/SAFE-02).
- Empresa sem movimentações: projeção constante no saldo inicial (CASH-01/02).
- Recebível vencido sem nova data: excluir da previsão e sinalizar incerteza (PRO-03/CASH-02).
- Conta já liquidada não pode voltar a pendente por interpretação da IA (CASH-06/SAFE-02).
- Atraso fora da janela: informar que não há entrada dentro da janela, sem deslocar o horizonte (CASH-03).
- Desativar lembretes impede novas notificações; tarefa permanece cancelada (TASK-01/03).
- Reserva não equivale a despesa; não entra de novo na projeção (RES-01/03).
- Microfone negado ou áudio inválido: texto permanece utilizável (VOICE-03).
- Tarefa repetida ou concorrente não cria notificações equivalentes (TASK-04).
- Alterar uma previsão não altera data original nem confirma pagamento (CASH-05/06).

## Implicit Requirements Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | DATA-02; limites registrados nas premissas |
| Failure / partial failure | Importação atômica; VOICE-03; TASK-06 |
| Idempotency / retry | DATA-03; RES-02; TASK-04 |
| Auth boundaries / rate limits | SAFE-01/03/05; mensagens 10/min/sessão, áudio 5/min/sessão e rejeição 429 como proposta técnica |
| Concurrency / ordering | SAFE-02; versão por mutação; ocorrência adquirida por um executor |
| Data lifecycle | Estado persistido na demo; reset apaga dados e tarefas apenas da demo; áudio descartado após processamento |
| Observability | Histórico de ações por origem user/task, horário, entidade, resultado e erro; sem áudio ou segredos nos logs |
| External dependency failure | VOICE-03/TASK-06; sem fallback que simule sucesso |
| State transitions | Pendência, reserva e tarefa têm transições definidas em contracts.md |

## Acceptance Fixtures

F1: início 2026-10-23, saldo inicial 100000; recebimento `rec-1` de 200000 previsto/vencido em 2026-10-25; pagamento `pay-1` de 150000 em 2026-10-27; ambos pendentes. Sem outras movimentações. Horizonte termina 2026-11-21. Atraso de `rec-1` para 2026-11-01 gera -50000 de 27/10 a 31/10, recuperação para 150000 em 01/11. Mínimo base 100000; mínimo atrasado -50000. Fonte CSV em `examples/caixa-demo.csv`.

F2 independente: saldo atual 100000; um fornecedor pendente de 50000 e nenhuma reserva. Reservar gera livre 50000, sem mudar saldo/projeção. Pagar gera saldo 50000 e reservado zero.

## Requirement Traceability

Tabela gerada ao lado das tarefas; IDs representam critérios verificáveis, não funcionalidades concluídas.

| Requirement ID | Story | Phase | Status | Tasks |
| --- | --- | --- | --- | --- |
| DATA-01 | P1: MVP | Tasks | In Progress | T1, T3, T8, T16, T21 |
| DATA-02 | P1: MVP | Tasks | In Progress | T3, T16 |
| DATA-03 | P1: MVP | Tasks | In Progress | T3, T16 |
| DATA-04 | P1: MVP | Tasks | In Progress | T2, T15 |
| CASH-01 | P1: MVP | Tasks | In Progress | T1, T4, T8, T15 |
| CASH-02 | P1: MVP | Tasks | In Progress | T4, T15 |
| CASH-03 | P1: MVP | Tasks | In Progress | T6, T8, T17, T21, T22 |
| CASH-04 | P1: MVP | Tasks | In Progress | T6, T17 |
| CASH-05 | P1: MVP | Tasks | In Progress | T5, T17 |
| CASH-06 | P1: MVP | Tasks | Verified | T5 |
| AGENT-01 | P1: MVP | Tasks | Pending | T1, T9, T10, T18 |
| AGENT-02 | P1: MVP | Tasks | Pending | T9, T10, T18 |
| VOICE-01 | P1: MVP | Tasks | Pending | T19, T21 |
| VOICE-02 | P1: MVP | Tasks | Pending | T19 |
| VOICE-03 | P1: MVP | Tasks | Pending | T10, T19 |
| PRO-01 | P1: MVP | Tasks | Pending | T10, T11 |
| PRO-02 | P1: MVP | Tasks | Pending | T11 |
| PRO-03 | P1: MVP | Tasks | Pending | T11, T14, T18 |
| PRO-04 | P1: MVP | Tasks | Pending | T11, T20 |
| RES-01 | P1: MVP | Tasks | In Progress | T7, T8, T18 |
| RES-02 | P1: MVP | Tasks | Verified | T7 |
| RES-03 | P1: MVP | Tasks | In Progress | T7, T21 |
| RES-04 | P1: MVP | Tasks | Verified | T7 |
| TASK-01 | P1: MVP | Tasks | Pending | T1, T12 |
| TASK-02 | P1: MVP | Tasks | Pending | T13, T14, T22 |
| TASK-03 | P1: MVP | Tasks | Pending | T13, T20, T21 |
| TASK-04 | P1: MVP | Tasks | Pending | T13, T20, T22 |
| TASK-05 | P1: MVP | Tasks | Pending | T12, T14, T20 |
| TASK-06 | P1: MVP | Tasks | Pending | T12, T13 |
| SAFE-01 | P1: MVP | Tasks | In Progress | T8, T14, T19 |
| SAFE-02 | P1: MVP | Tasks | Verified | T2, T5 |
| SAFE-03 | P1: MVP | Tasks | Pending | T14, T22 |
| SAFE-04 | P1: MVP | Tasks | In Progress | T4, T9, T10 |
| SAFE-05 | P1: MVP | Tasks | In Progress | T2, T8, T14 |
| SAFE-06 | P1: MVP | Tasks | Pending | T9 |
| STOCK-01 | P2: Reposição | Tasks | Pending | Deferred P2 |
| STOCK-02 | P2: Reposição | Tasks | Pending | Deferred P2 |
| HOST-01 | P1: Infra gratuita | Tasks | Pending | T1, T22 |
| HOST-02 | P1: Infra gratuita | Tasks | Pending | T13, T22 |
| HOST-03 | P1: Infra gratuita | Tasks | Pending | T19 |
| HOST-04 | P1: Infra gratuita | Tasks | In Progress | T2, T12, T13 |
| TASK-07 | P1: Agendamento | Tasks | Pending | T1, T12 |
| TASK-08 | P1: Agendamento | Tasks | Pending | T12 |
| HOST-05 | P1: Infra gratuita | Tasks | Pending | T13, T22 |

Coverage: 44 critérios; 42 P1 mapeados; 2 P2 adiados; zero P1 sem tarefa.

## Success Criteria

- [ ] Valores F1/F2 batem exatamente com os testes.
- [ ] Demonstração executa os dois fluxos sem depender de uma pergunta para disparar tarefa.
- [ ] Todos os critérios P1 mapeados têm evidência de teste; nenhuma tarefa termina com gate vermelho.
- [ ] Demonstração explicita saldo calculado, rascunho, reserva virtual e hipótese.
- [ ] Verificador independente valida o produto depois da implementação, incluindo discriminação dos testes.
