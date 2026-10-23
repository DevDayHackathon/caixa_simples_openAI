# Contexto consolidado

Gathered: 2026-10-23. Status: produto especificado; propostas técnicas aguardam revisão.

## Feature Boundary

Uma empresa fictícia, BRL e trinta dias. Entradas CSV/texto/voz. Caixa, simulação de atraso, reservas virtuais, rascunhos e tarefas internas. Nada é integrado ao banco na primeira entrega.

## Implementation Decisions

- Usuário corrigiu explicitamente o diagrama: existem dois fluxos, não um fluxo unificado com duas entradas indistintas.
- Fluxo usuário: entender intenção → obter contexto → esclarecer → atender → reavaliar consequências → responder → criar acompanhamento quando cabível.
- Fluxo programado: adquirir ocorrência → recuperar compromisso → verificar se resolvido → reavaliar caixa → preparar iniciativa → notificar quando pertinente → encerrar ou reagendar.
- Tarefas são criadas pelo próprio agente a partir de compromissos e preferências. O agendador apenas dispara; não decide a ação.
- Proatividade é o diferencial. Voz reduz esforço de interação, mas não substitui o acompanhamento.
- Stack foi solicitada como recomendação direta, sem entrevista de escolha; nomes confirmados: Jecky, Daniel e Bruno.

## Declined / Undiscussed Gray Areas → Assumptions

Sem código, stack ou testes preexistentes. Defaults técnicos, sessão demo, limites e persistência estão explícitos em spec.md. Não são apresentados como aprovação já concedida.

## Specific References

Conta Azul: alimentação de dados e alertas. Omie: comandos por áudio. Float: cenários. Agicap: ligar previsão às ações. QuickBooks: ferramentas especializadas sobre a mesma base.

## Deferred Ideas

Estoque P2, WhatsApp, banco, pagamentos reais, envio externo, personalização de reservas e inferência histórica. O diagrama ideal não torna todas essas extensões obrigatórias no MVP.

## Atualização de 23/10/2026 — hospedagem confirmada

Usuário determinou Vercel grátis e Supabase grátis. Decisão fechada de ambiente; demais propostas de stack/ownership continuam em revisão. O cron de lembretes fica no Supabase; Vercel Hobby recebe o HTTP protegido. Áudio foi reduzido de 10 MiB para 3 MiB por compatibilidade de payload. Ver docs/deploy-gratuito.md. Nenhuma implantação foi solicitada para execução agora.

## Agendamento aceito após a revisão

O usuário aceitou que o agente escolhe previamente quando avisar e que a verificação leve permanece no Supabase. O banco só chama Vercel se houver tarefa vencida elegível. Zero chamadas Vercel/OpenAI sem trabalho. O pedido explícito do usuário prevalece sobre horário sugerido. As branches ainda não foram criadas nem o bootstrap executado.
