from uuid import UUID

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.models import (
    BoardOut,
    CardCreate,
    CardMove,
    CardOut,
    CardUpdate,
    MetricsOut,
    TransitionOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.repository import (
    create_card,
    create_user,
    delete_card,
    delete_user,
    get_board,
    get_metrics,
    list_users,
    list_cards,
    list_transitions,
    move_card,
    seed_if_empty,
    update_card,
    update_user,
)


settings = get_settings()

app = FastAPI(
    title="FlowMetrics API",
    version="1.0.0",
    description="API FastAPI para Kanban com metricas ageis nativas.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    seed_if_empty()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "flowmetrics-api"}


@app.get("/api/board", response_model=BoardOut)
def board() -> dict:
    return get_board()


@app.get("/api/cards", response_model=list[CardOut])
def cards() -> list[dict]:
    return list_cards()


@app.post("/api/cards", response_model=CardOut, status_code=201)
def new_card(payload: CardCreate) -> dict:
    try:
        return create_card(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.patch("/api/cards/{card_id}/move", response_model=CardOut)
def move(card_id: UUID, payload: CardMove) -> dict:
    card = move_card(card_id, payload)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@app.patch("/api/cards/{card_id}", response_model=CardOut)
def update(card_id: UUID, payload: CardUpdate) -> dict:
    try:
        card = update_card(card_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@app.delete("/api/cards/{card_id}", status_code=204)
def delete(card_id: UUID) -> Response:
    if not delete_card(card_id):
        raise HTTPException(status_code=404, detail="Card not found")
    return Response(status_code=204)


@app.get("/api/transitions", response_model=list[TransitionOut])
def transitions() -> list[dict]:
    return list_transitions()


@app.get("/api/users", response_model=list[UserOut])
def users() -> list[dict]:
    return list_users()


@app.post("/api/users", response_model=UserOut, status_code=201)
def new_user(payload: UserCreate) -> dict:
    return create_user(payload)


@app.patch("/api/users/{user_id}", response_model=UserOut)
def patch_user(user_id: UUID, payload: UserUpdate) -> dict:
    user = update_user(user_id, payload)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.delete("/api/users/{user_id}", status_code=204)
def remove_user(user_id: UUID) -> Response:
    if not delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return Response(status_code=204)


@app.get("/api/metrics", response_model=MetricsOut)
def metrics() -> dict:
    return get_metrics()
