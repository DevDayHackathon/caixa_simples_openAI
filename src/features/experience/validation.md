# Validação independente — experiência de Jecky

Data: 2026-10-23. Verifier independente da implementação. **Veredicto: PASS no escopo local UI/mocks v1**, após correção de stale. Não atesta produto integrado.

Escopo: diff `eaa8068..dddc0fe`, mais correções locais reavaliadas em Conversation e teste T15. Fontes: spec, context, design, contracts e tasks de `.specs/features/caixa-proativo`, `docs/base-comum.md` e README local. T15–T20 avaliadas pelas responsabilidades locais descritas nas tarefas. T21/T22 e requisitos compartilhados permanecem pendentes; nenhum requisito global recebe Verified.

## Cobertura ancorada na especificação

As evidências abaixo verificam apresentação e chamadas dos contratos; não provam cálculo, persistência ou execução do agente real.

| Critério / tarefa | Resultado esperado e evidência independente | Resultado local |
| --- | --- | --- |
| CASH-01, T15 | Saldo F1 R$1.000 e realizados zero: `src/features/experience/cash-panel.test.tsx:10` contém 1.000,00; `src/features/experience/cash-panel.test.tsx:30` e `:31` comparam cada indicador exatamente a `R$\u00a00,00`. | PASS |
| CASH-02, T15 | Fechamentos recebidos 25/10 R$3.000 e 27/10 R$1.500: `src/features/experience/cash-panel.test.tsx:14`, `toContain('3.000,00')` e `toContain('1.500,00')`. Cálculo pertence ao domínio. | PASS UI |
| DATA-04, T15 | Origem, atualização e saldo calculado: `src/features/experience/cash-panel.test.tsx:22` compara fonte/updated_at; implementação `src/features/experience/cash-panel.tsx:11` explicita ausência de conexão bancária. Incertos/negativos em teste `:23`; vazio/erro `:25`/`:26` não contêm R$. | PASS |
| DATA-01/03, T16 | Confirmação usa preview_id e mesma idempotency_key no retry: `src/features/experience/import-panel.test.tsx:12`, `expect(input).toEqual(...)`; payload de saldo 100000/data/CSV em `:13`. | PASS contrato |
| DATA-02, T16 | Erro linha 2/campo amount bloqueia confirmação, correção invalida prévia: `src/features/experience/import-panel.test.tsx:14`, botão disabled e confirmação ausente. Arquivo 1048577 bytes não chama porta em `:15`; saldo alterado invalida em `:16`; falha sem sucesso em `:17`. | PASS UI |
| CASH-03, T17 | Hipótese recebida mínimo -R$500, intervalo 27–31/10 e recuperação R$1.500: `src/features/experience/scenario-panel.test.tsx:11`, expressões específicas para mínimo/intervalo/dia. | PASS UI |
| CASH-04/05, T17 | Simular envia override/base_version e não update; alteração envia somente expected_date/expected_version: `src/features/experience/scenario-panel.test.tsx:12` e `:13`, payloads exatos e `not.toHaveBeenCalled()`. Falha, invalidação por data e vazio em `:14`–`:16`. | PASS contrato |
| AGENT-01/02, T18 | Origem user, mensagem/request_id e resposta; esclarecimento sem sucesso presumido: `src/features/experience/conversation.test.tsx:12`/`:13`, payload exato e ausência de Proposta aceita. Ferramentas reais fora do escopo. | PASS UI |
| RES-01, PRO-03, T18 | Aceite referencia ID/alvo/versão sem confirmação local; ajuste/dispensa textuais e cobrança rascunho: `src/features/experience/conversation.test.tsx:14`, `:15`, `:17`. Valores e persistência reais não verificados. | PASS UI |
| Stale, T18 | Propostas stale e versão divergente sem Aceitar: `src/features/experience/conversation.test.tsx:16`/`:19`; rerender versão 1→2 invalida proposta aberta em `:20`. Guard de decisão e apresentação usam currentVersion em `src/features/experience/conversation.tsx:12`/`:14`. | PASS após fix |
| VOICE-01, T19 | HTTP multipart retorna texto editável; transcrição não envia turno e edição envia texto final exato: `src/features/experience/audio-handlers.test.ts:8`, status200/data.text/no-store; `src/features/experience/voice.test.tsx:12`, `turn` não chamado antes de confirmação e payload editado exato. | PASS composição injetada |
| VOICE-02, T19 | Reprodução somente por ação; síntese binária: `src/features/experience/voice.test.tsx:10` não chama fetch antes de clique; `src/features/experience/audio-handlers.test.ts:10` status200/audio-mpeg/bytes[1,2,3]. Texto>1200 rejeitado em `:11` e UI `voice.test.tsx:11`. | PASS |
| VOICE-03, T19 | Microfone negado mantém texto: `src/features/experience/voice.test.tsx:9`; falha síntese em `:10`; agente falho preserva editor e reabilita envio em `src/features/experience/conversation.test.tsx:18`. | PASS |
| HOST-03, T19 | Captura para em60s e libera track; chunk>3MiB descartado sem upload; cancelamento: `src/features/experience/recording.test.ts:5`–`:7`. Entrada inválida422 sem provedor e saída>3MiB503: `src/features/experience/audio-handlers.test.ts:9`/`:12`. | PASS |
| SAFE-01 e limites T19 | Falha externa503 sem segredo bruto `src/features/experience/audio-handlers.test.ts:13`; auth401 e quota429 sem provedor `:14`/`:15`; rotas não compostas503 `:16`; formato/JSON inválidos `:17`. | PASS composição local |
| TASK-03/04/05, T20 | Dedup occurrence_key, ação sem remover alerta presumidamente, adiamento10hSP→13hUTC: `src/features/experience/inbox.test.tsx:9`, `:14`, `:13`, respectivamente length1/payload exato/alerta preservado. | PASS UI |
| PRO-04, T20 | Três prioridades preservam ordem recebida: `src/features/experience/inbox.test.tsx:10`, length3 e títulos exatos. Ordenação financeira é responsabilidade do agente. | PASS UI |
| Atualização/histórico/erro, T20 | Montar/focar/refresh sem timer: `src/features/experience/inbox.test.tsx:11`, contagem3 após300000ms; leitura confirmada `:12`; erro não vira vazio `:15`; paginação20+2 `:16`. | PASS |

