import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowMetrics",
  description: "Kanban com metricas ageis, auditoria de fluxo e acompanhamento de gargalos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
