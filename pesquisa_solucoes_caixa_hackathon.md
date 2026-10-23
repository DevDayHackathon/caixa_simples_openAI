# Pesquisa de soluções — caixa simples, voz e proatividade

Pesquisa em fontes públicas oficiais consultadas em **23/10/2026**. São **cinco soluções no total: duas brasileiras e três internacionais**. O objetivo é comparar funcionalidades e tirar referências para o hackathon, não recomendar contratação de software.

## 1. Leitura do desafio e das dores

O arquivo `contexto_hackathon_painel_de_caixa.md` define o tema **13 — Painel de caixa para pequenos negócios**. A entrega mínima é importar movimentações em CSV, apresentar um resumo e alterar a data de um recebimento para visualizar seu impacto. A demonstração precisa simular um atraso e identificar o período afetado. O recorte é uma empresa fictícia, uma moeda e trinta dias de movimentações.

A imagem fornecida acrescenta estas dores:

| Dor | Pergunta que o produto deveria responder |
| --- | --- |
| Prazo de pagamento do fornecedor | O que vence, quando preciso pagar e o recebimento chegará a tempo? |
| Saber entradas e saídas | Quanto entrou, quanto saiu e o que ainda está previsto? |
| Saber se está no verde ou vermelho | Qual é meu saldo hoje e em quais dias faltará dinheiro? |
| Saber quando repor | Quando o produto acabará e consigo financiar a compra? |
| Organizar recebimentos | Quem deve, quanto, para quando e qual recebimento está atrasado? |

**Premissa:** interpretei “quando repor” como reposição de estoque. Caso signifique recompor a reserva de caixa, o alerta de saldo mínimo já cobre boa parte dessa necessidade.

**Distinção importante:** caixa positivo e lucro são medidas diferentes. Para este desafio, “verde/vermelho” deve indicar disponibilidade de dinheiro, sem afirmar que a empresa teve lucro ou prejuízo.

As funcionalidades abaixo foram documentadas pelos fornecedores. A relação entre funcionalidade e dor, os diferenciais comparativos e as prioridades para o hackathon são **análise desta pesquisa**. Não houve teste em contas contratadas. Recursos podem depender de plano, módulo, configuração e país. Ausência de comprovação não significa ausência da funcionalidade.

## 2. Conta Azul — Brasil

**Como atende ao problema:** reúne registros financeiros, vencimentos, relatórios, cobrança e estoque. É uma referência de integração das rotinas de uma pequena empresa.

| Funcionalidade documentada | Como funciona | Dor que ajuda a resolver |
| --- | --- | --- |
| Fluxo de caixa diário e mensal | Exibe entradas, saídas e evolução financeira | Descobrir se haverá dinheiro para pagar contas |
| Posição de contas por cliente e fornecedor | Separa valores pagos, recebidos e pendentes | Perder vencimentos e não saber quem ainda deve |
| Análise por categorias | Agrupa pagamentos e recebimentos | Não entender para onde o dinheiro está indo |
| Conciliação bancária | Compara extrato e registros financeiros | Saldo incorreto, lançamentos esquecidos e retrabalho de conferência |
| Importações com IA | Extrai valor, vencimento, fornecedor e categoria de documentos, texto ou áudio | Digitação trabalhosa e registros incompletos |
| Áudio pelo WhatsApp para alimentar importações | Transforma o conteúdo enviado em sugestão de lançamento | Dificuldade de atualizar o financeiro durante a operação |
| Regras de automação | Preenche campos, registra ou concilia conforme condições configuradas | Repetir a classificação de tarifas e fornecedores |
| Lembretes de cobrança | Configura contatos antes, no dia e depois do vencimento | Esquecer de cobrar e manter recebíveis atrasados |
| Estoque mínimo/máximo e relatórios de giro | Avisa sobre limites e permite analisar movimentação de produtos | Falta de mercadoria ou dinheiro parado em excesso de estoque |
| DRE gerencial | Organiza resultado por categorias | Confundir dinheiro disponível com rentabilidade |

