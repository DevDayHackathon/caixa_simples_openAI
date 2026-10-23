# Agente de caixa proativo

Projeto do tema 13: Painel de caixa para pequenos negócios.

**Estado atual:** especificações e planejamento. A aplicação ainda não foi implementada. Não há instalação ou comandos de execução disponíveis nesta etapa.

## Leitura inicial

1. [Requisitos e critérios de aceitação](.specs/features/caixa-proativo/spec.md)
2. [Contexto e decisões do usuário](.specs/features/caixa-proativo/context.md)
3. [Stack e arquitetura propostas](.specs/features/caixa-proativo/design.md)
4. [Contratos entre as três frentes](.specs/features/caixa-proativo/contracts.md)
5. [Tarefas, dependências e gates](.specs/features/caixa-proativo/tasks.md)
6. [Divisão entre Jecky, Daniel e Bruno](docs/trabalho-paralelo.md)
7. [Memória e próximos passos](.specs/STATE.md)

Fixture de aceitação: [examples/caixa-demo.csv](examples/caixa-demo.csv), com saldo inicial de R$ 1.000 informado separadamente.

## Proposta de produto

O usuário alimenta dados por CSV, texto ou voz. O agente responde, identifica consequências, prepara propostas e cria tarefas internas. Quando uma tarefa dispara, o agente retoma o compromisso e verifica se precisa agir. Reservas são virtuais, cobranças são rascunhos e simulações não alteram a base.

## Validação da documentação

Os scripts pertencem à skill tlc-spec-driven instalada no ambiente, não são scripts da aplicação:

```bash
python3 /home/mestre/.agents/skills/tlc-spec-driven/scripts/validate_spec.py caixa-proativo --strict
python3 /home/mestre/.agents/skills/tlc-spec-driven/scripts/validate_tasks.py caixa-proativo --strict
```

Os comandos npm de tasks.md são uma proposta a materializar em T1. Nenhuma suíte de produto passou nesta etapa; somente os gates estruturais da documentação foram executados.
