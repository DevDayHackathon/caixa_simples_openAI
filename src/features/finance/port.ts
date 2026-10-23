import type { FinancePort } from "@/contracts";
import { FinanceError, type FinanceStore } from "./store";
import { previewImport, confirmImport } from "./import";
import { calculateCash } from "./cash";
import { createTransaction, updateTransaction, settleTransaction } from "./transactions";
import { reserveForPayment } from "./reservations";
import { simulate } from "./scenarios";

export function saoPauloDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function createFinancePort(store: FinanceStore, now: () => Date = () => new Date()): FinancePort {
  return {
    previewImport: input => previewImport(store, input), confirmImport: input => confirmImport(store, input),
    getCashSnapshot: async input => {
      if (input.business_id !== "demo") throw new FinanceError(403, "FORBIDDEN", "Empresa fora do escopo.");
      return calculateCash(await store.read(), input.as_of);
    },
    createTransaction: input => createTransaction(store, input), updateTransaction: input => updateTransaction(store, input),
    settleTransaction: input => settleTransaction(store, input),
    simulate: async input => simulate(await store.read(), input, saoPauloDate(now())),
    reserveForPayment: input => reserveForPayment(store, input, saoPauloDate(now())),
  };
}
