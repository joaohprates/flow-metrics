from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


ColumnId = Literal["backlog", "todo", "doing", "review", "done"]
Priority = Literal["Alta", "Media", "Baixa"]


class CardCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    owner: str = Field(min_length=2, max_length=80)
    card_type: str = Field(default="Feature", min_length=2, max_length=40)
    priority: Priority = "Media"


class CardOut(BaseModel):
    id: UUID
    title: str
    owner: str
    card_type: str
    priority: Priority
    column_id: ColumnId
    created_at: datetime
    updated_at: datetime


class CardMove(BaseModel):
    to_column: ColumnId


class TransitionOut(BaseModel):
    id: UUID
    card_id: UUID
    from_column: ColumnId | None
    to_column: ColumnId
    moved_at: datetime
    note: str
    card_title: str | None = None


class ColumnMetric(BaseModel):
    column_id: ColumnId
    column_name: str
    average_days: float
    active_cards: int


class MetricsOut(BaseModel):
    lead_time_days: float
    cycle_time_days: float
    throughput_7d: int
    bottleneck_column: str
    bottleneck_days: float
    column_metrics: list[ColumnMetric]


class BoardOut(BaseModel):
    cards: list[CardOut]
    transitions: list[TransitionOut]
    metrics: MetricsOut
