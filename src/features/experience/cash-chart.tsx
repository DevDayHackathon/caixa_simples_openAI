import React, { useId } from "react";
import type { CashSnapshot } from "@/contracts";
import { money } from "./cash-panel";
export const shortDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "")
    .replace(" de ", " ");
export function CashChart({
  snapshot,
  reserveThreshold = 0,
}: {
  snapshot: CashSnapshot;
  reserveThreshold?: number;
}) {
  const id = useId();
  const values = snapshot.daily_balances.map((d) => d.balance_cents);
  // Presentation scale only. Daily balances are supplied by FinancePort.
  const bottom = Math.min(0, ...values, reserveThreshold);
  const top = Math.max(100, ...values, reserveThreshold);
  const pad = (top - bottom) * 0.12;
  const low = bottom - pad,
    high = top + pad;
  const y = (amount: number) => 200 - ((amount - low) / (high - low)) * 172;
  const x = (index: number) => 68 + (index / (values.length - 1)) * 606;
  const line = values
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`,
    )
    .join(" ");
  const area = `${line} L 674 200 L 68 200 Z`;
  const minimumIndex = values.indexOf(snapshot.minimum_balance_cents);
  const ticks = [high - pad, (top + bottom) / 2, bottom];
  return (
    <div className="folego-chart">
      <svg
        viewBox="0 0 700 250"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>
          Gráfico de saldo projetado nos próximos trinta dias
        </title>
        <desc id={`${id}-desc`}>
          Menor saldo previsto: {money(snapshot.minimum_balance_cents)}. Os
          fechamentos diários estão disponíveis na tabela detalhada.
        </desc>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6ca781" stopOpacity=".25" />
            <stop offset="100%" stopColor="#6ca781" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((value, index) => (
          <g key={index}>
            <line
              className="folego-gridline"
              x1="68"
              x2="674"
              y1={y(value)}
              y2={y(value)}
            />
            <text
              className="folego-axis"
              x="58"
              y={y(value) + 4}
              textAnchor="end"
            >
              {new Intl.NumberFormat("pt-BR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value / 100)}
            </text>
          </g>
        ))}
        <text className="folego-axis" x="20" y="14">
          R$
        </text>
        <path d={area} fill={`url(#${id}-fill)`} />
        <path
          className="folego-reserve-line"
          d={`M68 ${y(reserveThreshold)}H674`}
        />
        <path
          data-testid="cash-chart-path"
          className="folego-chart-line"
          d={line}
        />
        {[0, 2, 4, 9, 19, 29].map((index) => (
          <circle
            key={index}
            className="folego-chart-point"
            cx={x(index)}
            cy={y(values[index])}
            r="3.5"
          />
        ))}
        {[0, 5, 10, 15, 20, 29].map((index) => (
          <text
            key={index}
            className={`folego-axis ${index === 5 || index === 15 ? "folego-mobile-hide" : ""}`}
            x={x(index)}
            y="232"
            textAnchor={index === 0 ? "start" : index === 29 ? "end" : "middle"}
          >
            {shortDate(snapshot.daily_balances[index].date)}
          </text>
        ))}
        {minimumIndex >= 0 && (
          <circle
            className={
              snapshot.minimum_balance_cents < 0
                ? "folego-chart-warning"
                : "folego-chart-point"
            }
            cx={x(minimumIndex)}
            cy={y(snapshot.minimum_balance_cents)}
            r="5"
          />
        )}
      </svg>
    </div>
  );
}
