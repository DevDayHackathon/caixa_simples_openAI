# Implantação alvo — Vercel Hobby + Supabase Free

Decisão de ambiente solicitada em 23/10/2026. Este documento orienta o desenvolvimento. Nenhuma conta, projeto remoto, migração ou publicação foi executada por esta alteração.

## Arquitetura definida para os planos gratuitos

- Uma aplicação Next.js/TypeScript na Vercel Hobby, com endpoints Node.js.
- Um projeto Supabase Free para a demo, com Postgres, migrações, unicidade, aquisição atômica e rate limit persistido. Não abrir três projetos para os três integrantes: os testes de escrita usam banco local isolado.
- Um único job Supabase Cron (`*/5 * * * *`) executa uma função SQL leve no próprio banco. Essa função só usa pg_net para fazer POST em `/api/tasks/run` quando há tarefas vencidas e elegíveis. Sem tarefas elegíveis: zero HTTP à Vercel e zero chamadas OpenAI. O horário individual é escolhido pelo agente ou informado pelo usuário; não existe cron por lembrete.
- URL de produção estável e segredo de executor em Supabase Vault. O servidor Vercel valida o segredo antes de executar. Não usar a chave pública do Supabase como segredo do executor.
- Não configurar um cron frequente em vercel.json: Hobby não permite frequência maior que diária. Não manter worker residente, processo infinito ou setInterval como agendador.
- Cliente acessa endpoints tipados; servidor usa API HTTPS do Supabase e funções SQL transacionais para operações atômicas. Não manter conexões Postgres diretas por usuário nem depender de memória de uma instância.

## Comportamento dos lembretes

O agente calcula due_at antes de persistir a tarefa e registra motivo, antecedência, origem da decisão e condição de encerramento. Horário solicitado pelo usuário tem prioridade; uma informação temporal ambígua exige esclarecimento.

A função SQL do cron verifica pending, due_at <= now e eligible_at <= now (quando houver), além de execução em andamento/lease válida. Tarefas futuras, canceladas, concluídas e ocorrências ainda adquiridas não justificam HTTP. Ocorrências com lease expirada e retry elegível voltam a ser candidatas. Um bloqueio de despacho com validade evita dois disparos concorrentes equivalentes; a expiração permite recuperação após falha de rede, sem apagar as tarefas. Essa verificação não chama a IA nem decide o conteúdo do aviso.

Se há trabalho, o banco chama o executor. A aquisição atômica das ocorrências acontece no executor, que relê as condições e adquire no máximo cinco por chamada. O gate SQL é uma otimização; a aquisição e a deduplicação no servidor continuam sendo a garantia de integridade. O executor tem orçamento interno de 30 s e a função tem maxDuration de 60 s. Lease continua em 120 s. O restante fica persistido para o próximo disparo; não inicia processamento sem aquisição e não agenda trabalho para depois da resposta HTTP.

No volume normal de até cinco ocorrências por intervalo, processamento começa no próximo disparo após due_at. A interface diz “verificação a cada cinco minutos”, sem prometer entrega em um segundo exato. Falha do provedor ou fila excedente pode atrasar a entrega. O limite de trinta segundos é de processamento por lote, não SLA de entrega.

Retry em 60, 300 ou 900 s significa tornar a ocorrência elegível após esse intervalo; o processamento acontece no próximo tick do cron. Não criar um segundo cron para retries. Se compromisso já estiver resolvido, não há lembrete. Cada ocorrência gera no máximo uma notificação.

O caminho automático usa regras e modelos de mensagem preenchidos com dados reais; não chama OpenAI em cada tick, nem chama Vercel em um loop. O agente cria as tarefas e define contexto/condição. O executor verifica os dados, prepara iniciativas e notifica sem precisar de novo input. Um rascunho pode ser refinado pela IA quando o usuário interagir.

Notificação é persistida no Postgres e aparece ao abrir/atualizar a aplicação. Sem push, SMS, e-mail, WhatsApp, WebSocket próprio ou nova infraestrutura. Banco pausado ou quota esgotada impede execução: conferir a saúde antes da apresentação. Não prometer serviço contínuo no plano Free.

## Limites do aplicativo, menores que os da infraestrutura

| Recurso | Regra de desenvolvimento |
| --- | --- |
| CSV | Até 1 MiB e 1.000 linhas, validado antes de confirmar |
| Gravação | Até 60 s e 3 MiB, interrompendo no primeiro limite; formato aceito validado no endpoint |
| Upload | Multipart binário, sem base64; não exceder limite total de 4.5 MB do provedor |
| Síntese | No máximo 1.200 caracteres por reprodução e saída até 3 MiB; resposta completa continua em texto |
| Estado | Somente banco persistido para finanças, dedup, rate limit, tarefas e notificações; filesystem/memória não são fonte de verdade |
| Logs | No máximo os últimos 30 dias de histórico da aplicação; limpeza diária verificada pelo job existente, sem segundo cron nem exclusão de compromissos/tarefas ativas |
| Consulta de notificações | Paginação de 20 por página; atualizar ao abrir/focar e após ação; sem polling permanente |
| Testes | Banco local isolado e adapters OpenAI simulados; não executar E2E destrutivo no banco remoto da demo |

