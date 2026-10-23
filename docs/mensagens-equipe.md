# Mensagens prontas para a equipe

Estado real: documentação pronta, aplicação não iniciada, T1 pendente e nenhuma das três branches criada. Estes textos são para copiar e enviar; nenhuma mensagem foi enviada automaticamente. Jecky, Daniel e Bruno são os três responsáveis propostos. Não presumimos qual deles é o usuário desta conversa.

## Antes de enviar o sinal de início

Não é necessário desenvolver o produto antes dos colegas. É necessário concluir a base T1, uma única vez. Proposta: Daniel prepara a base na main, com revisão de Jecky e Bruno. Qualquer integrante pode assumir T1, desde que os demais não recriem o scaffold em suas branches.

Checklist concreto de T1:

1. Aplicação Next.js/TypeScript com Tailwind, validação, lockfile e configuração compatível com Vercel Hobby. Página mínima abre, sem desenvolver ainda as telas finais.
2. Schemas/tipos v1 em `src/contracts/`, interfaces FinancePort/AgentTurn, envelopes de resposta/erro, datas/centavos e campos completos de ScheduledTask. Os tipos expõem o mesmo contrato para os três.
3. Fixtures F1/F2 e mocks de financeiro, agente e notificações, consumíveis sem chave de API. Mock é identificado como tal. Não implementar lógica financeira de produção em T1.
4. Clientes/adaptadores tipados para que frontend e agente possam começar sobre os mocks e trocar a implementação depois.
5. `.env.example` sem segredos e instruções de banco local de teste; scripts npm dev, build, typecheck, lint, test:unit, test:integration e test:e2e materializados. As tarefas futuras não podem adivinhar comandos.
6. Testes mínimos reais: schema/fixture inválida rejeitada, integração cliente–mock compatível e E2E da página mínima. Esses três casos cobrem as camadas necessárias, sem declarar funcionalidades futuras concluídas. Gates de T1 e build verdes; instruções para outro clone reproduzir.
7. Commit local de T1 com tarefa e rastreabilidade atualizadas. Anunciar “BASE COMUM PRONTA” com o hash e comandos/resultados. Depois compartilhar o repositório atualizado por canal escolhido pelo time; não declarar push feito sem realizá-lo/autorização.

Só então criar as três branches do mesmo commit-base e informar esse hash aos colegas. Cada integrante precisa de seu próprio clone/worktree. Quem já leu as specs pode preparar seu raciocínio antes, mas não deve iniciar scaffold divergente. A criação das branches e o compartilhamento remoto ainda não aconteceram.

## Mensagem para Daniel — base comum, depois caixa e dados

```text
Daniel, você ficará responsável pela base comum inicial e pela área financeira do nosso agente de caixa.

Na raiz do clone, leia README.md, .specs/STATE.md, os documentos de .specs/features/caixa-proativo/ e docs/deploy-gratuito.md. Ative as skills tlc-spec-driven e karpathy-guidelines; se a primeira não estiver disponível, avise antes de implementar. Considere somente as tarefas atribuídas a você. A execução paralela humana está autorizada; não dispare outros agentes de implementação por conta própria.

Primeiro faça apenas T1 na main: configuração Next.js/TypeScript, contratos/schemas compartilhados, fixtures F1/F2, mocks/adaptadores, .env.example sem chaves, lockfile e scripts/testes. Use o checklist em docs/mensagens-equipe.md. Não desenvolva as funcionalidades financeiras completas nessa base. Ao terminar, informe BASE COMUM PRONTA, hash e resultados dos gates. Espere as branches serem criadas a partir desse commit antes de continuar.

Depois trabalhe em feat/daniel-caixa-dados, tarefas T2–T8, respeitando suas dependências. Área: src/features/finance/, src/app/api/finance/ e migração 001_finance.sql. Entregue CSV atômico/idempotente, contas, cálculo em centavos, projeção de 30 dias, alterações versionadas, cenários isolados e reservas virtuais.

F1 com atraso precisa resultar em -R$500 de 27 a 31/10, voltando a R$1.500 em 01/11. Reserva não reduz o saldo/projeção uma segunda vez. Use Postgres/Supabase Free, sem integração bancária, sem cálculo financeiro pela IA e sem depender da memória da função Vercel. Testes de escrita usam banco local isolado.

Depois de T1, não altere áreas dos colegas, contratos ou dependências compartilhadas sem combinar. Cada tarefa inclui testes, evidência, atualização de status e um commit atômico com gate verde. Não marque o requisito inteiro Verified se outras tarefas relacionadas faltarem. Não faça push, deploy ou migração remota sem autorização. Ao entregar, informe commits, testes e contratos disponíveis para integração.
```

