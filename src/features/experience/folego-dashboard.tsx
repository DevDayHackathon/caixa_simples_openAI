"use client";
import React, { useState } from "react";
import type { CashSnapshot, FinancePort, Transaction } from "@/contracts";
import {
  createMockAgentPort,
  createMockFinancePort,
  MockOperationUnavailable,
} from "@/adapters/mock";
import {
  f1Snapshot,
  f1DelayedSnapshot,
  agentReplyFixture,
} from "@/fixtures/demo";
import { CashPanel, money } from "./cash-panel";
import { CashChart, shortDate } from "./cash-chart";
import { Icon } from "./icons";
import { ToolDialog } from "./tool-dialog";
import { ImportPanel } from "./import-panel";
import { ScenarioPanel } from "./scenario-panel";
import { Conversation } from "./conversation";
import { Inbox } from "./inbox";

const finance = createMockFinancePort({
  async simulate(input) {
    const override = input.overrides[0];
    if (
      input.base_version !== 1 ||
      input.overrides.length !== 1 ||
      override.transaction_id !== "rec-1" ||
      override.expected_date !== "2026-11-01" ||
      override.amount_cents !== undefined
    )
      throw new MockOperationUnavailable("cenário fora da referência F1");
    return structuredClone({
      scenario_id: "mock-f1-delay",
      baseline: f1Snapshot,
      projected: f1DelayedSnapshot,
      affected_dates: [
        "2026-10-25",
        "2026-10-26",
        "2026-10-27",
        "2026-10-28",
        "2026-10-29",
        "2026-10-30",
        "2026-10-31",
      ],
      deficit_intervals: f1DelayedSnapshot.negative_intervals,
    });
  },
});
const agent = createMockAgentPort();
type Simulation = Awaited<ReturnType<FinancePort["simulate"]>>;
type Tool = "import" | "scenario" | "conversation" | "explanation";
const toolTitles: Record<Tool, string> = {
  import: "Importar compromissos",
  scenario: "Comparar um atraso",
  conversation: "Converse com o Fôlego",
  explanation: "Entenda a previsão",
};
export function FolegoDashboard({
  snapshot,
  transactions,
  reserveThreshold = 0,
  financePort,
  onFinancialAction,
  controls,
}: {
  snapshot: CashSnapshot;
  transactions: Transaction[];
  reserveThreshold?: number;
  financePort?: FinancePort;
  onFinancialAction?: () => void;
  controls?: React.ReactNode;
}) {
  const persisted = snapshot.source === "user_data";
  const activeFinance = financePort ?? finance;
  const [tool, setTool] = useState<Tool | null>(null),
    [simulation, setSimulation] = useState<Simulation | null>(null),
    [refresh, setRefresh] = useState(0),
    [showAll, setShowAll] = useState(false),
    [scenarioRevision, setScenarioRevision] = useState(0);
  const visible = simulation?.projected ?? snapshot;
  const negative = visible.minimum_balance_cents < 0;
  const intervals = visible.negative_intervals;
  const first = visible.daily_balances[0].date,
    last = visible.daily_balances.at(-1)!.date;
  const pending = transactions.filter((t) => t.status === "pending");
  const upcoming = [...pending].sort(
    (a, b) =>
      (a.expected_date ?? a.due_date).localeCompare(
        b.expected_date ?? b.due_date,
      ) || a.id.localeCompare(b.id),
  );
  const onAction = () => { setRefresh((n) => n + 1); setSimulation(null); setScenarioRevision(n => n + 1); onFinancialAction?.(); };
  const summary = negative
    ? `A ${simulation ? "hipótese" : "previsão"} mostra um saldo mínimo de ${money(visible.minimum_balance_cents)}. Confira o período negativo antes de decidir sobre uma alteração.`
    : `A previsão recebida não apresenta dias negativos nos próximos 30 dias, com mínimo de ${money(visible.minimum_balance_cents)}. Os compromissos previstos já fazem parte dessa projeção.`;
  return (
    <div className="folego-app">
      <a className="folego-skip-link" href="#folego-main">
        Ir para o caixa
      </a>
      <header className="folego-topbar">
        <a
          className="folego-brand"
          href="#folego-main"
          aria-label="Fôlego, início"
        >
          <span className="folego-brandmark">
            <Icon name="logo" />
          </span>
          <span>
            fôlego<small>caixa claro, decisão tranquila</small>
          </span>
        </a>
        <div className="folego-top-actions">
          <span className="folego-period">
            Visão de{" "}
            <strong>
              {shortDate(first)} — {shortDate(last)}, {first.slice(0, 4)}
            </strong>
          </span>
          <span className="folego-demo-dot">{persisted ? "Dados fictícios persistidos" : "Dados simulados"}</span>
          <a href={persisted ? "/" : "/caixa"}>{persisted ? "Ver prévia simulada" : "Abrir caixa persistido"}</a>
          <span className="folego-avatar" aria-label="Empresa demonstrativa">
            DE
          </span>
        </div>
      </header>
      <main id="folego-main" className="folego-wrap">
        <div className="folego-welcome">
          <div>
            <p className="folego-eyebrow">UM OLHAR À FRENTE</p>
            <h1>Seu caixa, com mais fôlego.</h1>
            <p>Veja o que já está comprometido e o que ainda pode mudar.</p>
          </div>
          <div className="folego-actions">
            <button className="folego-btn" onClick={() => setTool("import")}>
              <Icon name="upload" />
              Importar CSV
            </button>
            <button
              className="folego-btn folego-primary"
              onClick={() => setTool("scenario")}
            >
              <Icon name="clock" />
              Simular atraso
            </button>
          </div>
        </div>
        {simulation && (
          <div className="folego-scenario-banner" role="status">
            <span className="folego-scenario-label">
              <Icon name="clock" />
              {persisted ? "Hipótese ativa" : "Hipótese F1 ativa"}
            </span>
            <span>A base continua preservada.</span>
            <button
              className="folego-link-button"
              onClick={() => {
                setSimulation(null);
                setScenarioRevision((n) => n + 1);
              }}
            >
              Restaurar cenário
            </button>
          </div>
        )}
        <section className="folego-stats" aria-label="Resumo do caixa">
          <div className="folego-stat folego-stat-main">
            <div className="folego-stat-label">
              Saldo hoje
              <span
                title="Saldo atual recebido do serviço financeiro"
                className="folego-info"
                aria-label="Saldo atual calculado, sem conexão bancária"
              >
                i
              </span>
            </div>
            <div data-testid="current-balance" className="folego-amount">
              {money(snapshot.current_balance_cents)}
            </div>
            <p className="folego-stat-foot">
              <span className="folego-tiny-line" />
              Referência em {shortDate(snapshot.as_of)}
            </p>
          </div>
          <div className="folego-stat">
            <div className="folego-stat-label">
              Reservado virtualmente
              <Icon name="clock" />
            </div>
            <div className="folego-amount">
              {money(snapshot.reserved_cents)}
            </div>
            <p className="folego-stat-foot">
              Dinheiro com destino, sem movimentação bancária
            </p>
          </div>
          <div className="folego-stat">
            <div className="folego-stat-label">
              Livre hoje
              <Icon name="check" />
            </div>
            <div className="folego-amount">{money(snapshot.free_cents)}</div>
            <p className="folego-stat-foot">
              <span className="folego-pill">Após as reservas virtuais</span>
            </p>
          </div>
        </section>
        <div className="folego-realized">
          <span>Realizado até {shortDate(snapshot.as_of)}</span>
          <span>
            <Icon name="arrow-up" />
            Entradas <strong>{money(snapshot.realized_in_cents)}</strong>
          </span>
          <span>
            <Icon name="arrow-down" />
            Saídas <strong>{money(snapshot.realized_out_cents)}</strong>
          </span>
        </div>
        <div className="folego-content">
          <section
            className="folego-panel folego-cashflow"
            aria-label="Projeção do caixa"
          >
            <div className="folego-panel-head">
              <div>
                <h2>O caminho do seu caixa</h2>
                <p>O saldo muda quando o dinheiro entra ou sai.</p>
              </div>
              <span className="folego-period-chip">Próximos 30 dias</span>
            </div>
            <div className="folego-legend">
              <span>
                <i />
                Saldo {simulation ? "da hipótese" : "projetado"}
              </span>
              <span>
                <i className="folego-amber-dot" />
                Limite de atenção · {money(reserveThreshold)}
              </span>
            </div>
            <CashChart snapshot={visible} reserveThreshold={reserveThreshold} />
            <div className="folego-chart-footer">
              <span>
                <span className="folego-live-dot" />{" "}
                {simulation ? "Visualizando uma hipótese" : "Cenário-base"} ·
                valores do serviço financeiro
              </span>
              <a href="#folego-details">
                Ver valores por dia <Icon name="chevron" />
              </a>
            </div>
          </section>
          <aside
            className={`folego-panel folego-risk ${negative ? "folego-risk-negative" : ""}`}
          >
            <div className="folego-risk-title">
              <span className="folego-risk-icon">
                <Icon name={negative ? "alert" : "check"} />
              </span>
              <h2>
                {negative ? "Um aperto no horizonte" : "Espaço para planejar"}
              </h2>
            </div>
            <p className="folego-risk-intro">
              {negative
                ? `${simulation ? "A hipótese" : "A previsão"} cruza o zero. Reveja as datas antes de confirmar uma mudança.`
                : "Esta previsão não apresenta dias negativos na janela de 30 dias."}
            </p>
            <div className="folego-risk-figure">
              <small>Menor saldo previsto</small>
              <strong data-testid="dashboard-minimum">
                {money(visible.minimum_balance_cents)}
              </strong>
              {intervals.length ? (
                intervals.map((i) => (
                  <span key={i.start_date}>
                    {shortDate(i.start_date)} a {shortDate(i.end_date)} · caixa
                    negativo
                  </span>
                ))
              ) : (
                <span>Dentro do período de 30 dias</span>
              )}
            </div>
            <div className="folego-risk-facts">
              <span>
                Compromissos na base<strong>{pending.length} previstos</strong>
              </span>
              <span>
                Reservas<strong>Somente virtuais</strong>
              </span>
              <span>
                Cenário
                <strong>
                  {simulation ? "Hipótese sem gravação" : "Base preservada"}
                </strong>
              </span>
            </div>
            <button
              className="folego-btn folego-explain-button"
              onClick={() => setTool("explanation")}
            >
              <Icon name="spark" />
              Entender a previsão
            </button>
          </aside>
        </div>
        <div className="folego-lower">
          <section
            className="folego-panel folego-transactions"
            aria-labelledby="upcoming-heading"
          >
            <div className="folego-table-head">
              <h2 id="upcoming-heading">Movimentações próximas</h2>
              {upcoming.length > 5 && (
                <button
                  className="folego-link-button"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Ver menos" : "Ver todas"}
                </button>
              )}
            </div>
            <p className="folego-table-note">Compromissos do cenário-base</p>
            <div className="folego-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Movimentação</th>
                    <th>Previsão</th>
                    <th>Status</th>
                    <th className="folego-money-column">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll ? upcoming : upcoming.slice(0, 5)).map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="folego-description">
                          <span
                            className={`folego-txicon ${t.direction === "out" ? "folego-out" : ""}`}
                          >
                            <Icon
                              name={
                                t.direction === "in" ? "arrow-up" : "arrow-down"
                              }
                            />
                          </span>
                          <span>
                            {t.description}
                            <small>{t.counterparty}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        {t.expected_date
                          ? shortDate(t.expected_date)
                          : "Incerta"}
                      </td>
                      <td>
                        <span className="folego-tag">
                          {t.expected_date ? "Previsto" : "Incerto"}
                        </span>
                      </td>
                      <td className="folego-money-column">
                        {t.direction === "in" ? "+" : "−"}{" "}
                        {money(t.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!upcoming.length && (
              <p className="folego-empty">
                Nenhum compromisso pendente neste período.
              </p>
            )}
            <div className="folego-transactions-footer">
              <Icon name="clock" />
              <span>Previsões não confirmam recebimento ou pagamento.</span>
            </div>
          </section>
          {!persisted && <aside className="folego-panel folego-ai-panel">
            <div className="folego-ai-top">
              <span className="folego-ai-brand">
                <span>
                  <Icon name="spark" />
                </span>
                Fôlego explica
              </span>
              <span className="folego-demo-label">DEMONSTRAÇÃO</span>
            </div>
            <h3>
              {negative
                ? "O que muda com o atraso?"
                : "Uma visão para decidir melhor"}
            </h3>
            <p>{summary}</p>
            <div className="folego-ai-insight">
              <strong>Os números vêm do seu caixa.</strong>
              <p>
                O resumo usa os saldos recebidos pela aplicação. A conversa
                ajuda a entender e preparar decisões.
              </p>
            </div>
            <button
              className="folego-link-button folego-chat-link"
              onClick={() => setTool("conversation")}
            >
              Conversar com o Fôlego <Icon name="chevron" />
            </button>
            <div className="folego-ai-foot">
              <span className="folego-live-dot" />
              Agente simulado · nenhuma IA chamada nesta prévia
            </div>
          </aside>}
        </div>
        {controls}
        {!persisted && <section id="folego-followup" className="folego-followup">
          <div className="folego-section-kicker">
            <span>ACOMPANHAMENTO</span>
            <span>Avisos de tarefas, separados da conversa</span>
          </div>
          <Inbox agent={agent} refreshKey={refresh} />
        </section>}
        <details id="folego-details" className="folego-details">
          <summary>
            Resumo detalhado e saldos por dia <Icon name="chevron" />
          </summary>
          <CashPanel snapshot={visible} />
        </details>
        {!persisted && <details className="folego-demo-details">
          <summary>Ver resposta de exemplo</summary>
          <p>{agentReplyFixture.reply_text}</p>
        </details>}
        <footer className="folego-source">
          <p>{persisted ? "Empresa demonstrativa · dados fictícios persistidos" : "Modo de desenvolvimento · dados simulados"}</p>
          <p>{persisted ? "Sem integração bancária. Agente e voz usam a configuração do servidor." : "Sem integração bancária ou chamadas de IA nesta base."}</p>
          <p>
            Reservas virtuais · cobranças em rascunho · projeção limitada a 30
            dias
          </p>
          <details>
            <summary>Sobre os dados desta prévia</summary>
            <p>
              Atualização: {snapshot.updated_at}. {persisted ? "Conversa e iniciativas estão disponíveis abaixo quando o servidor está configurado. Voz usa sessão e quota persistida; confirme propostas antes de alterar o caixa." : "Importação e mutações aguardam os adaptadores reais. Áudio depende da integração de sessão e limites persistidos; o texto continua disponível."}
            </p>
          </details>
        </footer>
      </main>
      <ToolDialog
        title={toolTitles.import}
        open={tool === "import"}
        onClose={() => setTool(null)}
      >
        <ImportPanel finance={activeFinance} onAction={onAction} />
      </ToolDialog>
      <ToolDialog
        title={toolTitles.scenario}
        open={tool === "scenario"}
        onClose={() => setTool(null)}
      >
        <ScenarioPanel
          key={scenarioRevision}
          finance={activeFinance}
          snapshot={snapshot}
          transactions={transactions}
          onAction={onAction}
          onSimulated={setSimulation}
        />
      </ToolDialog>
      {!persisted && <ToolDialog
        title={toolTitles.conversation}
        open={tool === "conversation"}
        onClose={() => setTool(null)}
      >
        <Conversation
          agent={agent}
          snapshotVersion={snapshot.version}
          onAction={onAction}
          voiceActive={tool === "conversation"}
        />
      </ToolDialog>}
      {tool === "explanation" && (
        <ToolDialog
          title={toolTitles.explanation}
          onClose={() => setTool(null)}
        >
          <div className="folego-explanation">
            <span className="folego-risk-icon">
              <Icon name="spark" />
            </span>
            <h3>
              {negative
                ? "O atraso muda o período crítico"
                : "Entenda o cenário-base"}
            </h3>
            <p>{summary}</p>
            {intervals.map((i) => (
              <p key={i.start_date}>
                Período negativo:{" "}
                <strong>
                  {shortDate(i.start_date)} a {shortDate(i.end_date)}
                </strong>
                .
              </p>
            ))}
            <p>
              Simulações não alteram a base. Alterar uma previsão é uma ação
              separada e exige confirmação pelo serviço financeiro.
            </p>
            <button
              className="folego-btn folego-primary"
              onClick={() => setTool("conversation")}
            >
              <Icon name="chat" />
              Continuar na conversa
            </button>
          </div>
        </ToolDialog>
      )}
    </div>
  );
}
