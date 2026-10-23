import { createMockAgentPort, createMockFinancePort } from "@/adapters/mock";

const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default async function Home() {
  const finance = createMockFinancePort();
  const agent = createMockAgentPort();
  const snapshot = await finance.getCashSnapshot({ business_id: "demo", as_of: "2026-10-23" });
  const example = await agent.turn({ message: "Como está meu caixa?", origin: "user", request_id: "base-page" });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 sm:py-20">
      <p className="mb-5 text-sm font-medium text-emerald-800">Modo de desenvolvimento · dados simulados</p>
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Base comum do agente de caixa</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">Contratos e exemplos compartilhados para Jecky, Daniel e Bruno desenvolverem em paralelo.</p>
      <section aria-label="Exemplo financeiro F1" className="mt-10 grid gap-6 border-y border-slate-200 py-7 sm:grid-cols-3">
        <div><h2 className="text-sm text-slate-600">Saldo inicial da fixture F1</h2><p data-testid="current-balance" className="mt-2 text-3xl font-medium">{currency(snapshot.current_balance_cents)}</p></div>
        <div><h2 className="text-sm text-slate-600">Entradas realizadas</h2><p className="mt-2 text-3xl font-medium">{currency(snapshot.realized_in_cents)}</p></div>
        <div><h2 className="text-sm text-slate-600">Saídas realizadas</h2><p className="mt-2 text-3xl font-medium">{currency(snapshot.realized_out_cents)}</p></div>
      </section>
      <p className="mt-5 text-sm text-slate-600">Referência fixa: 23/10/2026. Sem integração bancária ou chamadas de IA nesta base.</p>
      <details className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <summary className="font-medium">Ver resposta de exemplo</summary>
        <p className="mt-4 leading-7">{example.reply_text}</p>
      </details>
      <section aria-labelledby="next-steps" className="mt-10">
        <h2 id="next-steps" className="text-xl font-medium">Próximas frentes</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li><strong className="text-slate-800">Jecky:</strong> experiência do usuário e voz.</li>
          <li><strong className="text-slate-800">Daniel:</strong> persistência e cálculos financeiros.</li>
          <li><strong className="text-slate-800">Bruno:</strong> agente proativo e tarefas programadas.</li>
        </ul>
      </section>
      <p className="mt-10 max-w-2xl text-sm leading-6 text-slate-600">Esta tela verifica a base técnica. Importação, reservas, voz e agendamento reais serão implementados nas tarefas seguintes.</p>
    </main>
  );
}
