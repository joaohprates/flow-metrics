export type ColumnId = "backlog" | "todo" | "doing" | "review" | "done";
export type Priority = "Alta" | "Media" | "Baixa";

export type Card = {
  id: string;
  owner_id: string | null;
  title: string;
  owner: string;
  card_type: string;
  priority: Priority;
  column_id: ColumnId;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  name: string;
  role: string;
  active: boolean;
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
  users: User[];
  transitions: Transition[];
  metrics: Metrics;
};

export type CardPayload = {
  title: string;
  owner_id: string;
  card_type: string;
  priority: Priority;
};

export type CardUpdatePayload = Partial<CardPayload> & {
  column_id?: ColumnId;
};

export type UserPayload = {
  name: string;
  role: string;
};

export type UserUpdatePayload = Partial<UserPayload> & {
  active?: boolean;
};

export const columns: Array<{ id: ColumnId; name: string; color: string }> = [
  { id: "backlog", name: "Backlog", color: "#66706c" },
  { id: "todo", name: "A fazer", color: "#344c9a" },
  { id: "doing", name: "Em progresso", color: "#0f6f5f" },
  { id: "review", name: "Revisao", color: "#e0a13a" },
  { id: "done", name: "Concluido", color: "#d96045" },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";

function apiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, "")}${path}`;
}

async function apiError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") {
      return new Error(body.detail);
    }
  } catch {
    // Keep the product-facing fallback below when the backend returns no JSON.
  }
  return new Error(fallback);
}

export async function getBoard(): Promise<Board> {
  const response = await fetch(apiUrl("/api/board"), { cache: "no-store" });
  if (!response.ok) throw await apiError(response, "Nao foi possivel carregar o quadro");
  return response.json();
}

export async function createCard(payload: CardPayload): Promise<Card> {
  const response = await fetch(apiUrl("/api/cards"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await apiError(response, "Nao foi possivel criar o card");
  return response.json();
}

export async function updateCard(cardId: string, payload: CardUpdatePayload): Promise<Card> {
  const response = await fetch(apiUrl(`/api/cards/${cardId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await apiError(response, "Nao foi possivel atualizar o card");
  return response.json();
}

export async function deleteCard(cardId: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/cards/${cardId}`), { method: "DELETE" });
  if (!response.ok) throw await apiError(response, "Nao foi possivel excluir o card");
}

export async function moveCard(cardId: string, to_column: ColumnId): Promise<Card> {
  const response = await fetch(apiUrl(`/api/cards/${cardId}/move`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_column }),
  });
  if (!response.ok) throw await apiError(response, "Nao foi possivel mover o card");
  return response.json();
}

export async function createUser(payload: UserPayload): Promise<User> {
  const response = await fetch(apiUrl("/api/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await apiError(response, "Nao foi possivel criar o usuario");
  return response.json();
}

export async function updateUser(userId: string, payload: UserUpdatePayload): Promise<User> {
  const response = await fetch(apiUrl(`/api/users/${userId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await apiError(response, "Nao foi possivel atualizar o usuario");
  return response.json();
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/users/${userId}`), { method: "DELETE" });
  if (!response.ok) throw await apiError(response, "Nao foi possivel desativar o usuario");
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
