import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caixa proativo · base de desenvolvimento",
  description: "Base compartilhada da equipe, com contratos e dados simulados.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
