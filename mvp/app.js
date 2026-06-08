const storageKey = "flowmetrics-mvp-state-v1";

const columns = [
  { id: "backlog", name: "Backlog", color: "#66706c" },
  { id: "todo", name: "A fazer", color: "#344c9a" },
  { id: "doing", name: "Em progresso", color: "#0f6f5f" },
  { id: "review", name: "Revisao", color: "#e0a13a" },
  { id: "done", name: "Concluido", color: "#d96045" },
];

const board = document.querySelector("#board");
const ownerFilter = document.querySelector("#ownerFilter");
const auditList = document.querySelector("#auditList");
const chart = document.querySelector("#columnChart");
const flowTable = document.querySelector("#flowTable");
const modal = document.querySelector("#cardModal");
const cardForm = document.querySelector("#cardForm");
const drawer = document.querySelector("#cardDrawer");
const drawerTitle = document.querySelector("#drawerTitle");
const drawerMetrics = document.querySelector("#drawerMetrics");
const drawerTimeline = document.querySelector("#drawerTimeline");

let state = loadState();
let selectedCardId = null;

document.querySelector("#newCardButton").addEventListener("click", () => modal.showModal());
document.querySelector("#resetButton").addEventListener("click", () => {
  state = createSeedState();
  selectedCardId = null;
  persist();
  render();
});
document.querySelector("#exportButton").addEventListener("click", exportJson);
document.querySelector("#drawerClose").addEventListener("click", closeDrawer);
ownerFilter.addEventListener("change", renderBoard);

cardForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();

  const now = new Date().toISOString();
  const card = {
    id: crypto.randomUUID(),
    title: document.querySelector("#cardTitle").value.trim(),
    owner: document.querySelector("#cardOwner").value.trim(),
    type: document.querySelector("#cardType").value,
    priority: document.querySelector("#cardPriority").value,
    column: "backlog",
    createdAt: now,
  };

  state.cards.unshift(card);
  state.events.unshift({
    id: crypto.randomUUID(),
    cardId: card.id,
    from: null,
    to: "backlog",
    at: now,
    note: "Card criado",
  });

  cardForm.reset();
  modal.close();
  persist();
  render();
});

render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved?.cards?.length && saved?.events?.length) return saved;
  } catch {
    localStorage.removeItem(storageKey);
  }
  return createSeedState();
}

function createSeedState() {
  const specs = [
    ["c1", "Instrumentar transicoes dos cards", "Thalys", "Feature", "Alta", "done", 12, [
      ["backlog", 12], ["todo", 10], ["doing", 8], ["review", 4], ["done", 2],
    ]],
    ["c2", "Dashboard Lead Time e Cycle Time", "Joao", "Feature", "Alta", "review", 9, [
      ["backlog", 9], ["todo", 7], ["doing", 5], ["review", 1],
    ]],
    ["c3", "Pipeline Railway via GitHub Actions", "Lucas", "Infra", "Media", "doing", 6, [
      ["backlog", 6], ["todo", 5], ["doing", 3],
    ]],
    ["c4", "Teste de criterio de aceite do Kanban", "Gustavo", "QA", "Media", "todo", 4, [
      ["backlog", 4], ["todo", 2],
    ]],
    ["c5", "Jornada de criacao de card", "Melissa", "UX", "Baixa", "backlog", 3, [
      ["backlog", 3],
    ]],
    ["c6", "Modelo de auditoria no PostgreSQL", "Joao", "Infra", "Alta", "done", 16, [
      ["backlog", 16], ["todo", 15], ["doing", 13], ["review", 9], ["done", 7],
    ]],
    ["c7", "Refino visual do painel analitico", "Gustavo", "UX", "Media", "doing", 5, [
      ["backlog", 5], ["todo", 4], ["doing", 1],
    ]],
  ];

  const cards = [];
  const events = [];

  specs.forEach(([id, title, owner, type, priority, column, createdDays, transitions]) => {
    cards.push({
      id,
      title,
      owner,
      type,
      priority,
      column,
      createdAt: daysAgo(createdDays),
    });
    transitions.forEach(([to, days], index) => {
      events.push({
        id: `${id}-e${index}`,
        cardId: id,
        from: index === 0 ? null : transitions[index - 1][0],
        to,
        at: daysAgo(days),
        note: index === 0 ? "Card criado" : "Transicao automatica",
      });
    });
  });

  return {
    cards,
    events: events.sort((a, b) => new Date(b.at) - new Date(a.at)),
  };
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + (days % 6), 20, 0, 0);
  return date.toISOString();
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function render() {
  renderFilters();
  renderMetrics();
  renderBoard();
  renderChart();
  renderAudit();
  if (selectedCardId) renderDrawer(selectedCardId);
}

