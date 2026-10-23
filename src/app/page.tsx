import type { Metadata } from "next";
import { createMockFinancePort } from "@/adapters/mock";
import { f1 } from "@/fixtures/demo";
import { FolegoDashboard } from "@/features/experience/folego-dashboard";
import "@/features/experience/folego.css";

export const metadata: Metadata = {
  title: "Fôlego · visão do caixa",
  description: "Seu caixa claro, com projeções, simulações e acompanhamento.",
};

export default async function Home() {
  const snapshot = await createMockFinancePort().getCashSnapshot({
    business_id: "demo",
    as_of: "2026-10-23",
  });
  return (
    <FolegoDashboard
      snapshot={snapshot}
      transactions={f1.transactions}
      reserveThreshold={f1.business.reserve_threshold_cents}
    />
  );
}