Fontes: [relatórios](https://ajuda.contaazul.com/hc/pt-br/articles/115008158328-Relat%C3%B3rios-conhe%C3%A7a-os-relat%C3%B3rios-da-Conta-Azul), [IA, importações e notificações](https://ajuda.contaazul.com/hc/pt-br/articles/48896041362701-Intelig%C3%AAncia-artificial-da-Conta-Azul-quais-s%C3%A3o-os-recursos), [regras de conciliação](https://ajuda.contaazul.com/hc/pt-br/articles/48806753947021-Concilia%C3%A7%C3%A3o-como-criar-uma-automa%C3%A7%C3%A3o), [cobrança](https://ajuda.contaazul.com/hc/pt-br/articles/45358360881165-Cobran%C3%A7as-da-Conta-Azul-perguntas-frequentes-sobre-novos-lembretes-de-vencimento-da-Conta-Azul), [alertas de estoque](https://ajuda.contaazul.com/hc/pt-br/articles/45313446419981-Estoque-como-configurar-o-alerta-de-estoque-m%C3%ADnimo-e-m%C3%A1ximo).

**Diferencial nesta comparação:** combinar a gestão cotidiana brasileira com captura de informações e automações, reduzindo o esforço de manter os dados atualizados.

**Referência para vocês:** registrar por áudio, sugerir a categoria e destacar uma pendência com uma ação acessível.

**Limites relevantes:** áudio para importação não comprova que todas as operações sejam executáveis por voz. Os alertas de estoque documentados são enviados em D+1; não são necessariamente instantâneos. Lembretes por WhatsApp/SMS têm cobrança própria, segundo a documentação.

## 3. Omie — Brasil

**Como atende ao problema:** conecta contas a pagar/receber, caixa, compras, estoque e serviços financeiros; possui operações por texto e áudio no WhatsApp.

| Funcionalidade documentada | Como funciona | Dor que ajuda a resolver |
| --- | --- | --- |
| Fluxo de caixa realizado e previsto | Consolida movimentações e previsões financeiras | Enxergar o caixa futuro e compromissos ainda não liquidados |
| Consultas financeiras por áudio/texto | Consulta saldo, movimentações, saldo previsto e contas | Precisar navegar por telas para obter uma resposta simples |
| Inclusão e baixa de contas pelo WhatsApp | Permite registrar contas e pagamentos/recebimentos | Deixar de registrar operações por falta de tempo |
| Contas a pagar e aprovações | Organiza despesas e permite aprovar contas | Esquecer fornecedores ou pagar sem controle |
| Contas a receber e boletos | Registra cobranças, consulta atrasados e permite prorrogar boletos | Perder o acompanhamento de clientes e novas datas |
| Consulta de estoque pelo WhatsApp | Informa saldo de produtos e itens no mínimo | Descobrir tarde que um produto está acabando |
| Sugestão de compra | Considera consumo, estoque, entradas/saídas previstas e prazo de reposição | Comprar na hora ou quantidade errada |
| Alerta diário de estoque mínimo | Notifica produtos iguais ou abaixo do mínimo configurado | Depender de checagens manuais para repor |
| Conta integrada e conciliação | Integra movimentações aos registros financeiros | Manter banco e sistema com informações diferentes |
| Pagamentos em lote, agendamento e DDA | Centraliza boletos e execução organizada | Gastar tempo cadastrando e pagando conta por conta |
| Antecipação de recebíveis | Permite simular e antecipar recebimentos elegíveis | Descompasso entre pagar o fornecedor e receber do cliente |

Fontes: [fluxo de caixa](https://ajuda.omie.com.br/pt-BR/articles/6657830-relatorios-financas-gerando-e-analisando-fluxo-de-caixa-por-categoria), [funções financeiras no WhatsApp](https://ajuda.omie.com.br/pt-BR/articles/11825490-financas-recursos-no-erp-integrados-via-ia-no-whatsapp), [estoque e outras consultas no WhatsApp](https://ajuda.omie.com.br/pt-BR/articles/11825498-geral-recursos-no-erp-integrados-via-ia-no-whatsapp), [sugestão de compra](https://ajuda.omie.com.br/pt-BR/articles/5386253-sugestao-de-compra), [alerta de estoque](https://ajuda.omie.com.br/pt-BR/articles/1592576-analisando-o-estoque-dos-produtos), [serviços financeiros](https://www.omie.com.br/servicos-financeiros/).

**Diferencial nesta comparação:** é a referência mais próxima da combinação desejada de gestão financeira, estoque e comandos por áudio em um canal familiar.

**Referência para vocês:** permitir falar a intenção — consultar, registrar, alterar ou simular — sem exigir que o usuário saiba em qual módulo isso fica.

**Limites relevantes:** a documentação comprova um conjunto de comandos, não a execução irrestrita de qualquer tarefa por voz. Sugestão de compra precisa de dados de produtos e consumo. Antecipação tem condições e custos próprios; não elimina o problema de organização do caixa.

## 4. Float — internacional, sediada na Escócia

**Como atende ao problema:** especializa-se em previsão de caixa e simulação de decisões sobre dados vindos do sistema contábil. É uma referência especialmente próxima da demonstração obrigatória do desafio.

| Funcionalidade documentada | Como funciona | Dor que ajuda a resolver |
| --- | --- | --- |
| Previsão contínua de caixa | Combina saldo conciliado, contas e orçamento | Ver o futuro sem reconstruir uma planilha |
| Visões semanal e mensal, incluindo 13 semanas | Permite alternar horizontes | Perder um aperto de curto prazo ao olhar só o mês |
| Cenários separados do cenário-base | Modela hipóteses e compara consequências | Tomar decisões sem testar o impacto |
| Ativar/desativar linhas de orçamento | Recalcula a previsão ao incluir ou retirar gastos | Não saber se uma despesa pode esperar |
| Datas esperadas de recebimento | Usa o comportamento histórico de pagamento por cliente | Planejar com uma data contratual pouco realista |
| Ajuste de datas e tratamento de vencidos | Permite revisar a expectativa e excluir recebimentos não esperados da previsão | Tratar uma dívida vencida como dinheiro que certamente entrará |
| Sugestões de custos recorrentes | Identifica padrões de despesas | Esquecer gastos que se repetem |
| Orçamento preenchido pelo realizado | Atualiza a expectativa com as transações reais | Somar orçamento e realizado indevidamente |
| Sincronização contábil | Atualiza dados via plataformas como Xero e QuickBooks Online | Previsão ficar desatualizada por manutenção manual |
| Comentários, permissões e exportações | Compartilha decisões e relatórios com contexto | Desencontro entre dono, equipe e contador |

Fontes: [produto](https://floatapp.com/product), [visão geral e integrações](https://www.floatapp.com/), [cenários](https://intercom.help/floatapp/en/articles/7854551-create-scenarios-to-answer-what-if-questions), [tratamento de vencidos](https://intercom.help/floatapp/en/articles/1884288-float-is-showing-overdue-invoices-bills-from-months-ago-what-do-i-do), [orçamentos](https://intercom.help/floatapp/en/articles/1934041-what-are-income-and-costs-budgets), [informações institucionais e datas esperadas](https://www.floatapp.com/ai-info-page).

**Diferencial nesta comparação:** profundidade na pergunta “o que acontece com o caixa se eu mudar esta decisão?”, preservando uma referência para comparação.

**Referência para vocês:** mostrar antes/depois de um atraso e separar vencimento original da data em que o dinheiro provavelmente chegará.

**Limites relevantes:** depende de dados contábeis; a documentação informa sincronização a cada 24 horas ou manual, e não conexão bancária direta. Não identifiquei controle nativo de reposição de estoque nem operação completa por voz nas fontes consultadas.

## 5. Agicap — internacional, origem na França

**Como atende ao problema:** combina visibilidade e previsão de caixa com cobrança e pagamentos. É uma referência de transformar análise em processo operacional, ainda que tenha foco em equipes financeiras mais estruturadas.

| Funcionalidade documentada | Como funciona | Dor que ajuda a resolver |
| --- | --- | --- |
| Consolidação de contas e integrações | Reúne bancos, sistemas de gestão e contas | Dinheiro e obrigações espalhados em várias fontes |
| Conciliação automatizada | Relaciona movimentações e faturas | Perder tempo verificando o que realmente foi pago |
| Previsão diária, semanal e mensal | Projeta caixa com diferentes horizontes | Descobrir falta de dinheiro depois do vencimento |
| Cenários e comparação previsto × realizado | Testa hipóteses e evidencia desvios | Não perceber que o plano deixou de representar a realidade |
| Ajuste de recebimento por histórico | Incorpora comportamento dos clientes à previsão | Superestimar entradas pontuais |
| Cobrança automatizada e links de pagamento | Organiza sequências de contato e situação das cobranças | Receber tarde e esquecer acompanhamentos |
| Contas a receber por tempo de atraso | Mostra vencidos e prazo médio de recebimento | Não saber onde concentrar esforço de cobrança |
| Gestão de faturas contestadas | Pausa cobranças e exclui valores contestados da previsão | Cobrar indevidamente ou contar com uma entrada incerta |
| Limites e exposição de crédito | Acompanha uso de limites e alerta excessos | Acumular risco em clientes que podem não pagar |
| Organização de pagamentos | Centraliza campanhas de pagamento e processos de aprovação | Descontrole na quitação de fornecedores |

Fontes: [gestão de caixa](https://agicap.com/en/products/cash-management/), [previsões e cenários](https://agicap.com/en-us/features/cashflow-forecast/), [recebíveis, atrasos e disputas](https://agicap.com/en-us/products/account-receivable/), [sequências de cobrança](https://agicap.com/en/features/late-payment-reminders/), [contas a pagar](https://agicap.com/en-us/article/invoice-management-software/), [origem da empresa](https://agicap.com/en/press/).

**Diferencial nesta comparação:** aproximar previsão, cobrança e pagamentos. O problema identificado pode alimentar uma rotina para melhorar o recebimento ou organizar as saídas.

**Referência para vocês:** cada alerta deve apresentar causa, efeito e uma próxima ação, em vez de apenas uma notificação genérica.

**Limites relevantes:** não é equivalente a um aplicativo mínimo para microcomerciantes. As páginas internacionais não comprovam integração com bancos brasileiros. Não identifiquei módulo nativo de reposição de estoque ou operação integral por voz nas fontes examinadas.

## 6. QuickBooks Online / Intuit AI — referência internacional

**Como atende ao problema:** combina contabilidade e gestão financeira com recursos de IA para registros, cobranças e consultas. Foram consultadas páginas globais e dos Estados Unidos; os recursos não devem ser presumidos como disponíveis em um mesmo plano ou no Brasil.

| Funcionalidade documentada | Como funciona | Dor que ajuda a resolver |
| --- | --- | --- |
| Importação bancária e categorização | Traz transações e sugere classificação | Digitar tudo e não entender a composição das despesas |
| Conciliação assistida por IA | Compara extratos e registros, indicando divergências | Ter números que não batem com o banco |
| Detecção de anomalias | Aponta possíveis inconsistências em relatórios | Deixar erros passarem despercebidos |
| Cash Flow Planner, nas versões elegíveis | Projeta entradas/saídas e permite ajustar eventos sem alterar a escrituração | Não conseguir testar um atraso ou gasto futuro |
| Previsão da data de pagamento | Considera histórico e informações da fatura | Acreditar que todos os clientes pagarão no vencimento |
| Payments AI | Sugere estratégias e redige lembretes de cobrança | Cobrar de maneira pouco consistente ou tarde demais |
| Sugestão de pagamentos recorrentes | Identifica oportunidades de recorrência | Recebimentos imprevisíveis e tarefas repetidas |
| Intuit Intelligence, chat em linguagem natural | Responde a perguntas sobre informações do negócio | Precisar dominar relatórios para tirar uma dúvida |
| Pontos de reposição e pedidos de compra | Avisa sobre estoque baixo e ajuda a gerar a compra | Falta de produtos e pedidos manuais desconectados |
| Uso de notas de voz em orçamentos | Aproveita registros falados para preparar propostas para revisão | Perder detalhes comerciais ou gastar tempo redigitando |

Fontes: [Accounting AI](https://quickbooks.intuit.com/accounting-agent/), [recursos globais e chat](https://quickbooks.intuit.com/global/ai-agents/accounting), [Cash Flow Planner](https://quickbooks.intuit.com/learn-support/en-global/help-article/money-movement/cash-flow-planner/L8kvVEdNC_ROW_en), [Payments AI e notas de voz](https://quickbooks.intuit.com/payments-agent/), [reposição de estoque](https://quickbooks.intuit.com/learn-support/en-us/help-articles/set-up-and-use-reorder-points/00/262139).

**Diferencial nesta comparação:** aplicar assistência de IA a tarefas distintas — registrar corretamente, encontrar inconsistências, esclarecer dúvidas e melhorar a cobrança — sobre a mesma base de gestão.

**Referência para vocês:** respostas contextuais e ações sugeridas sobre os dados da empresa, com revisão do usuário quando necessário.

**Limites relevantes:** o Cash Flow Planner possui exclusões de dados e restrições, como incompatibilidade com empresas com múltiplas moedas ativadas. Há documentação distinta por região, portanto sua disponibilidade precisa ser validada na versão contratada. Estoque está documentado nos planos americanos Plus/Advanced. Notas de voz em propostas não comprovam operação completa do financeiro por voz.

## 7. Cobertura comparada das dores

Esta tabela resume a evidência, sem dar nota de usabilidade. “Não identificado” significa apenas que não houve comprovação nas fontes examinadas.

| Necessidade | Conta Azul | Omie | Float | Agicap | QuickBooks |
| --- | --- | --- | --- | --- | --- |
| Entender entradas e saídas | Relatórios e categorias | Fluxo realizado/previsto | Previsão integrada | Consolidação e previsão | Registros e planejamento |
| Ver caixa futuro | Fluxo de caixa | Fluxo previsto | Foco principal | Foco principal | Planner elegível |
| Organizar fornecedor/vencimentos | Posição de contas | Contas e pagamentos | Visibilidade de contas | Pagamentos e previsão | Contas e planejamento |
| Organizar recebimentos/atrasos | Contas e lembretes | Contas, boletos e atrasados | Datas esperadas | Cobrança e risco | Payments AI e previsões |
| Saber quando repor estoque | Limites e giro | Sugestão de compra e limites | Não identificado | Não identificado | Pontos de reposição |
| Áudio/voz comprovado | Entrada de informações por WhatsApp | Diversas consultas e ações por WhatsApp | Não identificado | Não identificado | Notas de voz em propostas |
| Proatividade comprovada | Alertas e automações | Alertas e sugestões de compra | Custos recorrentes e datas esperadas | Cobranças e alertas de risco | Recomendações, lembretes e anomalias |

Nenhuma dessas evidências permite afirmar que uma ferramenta resolve **todas** as dores com a mesma profundidade. Um alerta de estoque mínimo, por exemplo, não demonstra que a compra sugerida cabe no caixa.

## 8. O que vale colocar no hackathon

**Recomendação:** construir um assistente de caixa que responda a três perguntas: **“Como estou?”, “Quando pode faltar?” e “O que posso fazer?”**. Usar voz como caminho para executar essas tarefas, mantendo os números visíveis para conferência.

### P0 — entrega que deve funcionar primeiro

| Funcionalidade recomendada | Referência | Dor e resultado esperado |
| --- | --- | --- |
| Importação de CSV com prévia e correção simples | Obrigação do desafio; automações de entrada como referência | Começar sem cadastrar transação por transação; identificar dados faltantes |
| Resumo de saldo atual, entradas/saídas e saldo previsto | Todas as cinco | Entender a situação rapidamente |
| Projeção diária dos 30 dias com menor saldo e primeiro dia negativo | Float e Agicap | Antecipar o período de aperto |
| Alteração de recebimento e comparação antes/depois | Obrigação do desafio; Float e Planner | Visualizar exatamente o efeito de um atraso |
| Lista simples de contas a pagar/receber, com status e datas | Conta Azul, Omie e Agicap | Organizar fornecedores, clientes e vencimentos |

Na importação, o negócio precisa informar o **saldo inicial**. Os dados também precisam distinguir movimentação realizada de compromisso previsto e informar datas esperadas. Um extrato de transações passadas, sozinho, não revela todas as contas futuras.

### P1 — diferencial central recomendado

| Funcionalidade recomendada | Referência | Como deve aparecer para o usuário |
| --- | --- | --- |
| Consultas e ações por voz, com resposta curta em áudio e texto | Omie; áudio da Conta Azul | “Quanto tenho?”, “Quem está me devendo?”, “Registra uma despesa” e “Simula um atraso” |
| Alerta proativo de caixa abaixo de zero ou da reserva definida | Alertas dos ERPs e previsão do Float/Agicap | Ao importar ou alterar dados, avisar espontaneamente a data, o valor e o motivo |
| Explicação do aperto e comparação de alternativas | Síntese recomendada a partir de cenários e ações de cobrança | Mostrar quanto melhora se um recebimento chegar antes ou uma saída mudar de data |

O caminho completo precisa permitir **consultar → entender → simular → escolher → atualizar a previsão**. Assim, voz reduz passos reais, em vez de apenas ler o painel.

Sugestões de ação devem respeitar os dados disponíveis. “Negociar prazo com fornecedor” é uma possibilidade a simular, não um acordo já obtido. A ferramenta deve indicar que a mudança depende de negociação. Um cenário hipotético também não deve marcar uma conta como efetivamente paga ou recebida.

### P2 — acrescentar somente se o fluxo principal já estiver pronto

| Funcionalidade | Valor | Limite de escopo |
| --- | --- | --- |
| Rascunho de cobrança, priorizado pelo efeito no caixa | Ajuda a escolher quem cobrar primeiro | Preparar mensagem para copiar; envio real pode ficar para depois |
| Cadastro de receita/despesa por voz e categoria sugerida | Mantém dados atualizados com menos esforço | Pedir os campos faltantes e permitir corrigir |
| Aviso de reposição com simulação do custo | Conecta estoque e capital disponível | Poucos produtos fictícios, com quantidade, consumo e prazo de entrega explícitos |
| Resumo diário das três prioridades | Reduz esforço de interpretar números | No hackathon, mostrar ao abrir a aplicação; agendamento real é evolução |

### Evolução posterior

Integrações bancárias, execução de Pix e boletos, WhatsApp integrado, cobrança automática real, conciliação completa, emissão fiscal, crédito/antecipação, estoque com vários depósitos e previsões estatísticas robustas são evoluções possíveis. Não são necessárias para demonstrar o desafio e aumentam o esforço de integração.

Com apenas trinta dias de uma empresa fictícia, a melhor base é uma **projeção por compromissos e hipóteses explícitas**. Não há evidência suficiente para prometer aprendizado confiável de sazonalidade ou inadimplência. É possível simular atrasos informados pelo usuário.

## 9. Oportunidade de diferenciação

**Voz e proatividade isoladas já aparecem no mercado.** A oportunidade proposta é a combinação de entrada simples, interpretação acessível e consequência financeira visível:

> O usuário fala uma mudança; o sistema mostra quando o dinheiro vai faltar, explica quais compromissos causam isso e compara opções para atravessar o período.

Este é um posicionamento recomendado, não uma alegação de exclusividade. A pesquisa não prova que nenhum concorrente ofereça essa combinação.

Para o público pequeno, a hipótese de valor é reduzir decisões e navegação: uma tela com saldo atual, linha do caixa futuro, próximas contas e no máximo três ações prioritárias.

### Exemplo fictício de demonstração

1. Importar os dados e informar saldo inicial de R$ 1.000.
2. Ter um recebimento de R$ 2.000 no dia 10 e um fornecedor de R$ 1.500 no dia 12; sem outras movimentações no exemplo.
3. O usuário diz: “Simula que o cliente só vai pagar no dia 17.”
4. O sistema compara: antes, o saldo mínimo do período era R$ 1.000; com o atraso, fica em **−R$ 500 entre os dias 12 e 16** e volta a R$ 1.500 no dia 17.
5. Sem nova pergunta, informa a causa e oferece comparar alternativas: receber R$ 500 até o dia 12 ou negociar o fornecedor para o dia 17, assumindo recebimento antes do pagamento nesse dia.
6. O usuário escolhe a hipótese por voz; o sistema recalcula e mantém distinguíveis o cenário original e a simulação.

Esse exemplo evidencia importação, resumo, alteração de recebimento, período afetado, voz e proatividade. A sugestão de negociação é uma proposta ao usuário, sem contato ou transação executados.

## 10. Cuidados de produto que sustentam a facilidade

- Toda operação cotidiana planejada para o MVP deve ter um caminho por voz; importação pode continuar pelo seletor de arquivo.
- Se houver dois recebimentos do mesmo cliente, perguntar qual é antes de alterar.
- Manter vencimento original, previsão atual de recebimento e data efetiva como conceitos distintos.
- Após ouvir valor ou data, mostrar o que foi entendido e oferecer correção/desfazer.
- Classificar alertas pela proximidade e pelo tamanho do aperto, evitando excesso de notificações.
- Exibir a origem dos valores e a data da última atualização.
- Usar cálculo financeiro consistente para os saldos; a explicação deve acompanhar os valores calculados.
- Manter texto e controles visuais como alternativas à voz, para ambientes barulhentos e situações em que falar não seja conveniente.

**Escolha recomendada para a equipe:** garantir o P0 e concentrar o diferencial em **simulação por voz + alerta com causa + comparação de ações**. Estoque entra depois, se houver tempo e dados, ligado ao impacto da compra no caixa.