function renderFilters() {
  const owners = [...new Set(state.cards.map((card) => card.owner))].sort();
  const current = ownerFilter.value || "all";
  ownerFilter.innerHTML = `<option value="all">Todos</option>${owners
    .map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`)
    .join("")}`;
  ownerFilter.value = owners.includes(current) ? current : "all";
}

function renderMetrics() {
  const completed = state.cards.filter((card) => card.column === "done");
  const leadTimes = completed.map((card) => diffDays(card.createdAt, doneAt(card.id))).filter(isFinite);
  const cycleTimes = completed.map((card) => {
    const started = firstTransitionTo(card.id, "doing")?.at || card.createdAt;
    return diffDays(started, doneAt(card.id));
  }).filter(isFinite);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const throughput = completed.filter((card) => new Date(doneAt(card.id)).getTime() >= sevenDaysAgo).length;
  const bottleneck = getBottleneck();

  document.querySelector("#leadTimeValue").textContent = formatDays(avg(leadTimes));
  document.querySelector("#cycleTimeValue").textContent = formatDays(avg(cycleTimes));
  document.querySelector("#throughputValue").textContent = throughput.toString();
  document.querySelector("#bottleneckValue").textContent = bottleneck.name;
  document.querySelector("#bottleneckNote").textContent = bottleneck.note;
}

function renderBoard() {
  const filter = ownerFilter.value;
  const visibleCards = state.cards.filter((card) => filter === "all" || card.owner === filter);

  board.innerHTML = columns.map((column) => {
    const cards = visibleCards.filter((card) => card.column === column.id);
    return `
      <section class="lane" data-column="${column.id}">
        <div class="lane-head">
          <div class="lane-title">
            <span class="lane-dot" style="background:${column.color}"></span>
            <span>${column.name}</span>
          </div>
          <span class="wip-count">${cards.length}</span>
        </div>
        <div class="card-list">
          ${cards.length ? cards.map(renderCard).join("") : `<div class="empty-state">Arraste cards para ${column.name.toLowerCase()}</div>`}
        </div>
      </section>
    `;
  }).join("");

  board.querySelectorAll(".lane").forEach((lane) => {
    lane.addEventListener("dragover", onDragOver);
    lane.addEventListener("dragleave", () => lane.classList.remove("drag-over"));
    lane.addEventListener("drop", onDrop);
  });

  board.querySelectorAll(".work-card").forEach((card) => {
    card.addEventListener("dragstart", onDragStart);
    card.addEventListener("dragend", onDragEnd);
    card.addEventListener("click", () => renderDrawer(card.dataset.cardId));
  });
}

function renderCard(card) {
  const aging = formatDays(diffDays(lastEventFor(card.id)?.at || card.createdAt, new Date().toISOString()));
  return `
    <article class="work-card" draggable="true" data-card-id="${card.id}" style="border-left-color:${colorFor(card.column)}">
      <h3>${escapeHtml(card.title)}</h3>
      <div class="card-meta">
        <span class="pill">${escapeHtml(card.owner)}</span>
        <span class="pill">${escapeHtml(card.type)}</span>
        <span class="pill priority-${card.priority.toLowerCase()}">${escapeHtml(card.priority)}</span>
      </div>
      <div class="age-line">
        <span>Na coluna: ${aging}</span>
        <strong>${escapeHtml(card.column === "done" ? "entregue" : "em fluxo")}</strong>
      </div>
    </article>
  `;
}

function onDragStart(event) {
  event.dataTransfer.setData("text/plain", event.currentTarget.dataset.cardId);
  event.currentTarget.classList.add("dragging");
}

function onDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  board.querySelectorAll(".drag-over").forEach((lane) => lane.classList.remove("drag-over"));
}

function onDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function onDrop(event) {
  event.preventDefault();
  const lane = event.currentTarget;
  const cardId = event.dataTransfer.getData("text/plain");
  const card = state.cards.find((item) => item.id === cardId);
  const to = lane.dataset.column;
  if (!card || card.column === to) {
    lane.classList.remove("drag-over");
    return;
  }

  const from = card.column;
  card.column = to;
  state.events.unshift({
    id: crypto.randomUUID(),
    cardId,
    from,
    to,
    at: new Date().toISOString(),
    note: "Movido via quadro",
  });

  lane.classList.remove("drag-over");
  persist();
  render();
}

function renderChart() {
  const rows = columnDurations();
  const maxValue = Math.max(...rows.map((row) => row.days), 1);
  const width = 360;
  const height = 220;
  const chartTop = 22;
  const chartHeight = 148;
  const barWidth = 44;
  const gap = 24;
  const startX = 28;

  chart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#fffdf7"></rect>
    <line x1="24" x2="336" y1="${chartTop + chartHeight}" y2="${chartTop + chartHeight}" stroke="#d8d1c5"></line>
    ${rows.map((row, index) => {
      const x = startX + index * (barWidth + gap);
      const h = Math.max(4, (row.days / maxValue) * chartHeight);
      const y = chartTop + chartHeight - h;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="5" fill="${colorFor(row.id)}"></rect>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" fill="#17201f" font-size="12" font-weight="800">${formatDays(row.days)}</text>
        <text x="${x + barWidth / 2}" y="198" text-anchor="middle" fill="#66706c" font-size="11">${shortName(row.id)}</text>
      `;
    }).join("")}
  `;

  flowTable.innerHTML = rows.map((row) => `
    <div class="flow-row">
      <span>${row.name}</span>
      <strong>${formatDays(row.days)}</strong>
    </div>
  `).join("");
}

function renderAudit() {
  const entries = state.events.slice(0, 12);
  auditList.innerHTML = entries.map((event) => {
    const card = state.cards.find((item) => item.id === event.cardId);
    const from = event.from ? columnName(event.from) : "Criacao";
    return `
      <article class="audit-item">
        <span class="audit-time">${formatDate(event.at)}</span>
        <span><strong>${escapeHtml(card?.title || "Card removido")}</strong>: ${from} -> ${columnName(event.to)}</span>
      </article>
    `;
  }).join("");
}

function renderDrawer(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;

  selectedCardId = cardId;
  const events = state.events
    .filter((event) => event.cardId === cardId)
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  drawerTitle.textContent = card.title;
  drawerMetrics.innerHTML = `
    <div><dt>Status</dt><dd>${columnName(card.column)}</dd></div>
    <div><dt>Responsavel</dt><dd>${escapeHtml(card.owner)}</dd></div>
    <div><dt>Lead atual</dt><dd>${formatDays(diffDays(card.createdAt, card.column === "done" ? doneAt(card.id) : new Date().toISOString()))}</dd></div>
    <div><dt>Transicoes</dt><dd>${Math.max(events.length - 1, 0)}</dd></div>
  `;
  drawerTimeline.innerHTML = events.map((event) => `
    <div class="timeline-item">
      <strong>${event.from ? `${columnName(event.from)} -> ${columnName(event.to)}` : "Card criado"}</strong>
      <span>${formatDate(event.at)} - ${escapeHtml(event.note)}</span>
    </div>
  `).join("");
  drawer.classList.add("open");
}

function closeDrawer() {
  selectedCardId = null;
  drawer.classList.remove("open");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `flowmetrics-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function columnDurations() {
  return columns.map((column) => {
    const durations = [];
    state.cards.forEach((card) => {
      durations.push(...durationsInColumn(card.id, column.id));
    });
    return {
      id: column.id,
      name: column.name,
      days: avg(durations),
    };
  });
}

