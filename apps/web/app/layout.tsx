import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowMetrics",
  description: "Kanban com metricas ageis nativas em Next.js, FastAPI e PostgreSQL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
