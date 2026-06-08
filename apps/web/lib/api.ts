export type ColumnId = "backlog" | "todo" | "doing" | "review" | "done";
export type Priority = "Alta" | "Media" | "Baixa";

export type Card = {
  id: string;
  title: string;
  owner: string;
  card_type: string;
  priority: Priority;
  column_id: ColumnId;
  created_at: string;
  updated_at: string;
};

export type Transition = {
  id: string;
  card_id: string;
  from_column: ColumnId | null;
  to_column: ColumnId;
  moved_at: string;
  note: string;
  card_title?: string | null;
};

export type ColumnMetric = {
  column_id: ColumnId;
  column_name: string;
  average_days: number;
  active_cards: number;
};

export type Metrics = {
  lead_time_days: number;
  cycle_time_days: number;
  throughput_7d: number;
  bottleneck_column: string;
  bottleneck_days: number;
  column_metrics: ColumnMetric[];
};

export type Board = {
  cards: Card[];
  transitions: Transition[];
  metrics: Metrics;
};

export const columns: Array<{ id: ColumnId; name: string; color: string }> = [
  { id: "backlog", name: "Backlog", color: "#66706c" },
  { id: "todo", name: "A fazer", color: "#344c9a" },
  { id: "doing", name: "Em progresso", color: "#0f6f5f" },
  { id: "review", name: "Revisao", color: "#e0a13a" },
  { id: "done", name: "Concluido", color: "#d96045" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function getBoard(): Promise<Board> {
  const response = await fetch(`${API_URL}/api/board`, { cache: "no-store" });
  if (!response.ok) throw new Error("Nao foi possivel carregar o quadro");
  return response.json();
}

export async function createCard(payload: {
  title: string;
  owner: string;
  card_type: string;
  priority: Priority;
}): Promise<Card> {
  const response = await fetch(`${API_URL}/api/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Nao foi possivel criar o card");
  return response.json();
}

export async function moveCard(cardId: string, to_column: ColumnId): Promise<Card> {
  const response = await fetch(`${API_URL}/api/cards/${cardId}/move`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_column }),
  });
  if (!response.ok) throw new Error("Nao foi possivel mover o card");
  return response.json();
}

export function formatDays(value: number): string {
  if (!Number.isFinite(value)) return "--";
  if (value < 1) return `${Math.round(value * 24)}h`;
  return `${value.toFixed(value >= 10 ? 0 : 1)}d`;
}

export function columnName(id: ColumnId | null): string {
  if (!id) return "Criacao";
  return columns.find((column) => column.id === id)?.name || id;
}