function durationsInColumn(cardId, columnId) {
  const events = state.events
    .filter((event) => event.cardId === cardId)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
  const durations = [];

  events.forEach((event, index) => {
    if (event.to !== columnId) return;
    const next = events[index + 1]?.at || new Date().toISOString();
    durations.push(diffDays(event.at, next));
  });

  return durations;
}

function getBottleneck() {
  const candidates = columnDurations().filter((row) => row.id !== "done");
  const winner = candidates.sort((a, b) => b.days - a.days)[0];
  if (!winner || winner.days === 0) return { name: "--", note: "sem dados suficientes" };
  return { name: winner.name, note: `${formatDays(winner.days)} de permanencia media` };
}

function firstTransitionTo(cardId, columnId) {
  return state.events
    .filter((event) => event.cardId === cardId && event.to === columnId)
    .sort((a, b) => new Date(a.at) - new Date(b.at))[0];
}

function lastEventFor(cardId) {
  return state.events
    .filter((event) => event.cardId === cardId)
    .sort((a, b) => new Date(b.at) - new Date(a.at))[0];
}

function doneAt(cardId) {
  return firstTransitionTo(cardId, "done")?.at;
}

function diffDays(from, to) {
  if (!from || !to) return NaN;
  return Math.max(0, (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
}

function avg(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function formatDays(value) {
  if (!Number.isFinite(value)) return "--";
  if (value < 1) return `${Math.round(value * 24)}h`;
  return `${value.toFixed(value >= 10 ? 0 : 1)}d`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function columnName(id) {
  return columns.find((column) => column.id === id)?.name || id;
}

function colorFor(id) {
  return columns.find((column) => column.id === id)?.color || "#66706c";
}

function shortName(id) {
  const map = {
    backlog: "Backlog",
    todo: "A fazer",
    doing: "Exec.",
    review: "Revis.",
    done: "Done",
  };
  return map[id] || id;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
