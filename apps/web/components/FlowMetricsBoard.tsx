"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Board,
  Card,
  ColumnId,
  Priority,
  columnName,
  columns,
  createCard,
  formatDays,
  getBoard,
  moveCard,
} from "@/lib/api";

const priorityOptions: Priority[] = ["Alta", "Media", "Baixa"];

export function FlowMetricsBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function refresh() {
    setError(null);
    try {
      const data = await getBoard();
      setBoard(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const owners = useMemo(() => {
    if (!board) return [];
    return Array.from(new Set(board.cards.map((card) => card.owner))).sort();
  }, [board]);

  const visibleCards = useMemo(() => {
    if (!board) return [];
    return board.cards.filter((card) => ownerFilter === "all" || card.owner === ownerFilter);
  }, [board, ownerFilter]);

  async function onMove(cardId: string, columnId: ColumnId) {
    const card = board?.cards.find((item) => item.id === cardId);
    if (!card || card.column_id === columnId) return;

    setDraggingCardId(null);
    setBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        cards: current.cards.map((item) => (item.id === cardId ? { ...item, column_id: columnId } : item)),
      };
    });

    try {
      await moveCard(cardId, columnId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel mover o card");
      await refresh();
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await createCard({
        title: String(form.get("title") || ""),
        owner: String(form.get("owner") || ""),
        card_type: String(form.get("card_type") || "Feature"),
        priority: String(form.get("priority") || "Media") as Priority,
      });
      event.currentTarget.reset();
      setFormOpen(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel criar o card");
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <div className="brand-lockup">
          <span className="brand-mark">FM</span>
          <div>
            <strong>FlowMetrics</strong>
            <small>Next.js + FastAPI + PostgreSQL</small>
          </div>
        </div>

        <nav className="nav-stack" aria-label="Navegacao">
          <a href="#board">Quadro</a>
          <a href="#metrics">Metricas</a>
          <a href="#audit">Auditoria</a>
          <a href="#architecture">Stack</a>
        </nav>

        <section className="stack-card" id="architecture">
          <span>Stack executada</span>
          <strong>Next.js</strong>
          <strong>FastAPI</strong>
          <strong>PostgreSQL</strong>
          <small>Docker Compose para banco, API e web.</small>
        </section>
      </aside>

      <section className="workspace">
        <header className="hero">
          <div>
            <p className="kicker">Painel analitico de metricas ageis</p>
            <h1>O quadro Kanban virou uma fonte de inteligencia operacional.</h1>
            <p>
              Cada movimento de card grava uma transicao no PostgreSQL. A API FastAPI calcula Lead Time,
              Cycle Time, throughput e gargalos; o Next.js entrega a experiencia visual.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button" type="button" onClick={refresh}>
              Atualizar
            </button>
            <button className="primary-button" type="button" onClick={() => setFormOpen(true)}>
              Novo card
            </button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {board ? (
          <>
            <section className="metrics-grid" id="metrics">
              <MetricTile label="Lead Time medio" value={formatDays(board.metrics.lead_time_days)} note="criacao ate concluido" />
              <MetricTile label="Cycle Time medio" value={formatDays(board.metrics.cycle_time_days)} note="em progresso ate concluido" />
              <MetricTile label="Throughput 7 dias" value={String(board.metrics.throughput_7d)} note="cards concluidos" />
              <MetricTile
                label="Gargalo atual"
                value={board.metrics.bottleneck_column}
                note={`${formatDays(board.metrics.bottleneck_days)} de permanencia media`}
                tone="warning"
              />
            </section>

            <section className="content-grid">
              <section className="board-panel" id="board">
                <div className="section-heading">
                  <div>
                    <p className="kicker">Fluxo de trabalho</p>
                    <h2>Kanban rastreavel</h2>
                  </div>
                  <label className="field compact">
                    <span>Responsavel</span>
                    <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                      <option value="all">Todos</option>
                      {owners.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="kanban-board">
                  {columns.map((column) => {
                    const cards = visibleCards.filter((card) => card.column_id === column.id);
                    return (
                      <section
                        className="lane"
                        key={column.id}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          const cardId = event.dataTransfer.getData("text/plain");
                          onMove(cardId, column.id);
                        }}
                      >
                        <div className="lane-head">
                          <span className="lane-title">
                            <i style={{ background: column.color }} />
                            {column.name}
                          </span>
                          <strong>{cards.length}</strong>
                        </div>
                        <div className="card-list">
                          {cards.length ? (
                            cards.map((card) => (
                              <article
                                className={`work-card ${draggingCardId === card.id ? "dragging" : ""}`}
                                key={card.id}
                                draggable
                                onDragStart={(event) => {
                                  setDraggingCardId(card.id);
                                  event.dataTransfer.setData("text/plain", card.id);
                                }}
                                onDragEnd={() => setDraggingCardId(null)}
                                onClick={() => setSelectedCard(card)}
                                style={{ borderLeftColor: column.color }}
                              >
                                <h3>{card.title}</h3>
                                <div className="card-meta">
                                  <span>{card.owner}</span>
                                  <span>{card.card_type}</span>
                                  <span>{card.priority}</span>
                                </div>
                                <small>Atualizado {formatDate(card.updated_at)}</small>
                              </article>
                            ))
                          ) : (
                            <div className="empty-lane">Sem cards nesta etapa</div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>

              <aside className="analytics-panel">
                <div className="section-heading stacked">
                  <p className="kicker">Tempo por coluna</p>
                  <h2>Onde o fluxo esta parando</h2>
                </div>
                <div className="bar-chart">
                  {board.metrics.column_metrics.map((metric) => (
                    <div className="bar-row" key={metric.column_id}>
                      <span>{metric.column_name}</span>
                      <div>
                        <i style={{ width: `${Math.max(8, metric.average_days * 11)}%` }} />
                      </div>
                      <strong>{formatDays(metric.average_days)}</strong>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            <section className="audit-panel" id="audit">
              <div className="section-heading stacked">
                <p className="kicker">Auditoria</p>
                <h2>Ultimas transicoes gravadas no banco</h2>
              </div>
              <div className="audit-list">
                {board.transitions.slice(0, 12).map((transition) => (
                  <article key={transition.id}>
                    <time>{formatDate(transition.moved_at)}</time>
                    <span>
                      <strong>{transition.card_title || transition.card_id}</strong>: {columnName(transition.from_column)}
                      {" -> "}
                      {columnName(transition.to_column)}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>

      {formOpen ? <CardDialog onClose={() => setFormOpen(false)} onCreate={onCreate} /> : null}
      {selectedCard ? <CardDrawer card={selectedCard} onClose={() => setSelectedCard(null)} /> : null}
    </main>
  );
}

function MetricTile({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "warning" }) {
  return (
    <article className={`metric-tile ${tone === "warning" ? "warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function CardDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-card" onSubmit={onCreate}>
        <header>
          <div>
            <p className="kicker">Novo trabalho</p>
            <h2>Criar card rastreavel</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>
        <label className="field">
          <span>Titulo</span>
          <input name="title" required minLength={3} maxLength={120} placeholder="Integrar calculo de metricas" />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Responsavel</span>
            <input name="owner" required minLength={2} maxLength={80} placeholder="Joao" />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select name="card_type" defaultValue="Feature">
              <option>Feature</option>
              <option>Bug</option>
              <option>Infra</option>
              <option>UX</option>
              <option>QA</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Prioridade</span>
          <select name="priority" defaultValue="Media">
            {priorityOptions.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <footer>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            Salvar no PostgreSQL
          </button>
        </footer>
      </form>
    </div>
  );
}

function CardDrawer({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <aside className="drawer">
      <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes">
        x
      </button>
      <p className="kicker">Card selecionado</p>
      <h2>{card.title}</h2>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>{columnName(card.column_id)}</dd>
        </div>
        <div>
          <dt>Responsavel</dt>
          <dd>{card.owner}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{card.card_type}</dd>
        </div>
        <div>
          <dt>Prioridade</dt>
          <dd>{card.priority}</dd>
        </div>
      </dl>
      <p className="drawer-note">
        Este card e persistido pela API FastAPI no PostgreSQL. Cada movimento cria uma linha em
        card_transitions.
      </p>
    </aside>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-mark">FM</div>
      <h1>Carregando FlowMetrics</h1>
      <p>Conectando ao FastAPI e ao PostgreSQL.</p>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