Não armazenar áudio nem CSV bruto permanentemente. A transcrição e o histórico ficam limitados ao contexto da demo. Recusar formatos grandes ou texto de síntese acima do limite com resposta recuperável; não esconder erro como operação concluída.

## Variáveis e ambientes

T1 prepara `.env.example` sem valores reais: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_TTS_MODEL`, `SESSION_SECRET`, `TASK_RUNNER_SECRET` e `APP_ORIGIN`. Nenhuma chave secreta usa prefixo NEXT_PUBLIC. Escolher a chave privilegiada apropriada ao projeto na configuração; nunca compartilhá-la com o navegador.

Produção usa a URL estável e o banco demo. Preview/local usa mocks ou banco de teste isolado, sem segredo de produção e sem cron. Não autorizar tarefas de preview a operar no banco da apresentação. Evitar vazamento de cookie/segredo em logs e impedir chamada cruzada de origem.

## Trabalho em equipe e publicação

Desenvolvimento segue nas três branches, com Jecky na experiência/voz, Daniel nos dados e Bruno no agente/tarefas. Um integrante será responsável pela conta Hobby e publicação da main; pessoa ainda não designada. Não pressupor três assentos de colaboração ou deploy automático de todo commit no Hobby.

Antes de conectar Git, verificar proprietário, visibilidade e restrições de autoria nas regras atuais da Vercel. Preferir repositório pessoal compatível e publicação pelo responsável; não presumir suporte a repositório de organização no Hobby. Preservar autores reais dos commits, sem trocar identidade para contornar restrições.

Guia para executar quando a implantação for autorizada: criar Supabase Free; aplicar migrações e seed fictício; configurar variáveis; publicar main na Vercel Hobby; testar endpoints; configurar Vault e ativar apenas o job de produção; fechar cliente; aguardar execução e verificar notificação única; repetir processamento para provar deduplicação. Exportar seed e migrações para recuperação. Verificar limites e disponibilidade no painel antes da demo.

## Custos e disponibilidade

Free é o alvo da infraestrutura dentro das quotas, não promessa de uso ilimitado. API OpenAI é contabilizada separadamente; usar créditos do evento quando disponíveis e limitar chamadas. Não adicionar Redis, fila paga, banco de preview por branch, Vercel Pro ou serviços de envio.

O Supabase informa 500 MB de banco, 1 GB de arquivos, 5 GB de egress e até dois projetos ativos no Free, com possibilidade de pausa após uma semana de inatividade. Não assumir backup gerenciado de plano pago. Vercel Hobby é destinado a uso pessoal/não comercial; esta configuração cobre o protótipo do hackathon, não estabelece elegibilidade de uma operação comercial posterior.

## Fontes oficiais verificadas em 23/10/2026

- [Vercel Cron: limites Hobby](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- [Vercel Functions: payload e duração](https://vercel.com/docs/functions/limitations). Com Fluid Compute, Hobby permite até 300 s; escolhemos 60 s por chamada para este aplicativo.
- [Vercel Hobby: quotas e uso](https://vercel.com/docs/plans/hobby).
- [Vercel: colaboração e Git](https://vercel.com/docs/git) e [repositórios de organizações](https://vercel.com/docs/limits).
- [Supabase Free](https://supabase.com/pricing).
- [Supabase Cron](https://supabase.com/docs/guides/cron) e [pg_cron/pg_net e Vault](https://supabase.com/docs/guides/functions/schedule-functions).

## Exemplos de horário e verificação

Fornecedor vence em 30/10/2026 às 15h de São Paulo. O agente escolhe antecedência de 24h: due_at = 29/10 às 15h local, persistido como 18h UTC; scheduling_reason explica o motivo. Se o usuário pede 29/10 às 10h, esse horário substitui a sugestão: 13h UTC e schedule_source=user. Não confundir data do pagamento com horário do lembrete. O agente registra os campos validados, não interpreta datas dentro do cron.

Testes obrigatórios: zero pendências → zero HTTP/IA; somente tarefas futuras → zero HTTP; uma tarefa vencida → um despacho; execução concorrente → sem efeitos duplicados; horário do usuário prevalece; lease expirada e retry elegível permitem retomar. Pagamento realizado entre despacho e execução é rechecado e não gera cobrança.
