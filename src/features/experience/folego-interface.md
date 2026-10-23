# Atualização visual Fôlego

Referência: `/home/mestre/Downloads/folego-prototipo.html`, solicitada pelo usuário. Escopo: experiência, página e seus testes. Preservar contratos, lockfile, dados e áreas de Daniel/Bruno.

Critérios:
1. A página deve adotar marca, cores, hierarquia, cartões, gráfico, resumo de risco e lista de movimentações da referência, com layout utilizável em 360 px.
2. Todos os valores devem vir de CashSnapshot/Transaction recebidos. O SVG apenas transforma os saldos recebidos em coordenadas; não recalcula projeção. Reserva virtual e livre mantêm o significado do contrato.
3. Importar, simular e conversar devem abrir painéis acessíveis, com fechamento por botão/Escape e retorno de foco, preservando rascunhos e histórico ao reabrir. Preservar prévia, decisões, transcrição editável e fallback textual existentes.
4. Uma hipótese F1 deve atualizar gráfico e alerta com mínimo -50000 e intervalo 27–31/10; restaurar deve recuperar a base sem mutação.
5. Acompanhamento deve continuar separado da conversa, sem polling permanente. Dados simulados e limites de integração devem permanecer identificados. Não voltar a exibir a lista de responsáveis removida pelo usuário.

Passos atômicos: compor dashboard com módulos existentes; aplicar estilos da referência; validar contratos/estados e jornadas de navegador desktop/mobile. Gate: npm run check. Um commit local para esta atualização visual, sem push/deploy.

## Evidência da implementação

Gate `npm run check`: 79 unitários, 6 integração, 6 E2E; lint, tipos e build verdes. Nenhum teste ignorado/removido. Os dois seletores de título do E2E preexistente foram atualizados para o título solicitado pelo novo design; as demais asserções foram preservadas.

| Critério | Asserção / evidência | Reverso / resultado |
| --- | --- | --- |
| Identidade e responsividade | `tests/e2e/folego.spec.ts:74` título Fôlego; `:82` scrollWidth <= viewport; `:98` diálogo sem overflow | AC1/AC3, PASS; manter |
| Valores recebidos | `src/features/experience/folego-dashboard.test.tsx:36` saldo123,45; `:38` reservado45,67; `:39` livre67,89; `:40` sem números do protótipo | AC2, PASS; manter |
| Importação/conversa preservadas | `src/features/experience/folego-dashboard.test.tsx:79`/`:80` arquivo/saldo; `:88` editor e `:89` gravação | AC3, PASS; manter |
| Diálogo acessível e histórico | `tests/e2e/folego.spec.ts:47` Escape fecha; `:48` foco retorna; `:61` resposta permanece ao reabrir | AC3, PASS; manter |
| Simular/restaurar | `src/features/experience/folego-dashboard.test.tsx:55` -500; `:61` data base25/10; `:69` restaura path; `tests/e2e/folego.spec.ts:19` -500, `:30` path original, `:34` mínimo1.000 | AC4, PASS; manter |
| Separação de avisos e remoção anterior | `tests/e2e/folego.spec.ts:77` origem Tarefa programada; `:66` sem Próximas frentes | AC5, PASS; manter |
| Data incerta mantida | `src/features/experience/folego-dashboard.test.tsx:103`/`:104` Incerta/Incerto com Cliente Ana | AC2, PASS; manter |

Revisão A–D: testes mapeiam os critérios locais, resultados financeiros vêm de fixtures/contratos; não há cálculo de saldo alternativo. Estado de diálogos usa API nativa, foco e Escape testados em Chromium. Fechar conversa desmonta a captura de voz e preserva o histórico textual. Sem alteração de contratos, dependências, lockfile ou domínios alheios.

Conferência visual: desktop 1280 px e celular 360 px; fontes servidas localmente; gráfico com rótulos sem sobreposição. Capturas em `output/playwright/folego-desktop.png` e `output/playwright/folego-mobile.png` (artefatos ignorados no Git).
