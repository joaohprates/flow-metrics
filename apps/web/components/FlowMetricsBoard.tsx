"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Board,
  Card,
  ColumnId,
  Priority,
  User,
  columnName,
  columns,
  createCard,
  createUser,
  deleteCard,
  deleteUser,
  formatDays,
  getBoard,
  moveCard,
  updateCard,
  updateUser,
} from "@/lib/api";

const priorityOptions: Priority[] = ["Alta", "Media", "Baixa"];
type Notice = { message: string; tone: "saving" | "success" };
type MoveQueue = { inFlight: boolean; latest: ColumnId };

export function FlowMetricsBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const refreshSeq = useRef(0);
  const moveQueues = useRef(new Map<string, MoveQueue>());
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [movingFamilyIds, setMovingFamilyIds] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creationParentId, setCreationParentId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);

  async function refresh() {
    const seq = ++refreshSeq.current;
    setError(null);
    try {
      const data = await getBoard();
      const pendingMoves = Array.from(moveQueues.current.entries());
      if (pendingMoves.length) {
        data.cards = data.cards.map((card) => {
          const pending = pendingMoves.find(([rootId]) => belongsToFamily(card, rootId));
          return pending ? { ...card, column_id: pending[1].latest } : card;
        });
      }
      if (seq === refreshSeq.current) {
        setBoard(data);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!notice || notice.tone === "saving") return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const owners = useMemo(() => {
    if (!board) return [];
    return board.users;
  }, [board]);

  const visibleCards = useMemo(() => {
    if (!board) return [];
    return board.cards.filter((card) => ownerFilter === "all" || card.owner_id === ownerFilter);
  }, [board, ownerFilter]);

  const childrenByParentId = useMemo(() => {
    const groups = new Map<string, Card[]>();
    for (const card of visibleCards) {
      if (!card.parent_card_id) continue;
      const children = groups.get(card.parent_card_id) || [];
      children.push(card);
      groups.set(card.parent_card_id, children);
    }
    return groups;
  }, [visibleCards]);

  async function onMove(cardId: string, columnId: ColumnId) {
    const card = board?.cards.find((item) => item.id === cardId);
    if (!card) return;

    const rootId = familyRootId(card);
    const familyCards = board?.cards.filter((item) => belongsToFamily(item, rootId)) || [];
    const queue = moveQueues.current.get(rootId) || { inFlight: false, latest: columnId };
    if (familyCards.length && familyCards.every((item) => item.column_id === columnId) && !queue.inFlight) return;

    refreshSeq.current += 1;
    setDraggingCardId(null);
    setError(null);
    setBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        cards: current.cards.map((item) =>
          belongsToFamily(item, rootId) ? { ...item, column_id: columnId, updated_at: new Date().toISOString() } : item,
        ),
      };
    });

    queue.latest = columnId;
    moveQueues.current.set(rootId, queue);
    if (!queue.inFlight) {
      void flushMoveQueue(rootId);
    }
  }

  async function flushMoveQueue(rootId: string) {
    const queue = moveQueues.current.get(rootId);
    if (!queue) return;

    queue.inFlight = true;
    setMovingFamilyIds((current) => new Set(current).add(rootId));

    try {
      while (true) {
        const target = queue.latest;
        await moveCard(rootId, target);
        const current = moveQueues.current.get(rootId);
        if (!current || current.latest === target) break;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel mover a task");
    } finally {
      moveQueues.current.delete(rootId);
      setMovingFamilyIds((current) => {
        const next = new Set(current);
        next.delete(rootId);
        return next;
      });
      await refresh();
    }
  }

  function openCreateDialog(parentCardId: string | null = null) {
    setSelectedCard(null);
    setEditingCard(null);
    setCreationParentId(parentCardId);
    setFormOpen(true);
  }

  function openEditDialog(card: Card) {
    setSelectedCard(null);
    setEditingCard(card);
    setCreationParentId(null);
    setFormOpen(true);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      title: String(form.get("title") || ""),
      parent_card_id: String(form.get("parent_card_id") || "") || null,
      owner_id: String(form.get("owner_id") || ""),
      card_type: String(form.get("card_type") || "Feature"),
      priority: String(form.get("priority") || "Media") as Priority,
    };

    setSavingCard(true);
    setNotice({ message: "Salvando card...", tone: "saving" });
    try {
      if (editingCard) {
        await updateCard(editingCard.id, {
          ...payload,
          column_id: String(form.get("column_id") || editingCard.column_id) as ColumnId,
        });
      } else {
        await createCard(payload);
      }
      formElement.reset();
      setFormOpen(false);
      setEditingCard(null);
      setCreationParentId(null);
      setNotice({ message: editingCard ? "Card atualizado com sucesso." : "Card salvo com sucesso.", tone: "success" });
      void refresh();
    } catch (cause) {
      setNotice(null);
      setError(cause instanceof Error ? cause.message : "Nao foi possivel salvar o card");
    } finally {
      setSavingCard(false);
    }
  }

  async function onSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      name: String(form.get("name") || ""),
      role: String(form.get("role") || "Produto"),
    };

    setSavingUser(true);
    setNotice({ message: "Salvando usuario...", tone: "saving" });
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          ...payload,
          active: form.get("active") === "on",
        });
      } else {
        await createUser(payload);
      }
      formElement.reset();
      setUserFormOpen(false);
      setEditingUser(null);
      setNotice({
        message: editingUser ? "Usuario atualizado com sucesso." : "Usuario criado com sucesso.",
        tone: "success",
      });
      void refresh();
    } catch (cause) {
      setNotice(null);
      setError(cause instanceof Error ? cause.message : "Nao foi possivel salvar o usuario");
    } finally {
      setSavingUser(false);
    }
  }

  async function onToggleUser(user: User) {
    try {
      await updateUser(user.id, { active: !user.active });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel atualizar o usuario");
    }
  }

  async function onDeactivateUser(user: User) {
    if (!window.confirm(`Desativar "${user.name}" para novos cards?`)) return;
    try {
      await deleteUser(user.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel desativar o usuario");
    }
  }

  async function onDelete(card: Card) {
    if (!window.confirm(`Excluir "${card.title}" do Kanban?`)) return;
    try {
      await deleteCard(card.id);
      setSelectedCard(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel excluir o card");
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
            <small>Gestao visual com metricas ageis</small>
          </div>
        </div>

        <nav className="nav-stack" aria-label="Navegacao">
          <a href="#board">Quadro</a>
          <a href="#users">Usuarios</a>
          <a href="#metrics">Metricas</a>
          <a href="#audit">Auditoria</a>
        </nav>

        <section className="stack-card" id="flow-summary">
          <span>Visao operacional</span>
          <strong>Fluxo</strong>
          <strong>Metricas</strong>
          <strong>Auditoria</strong>
          <small>Historico de movimentacoes e gargalos em um so quadro.</small>
        </section>
      </aside>

      <section className="workspace">
        <header className="hero">
          <div>
            <p className="kicker">Painel analitico de metricas ageis</p>
            <h1>O quadro Kanban virou uma fonte de inteligencia operacional.</h1>
            <p>
              Cada movimento de card alimenta o historico do fluxo. O painel acompanha Lead Time,
              Cycle Time, throughput e gargalos para apoiar decisoes da equipe.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button" type="button" onClick={refresh}>
              Atualizar
            </button>
            <button className="primary-button" type="button" onClick={() => openCreateDialog()}>
              Novo card
            </button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}
        {notice ? <Toast notice={notice} /> : null}

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

            <section className="users-panel" id="users">
              <div className="section-heading">
                <div>
                  <p className="kicker">Equipe</p>
                  <h2>Usuarios que podem receber tarefas</h2>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setUserFormOpen(true);
                  }}
                >
                  Novo usuario
                </button>
              </div>

              <div className="user-grid">
                {board.users.map((user) => (
                  <article className={`user-card ${user.active ? "" : "inactive"}`} key={user.id}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.role}</span>
                    </div>
                    <small>{user.active ? "Ativo para novos cards" : "Inativo"}</small>
                    <div className="user-actions">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setEditingUser(user);
                          setUserFormOpen(true);
                        }}
                      >
                        Editar
                      </button>
                      <button className="ghost-button" type="button" onClick={() => onToggleUser(user)}>
                        {user.active ? "Pausar" : "Ativar"}
                      </button>
                      {user.active ? (
                        <button className="danger-button" type="button" onClick={() => onDeactivateUser(user)}>
                          Desativar
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="board-panel board-panel-wide" id="board">
              <div className="section-heading">
                <div>
                  <p className="kicker">Fluxo de trabalho</p>
                  <h2>Kanban rastreavel</h2>
                </div>
                <div className="board-toolbar">
                  <label className="field compact">
                    <span>Responsavel</span>
                    <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                      <option value="all">Todos</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="ghost-button" type="button" onClick={() => openCreateDialog()}>
                    Novo card
                  </button>
                </div>
              </div>

              <div className="kanban-board">
                {columns.map((column) => {
                  const cards = visibleCards.filter((card) => card.column_id === column.id);
                  const rootCards = cards.filter((card) => !card.parent_card_id);
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
                          <>
                            {rootCards.map((card) => {
                              const childCards = childrenByParentId.get(card.id) || [];
                              const rootId = familyRootId(card);
                              return (
                                <div className="card-family" key={card.id}>
                                  <WorkCard
                                    card={card}
                                    dragging={draggingCardId === card.id}
                                    moving={movingFamilyIds.has(rootId)}
                                    onCreateSubtask={openCreateDialog}
                                    onDragEnd={() => setDraggingCardId(null)}
                                    onDragStart={setDraggingCardId}
                                    onSelect={setSelectedCard}
                                  />
                                  {childCards.length ? (
                                    <div className="subtask-stack">
                                      {childCards.map((child) => (
                                        <WorkCard
                                          card={child}
                                          dragging={draggingCardId === child.id}
                                          key={child.id}
                                          moving={movingFamilyIds.has(rootId)}
                                          onCreateSubtask={openCreateDialog}
                                          onDragEnd={() => setDraggingCardId(null)}
                                          onDragStart={setDraggingCardId}
                                          onSelect={setSelectedCard}
                                        />
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <div className="empty-lane">Sem cards nesta etapa</div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <section className="insights-grid">
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

              <section className="audit-panel" id="audit">
                <div className="section-heading stacked">
                  <p className="kicker">Auditoria</p>
                  <h2>Ultimas movimentacoes do fluxo</h2>
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
            </section>
          </>
        ) : null}
      </section>

      {formOpen ? (
        <CardDialog
          card={editingCard}
          creationParentId={creationParentId}
          cards={board?.cards || []}
          saving={savingCard}
          users={board?.users || []}
          onClose={() => {
            setFormOpen(false);
            setEditingCard(null);
            setCreationParentId(null);
          }}
          onSave={onSave}
        />
      ) : null}
      {userFormOpen ? (
        <UserDialog
          user={editingUser}
          saving={savingUser}
          onClose={() => {
            setUserFormOpen(false);
            setEditingUser(null);
          }}
          onSave={onSaveUser}
        />
      ) : null}
      {selectedCard ? (
        <CardDrawer
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onCreateSubtask={openCreateDialog}
          onDelete={onDelete}
          onEdit={openEditDialog}
        />
      ) : null}
    </main>
  );
}

function WorkCard({
  card,
  dragging,
  moving,
  onCreateSubtask,
  onDragEnd,
  onDragStart,
  onSelect,
}: {
  card: Card;
  dragging: boolean;
  moving: boolean;
  onCreateSubtask: (parentCardId: string) => void;
  onDragEnd: () => void;
  onDragStart: (cardId: string) => void;
  onSelect: (card: Card) => void;
}) {
  const isSubtask = Boolean(card.parent_card_id);

  return (
    <article
      className={`work-card ${isSubtask ? "subtask-card" : ""} ${dragging ? "dragging" : ""} ${moving ? "syncing" : ""}`}
      draggable={!isSubtask}
      onDragStart={(event) => {
        if (isSubtask) {
          event.preventDefault();
          return;
        }
        onDragStart(card.id);
        event.dataTransfer.setData("text/plain", card.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(card)}
    >
      {isSubtask ? <span className="parent-chip">Filha de {card.parent_title || "card pai"}</span> : null}
      <h3>{card.title}</h3>
      <div className="card-meta">
        <span>{card.owner}</span>
        <span>{card.card_type}</span>
        <span>{card.priority}</span>
      </div>
      <div className="card-foot">
        <small>{isSubtask ? "Acompanha a task mae" : `Atualizado ${formatDate(card.updated_at)}`}</small>
        {!isSubtask ? (
          <button
            className="subtask-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCreateSubtask(card.id);
            }}
          >
            Subtask
          </button>
        ) : null}
      </div>
      {!isSubtask && card.child_count > 0 ? <span className="child-count">{card.child_count} subtasks</span> : null}
    </article>
  );
}

function familyRootId(card: Card): string {
  return card.parent_card_id || card.id;
}

function belongsToFamily(card: Card, rootId: string): boolean {
  return card.id === rootId || card.parent_card_id === rootId;
}

function Toast({ notice }: { notice: Notice }) {
  return (
    <div className={`toast ${notice.tone}`} role="status" aria-live="polite">
      <span>{notice.tone === "saving" ? "..." : "OK"}</span>
      <strong>{notice.message}</strong>
    </div>
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

function CardDialog({
  card,
  cards,
  creationParentId,
  saving,
  users,
  onClose,
  onSave,
}: {
  card: Card | null;
  cards: Card[];
  creationParentId: string | null;
  saving: boolean;
  users: User[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const availableUsers = users.filter((user) => user.active || user.id === card?.owner_id);
  const defaultOwnerId = card?.owner_id || availableUsers[0]?.id || "";
  const parentOptions = cards.filter((item) => !item.parent_card_id && item.id !== card?.id);
  const defaultParentId = card?.parent_card_id || creationParentId || "";
  const defaultType = card?.card_type || (creationParentId ? "Subtask" : "Feature");

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-card" onSubmit={onSave}>
        <header>
          <div>
            <p className="kicker">{card ? "Editar trabalho" : "Novo trabalho"}</p>
            <h2>{card ? "Atualizar card" : "Criar card rastreavel"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>
        <label className="field">
          <span>Titulo</span>
          <input
            name="title"
            required
            minLength={3}
            maxLength={120}
            placeholder="Integrar calculo de metricas"
            defaultValue={card?.title || ""}
          />
        </label>
        <label className="field">
          <span>Vinculo</span>
          <select name="parent_card_id" defaultValue={defaultParentId} disabled={Boolean(card?.child_count)}>
            <option value="">Card principal</option>
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                Subtask de: {item.title}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Responsavel</span>
            <select name="owner_id" required defaultValue={defaultOwnerId}>
              <option value="" disabled>
                Selecione um usuario
              </option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                  {user.active ? "" : " (inativo)"}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select name="card_type" defaultValue={defaultType}>
              <option>Feature</option>
              <option>Subtask</option>
              <option>Bug</option>
              <option>Infra</option>
              <option>UX</option>
              <option>QA</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Prioridade</span>
          <select name="priority" defaultValue={card?.priority || "Media"}>
            {priorityOptions.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        {card ? (
          <label className="field">
            <span>Status</span>
            <select name="column_id" defaultValue={card.column_id}>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <footer>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Salvando..." : card ? "Atualizar card" : "Salvar card"}
          </button>
        </footer>
        {!availableUsers.length ? <p className="form-note">Crie um usuario ativo antes de cadastrar cards.</p> : null}
      </form>
    </div>
  );
}

function UserDialog({
  user,
  saving,
  onClose,
  onSave,
}: {
  user: User | null;
  saving: boolean;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-card compact-modal" onSubmit={onSave}>
        <header>
          <div>
            <p className="kicker">{user ? "Editar usuario" : "Novo usuario"}</p>
            <h2>{user ? "Atualizar pessoa da equipe" : "Cadastrar pessoa da equipe"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>
        <label className="field">
          <span>Nome</span>
          <input name="name" required minLength={2} maxLength={80} placeholder="Joao" defaultValue={user?.name || ""} />
        </label>
        <label className="field">
          <span>Papel</span>
          <input name="role" required minLength={2} maxLength={60} placeholder="Produto" defaultValue={user?.role || "Produto"} />
        </label>
        {user ? (
          <label className="check-field">
            <input name="active" type="checkbox" defaultChecked={user.active} />
            <span>Ativo para novos cards</span>
          </label>
        ) : null}
        <footer>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Salvando..." : user ? "Atualizar usuario" : "Criar usuario"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function CardDrawer({
  card,
  onClose,
  onCreateSubtask,
  onDelete,
  onEdit,
}: {
  card: Card;
  onClose: () => void;
  onCreateSubtask: (parentCardId: string) => void;
  onDelete: (card: Card) => void;
  onEdit: (card: Card) => void;
}) {
  const isSubtask = Boolean(card.parent_card_id);

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
          <dt>{isSubtask ? "Card pai" : "Subtasks"}</dt>
          <dd>{isSubtask ? card.parent_title || "Card pai" : card.child_count}</dd>
        </div>
        <div>
          <dt>Prioridade</dt>
          <dd>{card.priority}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{card.card_type}</dd>
        </div>
      </dl>
      <div className="drawer-actions">
        {!isSubtask ? (
          <button className="ghost-button" type="button" onClick={() => onCreateSubtask(card.id)}>
            Nova subtask
          </button>
        ) : null}
        <button className="primary-button" type="button" onClick={() => onEdit(card)}>
          Editar card
        </button>
        <button className="danger-button" type="button" onClick={() => onDelete(card)}>
          Excluir
        </button>
      </div>
      <p className="drawer-note">
        Este card faz parte do historico do fluxo. Cada movimento atualiza a auditoria e as metricas
        do quadro.
      </p>
    </aside>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-mark">FM</div>
      <h1>Carregando FlowMetrics</h1>
      <p>Carregando dados do quadro.</p>
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
