from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


ColumnId = Literal["backlog", "todo", "doing", "review", "done"]


class CardIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    owner: str = Field(min_length=2, max_length=80)
    type: str = Field(default="Feature", max_length=40)
    priority: Literal["Alta", "Media", "Baixa"] = "Media"


class Card(CardIn):
    id: UUID
    column: ColumnId
    created_at: datetime


class Transition(BaseModel):
    id: UUID
    card_id: UUID
    from_column: ColumnId | None
    to_column: ColumnId
    moved_at: datetime


class MoveCardIn(BaseModel):
    to_column: ColumnId


class Metrics(BaseModel):
    lead_time_days: float
    cycle_time_days: float
    throughput_7d: int
    bottleneck: str


app = FastAPI(title="FlowMetrics API", version="0.1.0")

cards: dict[UUID, Card] = {}
transitions: list[Transition] = []


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "flowmetrics-api"}


@app.get("/cards", response_model=list[Card])
def list_cards() -> list[Card]:
    return list(cards.values())


@app.post("/cards", response_model=Card, status_code=201)
def create_card(payload: CardIn) -> Card:
    now = utcnow()
    card = Card(id=uuid4(), column="backlog", created_at=now, **payload.model_dump())
    cards[card.id] = card
    transitions.append(
        Transition(
            id=uuid4(),
            card_id=card.id,
            from_column=None,
            to_column="backlog",
            moved_at=now,
        )
    )
    return card


@app.post("/cards/{card_id}/move", response_model=Card)
def move_card(card_id: UUID, payload: MoveCardIn) -> Card:
    card = cards.get(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.column == payload.to_column:
        return card

    previous = card.column
    updated = card.model_copy(update={"column": payload.to_column})
    cards[card_id] = updated
    transitions.append(
        Transition(
            id=uuid4(),
            card_id=card_id,
            from_column=previous,
            to_column=payload.to_column,
            moved_at=utcnow(),
        )
    )
    return updated


@app.get("/transitions", response_model=list[Transition])
def list_transitions() -> list[Transition]:
    return sorted(transitions, key=lambda item: item.moved_at, reverse=True)


@app.get("/metrics", response_model=Metrics)
def get_metrics() -> Metrics:
    completed = [card for card in cards.values() if card.column == "done"]
    lead_times = []
    cycle_times = []

    for card in completed:
        done_at = first_transition(card.id, "done")
        started_at = first_transition(card.id, "doing")
        if done_at:
            lead_times.append(days_between(card.created_at, done_at.moved_at))
        if done_at and started_at:
            cycle_times.append(days_between(started_at.moved_at, done_at.moved_at))

    seven_days_ago = (utcnow().timestamp() - 7 * 24 * 60 * 60)
    throughput = sum(
        1
        for card in completed
        if (done := first_transition(card.id, "done"))
        and done.moved_at.timestamp() >= seven_days_ago
    )

    return Metrics(
        lead_time_days=average(lead_times),
        cycle_time_days=average(cycle_times),
        throughput_7d=throughput,
        bottleneck=bottleneck_column(),
    )


def first_transition(card_id: UUID, column: ColumnId) -> Transition | None:
    matches = [
        transition
        for transition in transitions
        if transition.card_id == card_id and transition.to_column == column
    ]
    return sorted(matches, key=lambda item: item.moved_at)[0] if matches else None


def bottleneck_column() -> str:
    active_cards = [card for card in cards.values() if card.column != "done"]
    if not active_cards:
        return "Sem gargalo"

    totals: dict[str, list[float]] = {}
    for card in active_cards:
        last = sorted(
            [transition for transition in transitions if transition.card_id == card.id],
            key=lambda item: item.moved_at,
            reverse=True,
        )[0]
        totals.setdefault(card.column, []).append(days_between(last.moved_at, utcnow()))

    winner = max(totals.items(), key=lambda item: average(item[1]))[0]
    return winner


def average(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


def days_between(start: datetime, end: datetime) -> float:
    return round((end - start).total_seconds() / 86_400, 2)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
