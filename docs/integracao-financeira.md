# Caixa persistido e integração restante

Revisão de 23/10/2026: o PR #3 do Bruno ainda tem bloqueios de migração e contratos; merge e integração final não aprovados. A configuração completa de chaves, evidências e matriz de aceite com APIs ativas estão em [revisao-bruno-e-uat.md](revisao-bruno-e-uat.md). Os limites e handoffs abaixo continuam válidos até a correção e composição T21/T22.

A prévia `/` continua disponível sem credenciais. O link **Abrir caixa persistido** leva a `/caixa`, que usa somente dados fictícios salvos no banco. Banco ou sessão indisponível produz erro recuperável; a tela não substitui dados por fixtures.

## Configuração local

Use Node 24 e `npm ci`. Configure `.env.local` exclusivamente no servidor:

```dotenv
APP_ORIGIN=http://localhost:3000
SESSION_SECRET=<segredo aleatório com pelo menos 32 caracteres>
SUPABASE_URL=<URL do Supabase local ou ambiente demo autorizado>
SUPABASE_SERVICE_ROLE_KEY=<chave privilegiada somente no servidor>
```

A migração financeira `supabase/migrations/001_finance.sql` precisa estar aplicada no banco do ambiente. Não foi aplicado SQL em banco remoto nesta entrega. A URL usada no navegador deve corresponder exatamente a APP_ORIGIN, inclusive porta e protocolo. Inicie com `npm run dev` e abra `/caixa`. Nunca use dados pessoais/reais: o escopo é a empresa fictícia compartilhada `demo`, sem contas privadas por usuário.

Em Vercel Preview permanece a proteção existente que permite somente banco loopback. Preparar ambiente de apresentação e revisar essa política é trabalho de implantação separado; não remover a proteção para fazer um preview funcionar.

## Jornada disponível

1. Abrir `/caixa` emite cookie HttpOnly da sessão demo e consulta `/api/finance/workspace`.
2. Importar CSV, conferir erros e confirmar salva um lote atômico; o painel recarrega a revisão completa.
3. Simular um atraso usa o serviço financeiro. Alterar previsão é uma ação separada e persistida. Atualizações desmontam a hipótese anterior.
4. Em **Gerenciar compromissos**, criar entrada/saída, selecionar pendência, reservar virtualmente ou liquidar. O checkbox confirma a ação escolhida; editar campos remove essa confirmação.
5. Recarregar a página conserva os dados. Falhas não geram sucesso presumido nem repetição automática. No caso de resposta perdida, tentar a mesma ação preserva sua chave de idempotência enquanto o formulário permanece montado; atualizar a tela primeiro permite verificar o estado persistido.

O horizonte financeiro continua fixo em 30 dias. A data de referência é exibida; quando hoje está fora da janela, a leitura usa o limite mais próximo. Simulação/reserva seguem a regra existente da data atual: se o horizonte expirou, é necessário preparar outro ambiente demo com datas válidas, sem deslocar silenciosamente registros existentes.

## Consistência e contrato

`GET /api/finance/workspace` é um endpoint adicional da experiência, sem mudanças em FinancePort v1. Requer sessão demo válida e retorna `{data: {business, transactions, snapshot}, request_id}` a partir de uma única leitura versionada. Aceita `as_of` opcional, rejeita campos desconhecidos/repetidos e datas fora da janela. Respostas no-store; 401 sessão, 422 consulta e 503 dependência indisponível. Mutadores existentes mantêm Origin, validação, CAS e idempotência.

A composição injeta FinancePort no dashboard. Após uma mutação, snapshot, compromissos e configuração são relidos juntos. O painel desmonta durante a recarga e reinicia na nova versão, eliminando cenários e propostas da revisão anterior. Nenhuma escrita é repetida automaticamente ao renovar a sessão.

## Handoff para Bruno: agente, iniciativas e voz

A área persistida não mostra conversa simulada nem botões de voz. O rodapé informa a dependência pendente. A prévia mantém os exemplos identificados. Contratos, migrações e módulos do agente/tarefas não foram alterados.

Quando T14 estiver disponível:

- Injetar `createAgentClient` na composição e ligar conversa e feed ao estado financeiro. Decisões por mensagem devem validar ID, alvo, versão e confirmação no agente; uma resposta textual sozinha não comprova mutação.
- Relacionar `finance_resolutions` ao encerramento de tarefas na mesma transação pela migração do Bruno.
- Reconsultar o financeiro depois de turnos que possam modificar dados; invalidar propostas baseadas em versões antigas.

Para áudio, os pontos de composição já existem: `createOpenAIAudioProvider()` e `createAudioHandlers(services)`. Antes de substituir os handlers atualmente desabilitados:

1. `authorize` precisa reutilizar a sessão assinada e conferir Origin contra APP_ORIGIN. Sem sessão/origem válida, não chamar provedor.
2. `allow` precisa adquirir quota **persistida e compartilhada** para a sessão segundo a política acordada com Bruno. Não usar Map/contador em memória, nem chamar provedor antes de adquirir quota.
3. Injetar `transcribe`/`speak` do adaptador OpenAI, com OPENAI_API_KEY e modelos explícitos somente no servidor. Testar 401, origem inválida, 429, limites, falhas sanitizadas e fallback textual antes de habilitar.
4. Manter a transcrição editável, sem envio automático ao agente. Reproduzir áudio apenas por ação explícita.

Nenhuma chamada paga ou modelo default foi habilitado. T21 integral e T22 continuam pendentes: agente real, decisões, lembretes, cron condicional e ensaio completo com processamento sem aba.

## Evidências

`docs/testes-locais.md` explica o Postgres isolado. Os testes HTTP novos cobrem consistência e erros; `tests/e2e/finance.spec.ts` cobre a jornada no navegador com SQL real, recarga, ausência de mocks em falhas, conflito de versão e viewport 360 px. O E2E usa ponte HTTP local para as RPCs, sem substituir a persistência por memória; provisionamento Supabase remoto continua fora desta evidência.

`.github/workflows/check.yml` prepara Postgres 17, Node 24 e Chromium e executa `npm run check`. O workflow foi preparado localmente; a execução no GitHub depende de publicação posterior dos commits.