## Mensagem para Jecky — experiência e voz

```text
Jecky, sua área será experiência do usuário e voz, na branch feat/jecky-experiencia-voz.

Antes de codar, confirme que T1 está concluída, que a branch foi criada do commit-base informado e que seu clone tem os contratos, mocks e comandos de teste. Se isso faltar, avise; não recrie o scaffold. Leia README.md, .specs/STATE.md, os documentos de .specs/features/caixa-proativo/ e docs/deploy-gratuito.md. Ative tlc-spec-driven e karpathy-guidelines; se a primeira não estiver disponível, avise. Trabalhe somente nas suas tarefas T15–T20, em ordem de dependências.

Sua área: src/features/experience/, src/app/page.tsx e src/app/api/audio/. Entregue painel com saldo/entradas/saídas/previsão, importação com prévia, comparação de atraso, conversa, aceite/ajuste/dispensa de propostas, transcrição editável, reprodução da resposta e feed de iniciativas. Distinga mensagens do usuário de avisos de tarefas programadas.

Comece com os mocks v1. Consuma os valores financeiros recebidos: não implemente uma segunda fórmula de saldo no navegador. Mantenha texto utilizável se o microfone ou a IA falhar. Áudio até 60 s/3 MiB; síntese até 1.200 caracteres/3 MiB, sem chaves no cliente. Notificações atualizam ao abrir/focar ou após ações, sem polling permanente.

Reservas são virtuais, cobranças são rascunhos e simular não altera a base. Use Vercel Hobby/Supabase Free, sem serviços pagos adicionais. Não altere contratos, lockfile ou áreas de Daniel/Bruno sem combinar. Inclua testes na mesma tarefa, execute o gate, atualize somente os seus blocos e faça um commit por tarefa. Não marque requisito compartilhado como totalmente verificado sozinho. Não faça push ou deploy sem autorização. Ao terminar, informe commits, testes, como rodar e o que ainda usa mocks.
```

## Mensagem para Bruno — agente proativo e tarefas

```text
Bruno, sua área será o agente proativo e as tarefas programadas, na branch feat/bruno-agente-proativo.

Antes de codar, confirme T1 concluída, branch criada do commit-base informado e contratos/mocks disponíveis no seu clone. Se faltar a base, avise; não recrie o scaffold. Leia README.md, .specs/STATE.md, os documentos de .specs/features/caixa-proativo/ e docs/deploy-gratuito.md. Ative tlc-spec-driven e karpathy-guidelines; se a primeira não estiver disponível, avise. Execute somente T9–T14, respeitando dependências. T22 será integração posterior com o time.

Sua área: src/features/agent/, src/features/tasks/, src/app/api/agent/, src/app/api/tasks/ e migração 002_tasks.sql. Use FinancePort, inicialmente com mocks. Não duplique os cálculos de Daniel.

Implemente dois fluxos separados: input do usuário e tarefa criada pelo próprio agente. O agente atende pedidos, esclarece ambiguidades, avalia consequências, sugere reservas, prepara cobranças e cria acompanhamentos. Ao criar a tarefa, decide previamente due_at, antecedência, motivo e condição de encerramento; horário explícito do usuário prevalece. Persista o contexto para retomar depois.

Não use Cron Vercel. Um único Cron Supabase verifica o banco a cada cinco minutos. Sem tarefa vencida elegível: zero HTTP Vercel e zero OpenAI. Com trabalho: despacho protegido para o executor Vercel, aquisição atômica, até cinco ocorrências e rechecagem do compromisso antes de notificar. Respeite lease, retry, limite de 30 s por lote e função de 60 s. Avisos simples usam regras/rascunhos prontos, sem chamar IA a cada tick.

Teste fila vazia, tarefa futura, horário escolhido/alterado, tarefa já resolvida, concorrência, retry e duplicação. Não envie cobranças externas nem faça transferências. Não altere contratos, lockfile ou áreas dos colegas sem combinar. Cada tarefa inclui testes, gate verde, status e commit atômico. Não marque requisito compartilhado como Verified antes das demais entregas. Não faça push, deploy, migração remota nem ative cron sem autorização. Entregue commits, resultados e instruções de integração.
```

## Como liberar e integrar

Responsável pela base envia o hash de T1 e informa qual repositório/commit está disponível aos três. Criador das branches informa os nomes exatos. As mensagens acima pressupõem essas condições, não significam que já existem branches. Depois do trabalho paralelo, T21 integra adaptadores reais e T22 verifica cron/deploy de forma autorizada. O Verifier independente exigido pela skill acontece no fechamento do produto, não na criação desta documentação.