Todos os testes da superfície correspondem a AC, borda ou Done-when local acima. Não houve remoção nem enfraquecimento de testes. Contagem original T1:15 unitários; entrega inicial:73; correções:75. A asserção antiga pouco precisa sobre zeros foi mantida e complementada com comparações por indicador.

## Sensor de discriminação

Scratch em `/tmp/jecky-verifier`, cópia isolada sem `.git`/`.next`, dependências por symlink. Nenhum código/teste real foi mutado; nenhum stash. Baseline real antes e depois idêntico: somente a deleção preexistente `fluxo_agente_proativo.png`. Execução vitest dos três arquivos afetados: **3 falhas específicas,24 passes;3/3 mutantes mortos**.

| Mutação semântica na cópia | Teste que matou | Evidência |
| --- | --- | --- |
| Captura permite até2×limite em vez de3MiB | `src/features/experience/recording.test.ts:6` | Esperava inactive, recebeu recording. |
| Síntese aceita12000 em vez de1200 caracteres | `src/features/experience/audio-handlers.test.ts:11` | Esperava422, recebeu503, detectando passagem indevida ao provedor. |
| Removida comparação de versão na exibição da proposta | `src/features/experience/conversation.test.tsx:19` | Esperava Aceitar ausente, recebeu botão. |

## Gate e revalidação

Verifier executou `npm run test:unit`:73/73 antes dos fixes; execução final:75/75. Gate de fechamento exigido em tasks.md é `npm run check`. Implementador reportou lint/tipos/build e74 unitários+6 integração+3 E2E verdes após fix stale, e75/75 unitários após adicionar asserção T15. Não se apresenta esse gate completo como execução independente do Verifier. Nenhum skip reportado. A alteração posterior ao gate completo é exclusivamente a adição da asserção T15.

## Gap encontrado e corrigido

P1: Conversation inicializava versão pela prop e não acompanhava mudanças financeiras externas; proposta antiga podia continuar aplicável. Implementador corrigiu com `Math.max(snapshotVersion,version)`, usado na exibição e em decide. Teste de rerender `src/features/experience/conversation.test.tsx:20` confirma bloqueio. Releitura independente confirmou ambos os guards e suíte final verde. Nenhum gap bloqueador restante identificado no recorte UI/mocks.

Código permanece restrito aos componentes, composição e áudio pedidos; sem cálculo financeiro duplicado, endpoint de decisão inventado ou confirmação otimista de mutação. Erros mantêm caminho textual e não simulam sucesso.

## Pendências de integração e limites da conclusão

- Rotas reais de áudio503 até T21 conectar sessão assinada e quota persistida compartilhada; não houve chamada real OpenAI nem validação de credenciais em produção.
- Duração server-side é declarada pelo capturador; não prova duração forense de arquivo arbitrário. Limitação explícita no README, preservada na revisão.
- Cálculos, importação atômica/idempotente persistida, conflitos no servidor, decisões/ferramentas do agente, ordenação financeira e execução/reagendamento de tarefas não são comprovados por mocks.
- UAT humano e integração T21/T22 permanecem pendentes. A revisão não marca requisitos compartilhados Verified.
- Relatório escrito somente neste bloco por instrução de escopo; scripts que exigem relatório/estado global em `.specs` não foram usados para alterar outros blocos. A lição local desta revisão: propostas abertas devem considerar a versão financeira mais recente, inclusive quando ela vem de atualização externa à conversa.

## Atualização de fechamento pelo implementador

Após a revalidação independente, `npm run check` foi reexecutado no estado final com **75 unitários, 6 de integração e 3 E2E**, além de lint, tipos e build verdes. `validate_tasks.py caixa-proativo --strict`: zero erros/avisos. Esta nota registra o gate final do implementador; o veredicto e o sensor acima são do Verifier independente.
