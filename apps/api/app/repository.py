from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from app.db import get_connection
from app.metrics import calculate_metrics
from app.models import CardCreate, CardMove, CardUpdate, UserCreate, UserUpdate


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def list_cards() -> list[dict[str, Any]]:
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT
                c.*,
                COALESCE(u.name, c.owner) AS owner,
                p.title AS parent_title,
                (
                    SELECT COUNT(*)::int
                    FROM cards children
                    WHERE children.parent_card_id = c.id
                ) AS child_count
            FROM cards c
            LEFT JOIN users u ON u.id = c.owner_id
            LEFT JOIN cards p ON p.id = c.parent_card_id
            ORDER BY COALESCE(p.created_at, c.created_at) DESC, c.parent_card_id NULLS FIRST, c.created_at DESC
            """
        ).fetchall()


def list_users() -> list[dict[str, Any]]:
    with get_connection() as conn:
        return conn.execute("SELECT * FROM users ORDER BY active DESC, name ASC").fetchall()


def create_user(payload: UserCreate) -> dict[str, Any]:
    now = utcnow()
    with get_connection() as conn:
        existing = conn.execute("SELECT * FROM users WHERE lower(name) = lower(%s)", (payload.name,)).fetchone()
        if existing:
            return conn.execute(
                """
                UPDATE users
                SET role = %s, active = TRUE, updated_at = %s
                WHERE id = %s
                RETURNING *
                """,
                (payload.role, now, existing["id"]),
            ).fetchone()

        return conn.execute(
            """
            INSERT INTO users (id, name, role, active, created_at, updated_at)
            VALUES (%s, %s, %s, TRUE, %s, %s)
            RETURNING *
            """,
            (uuid4(), payload.name, payload.role, now, now),
        ).fetchone()


def update_user(user_id: UUID, payload: UserUpdate) -> dict[str, Any] | None:
    changes = {key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None}
    if not changes:
        with get_connection() as conn:
            return conn.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()

    now = utcnow()
    with get_connection() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = %s FOR UPDATE", (user_id,)).fetchone()
        if not user:
            return None

        fields = [f"{key} = %s" for key in changes]
        values = list(changes.values())
        values.extend([now, user_id])
        updated = conn.execute(
            f"""
            UPDATE users
            SET {", ".join(fields)}, updated_at = %s
            WHERE id = %s
            RETURNING *
            """,
            values,
        ).fetchone()

        if "name" in changes:
            conn.execute(
                "UPDATE cards SET owner = %s, updated_at = %s WHERE owner_id = %s",
                (changes["name"], now, user_id),
            )
        return updated


def delete_user(user_id: UUID) -> bool:
    now = utcnow()
    with get_connection() as conn:
        deleted = conn.execute(
            """
            UPDATE users
            SET active = FALSE, updated_at = %s
            WHERE id = %s
            RETURNING id
            """,
            (now, user_id),
        ).fetchone()
        return deleted is not None


def list_transitions(limit: int = 50) -> list[dict[str, Any]]:
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT t.*, c.title AS card_title
            FROM card_transitions t
            LEFT JOIN cards c ON c.id = t.card_id
            ORDER BY t.moved_at DESC
            LIMIT %s
            """,
            (limit,),
        ).fetchall()


def create_card(payload: CardCreate) -> dict[str, Any]:
    card_id = uuid4()
    transition_id = uuid4()
    now = utcnow()

    with get_connection() as conn:
        owner_id, owner_name = resolve_owner(conn, payload.owner_id, payload.owner)
        parent_card_id = resolve_parent_card(conn, payload.parent_card_id)
        card = conn.execute(
            """
            INSERT INTO cards (id, parent_card_id, owner_id, title, owner, card_type, priority, column_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'backlog', %s, %s)
            RETURNING *
            """,
            (
                card_id,
                parent_card_id,
                owner_id,
                payload.title,
                owner_name,
                payload.card_type,
                payload.priority,
                now,
                now,
            ),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO card_transitions (id, card_id, from_column, to_column, moved_at, note)
            VALUES (%s, %s, NULL, 'backlog', %s, 'Card criado')
            """,
            (transition_id, card_id, now),
        )
        return card


def move_card(card_id: UUID, payload: CardMove) -> dict[str, Any] | None:
    now = utcnow()
    with get_connection() as conn:
        card = conn.execute("SELECT * FROM cards WHERE id = %s FOR UPDATE", (card_id,)).fetchone()
        if not card:
            return None
        if card["column_id"] == payload.to_column:
            return card

        updated = conn.execute(
            """
            UPDATE cards
            SET column_id = %s, updated_at = %s
            WHERE id = %s
            RETURNING *
            """,
            (payload.to_column, now, card_id),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO card_transitions (id, card_id, from_column, to_column, moved_at, note)
            VALUES (%s, %s, %s, %s, %s, 'Movido via quadro Kanban')
            """,
            (uuid4(), card_id, card["column_id"], payload.to_column, now),
        )
        return updated


def update_card(card_id: UUID, payload: CardUpdate) -> dict[str, Any] | None:
    raw_changes = payload.model_dump(exclude_unset=True)
    owner_id = raw_changes.pop("owner_id", None)
    owner_name = raw_changes.pop("owner", None)
    parent_marker = object()
    parent_card_id = raw_changes.pop("parent_card_id", parent_marker)
    changes = {key: value for key, value in raw_changes.items() if value is not None}
    now = utcnow()

    with get_connection() as conn:
        card = conn.execute("SELECT * FROM cards WHERE id = %s FOR UPDATE", (card_id,)).fetchone()
        if not card:
            return None

        if owner_id is not None or owner_name is not None:
            resolved_id, resolved_name = resolve_owner(conn, owner_id, owner_name)
            changes["owner_id"] = resolved_id
            changes["owner"] = resolved_name

        if parent_card_id is not parent_marker:
            changes["parent_card_id"] = resolve_parent_card(conn, parent_card_id, current_card_id=card_id)

        if not changes:
            return card

        fields = [f"{key} = %s" for key in changes]
        values = list(changes.values())
        values.extend([now, card_id])
        updated = conn.execute(
            f"""
            UPDATE cards
            SET {", ".join(fields)}, updated_at = %s
            WHERE id = %s
            RETURNING *
            """,
            values,
        ).fetchone()

        next_column = changes.get("column_id")
        if next_column and next_column != card["column_id"]:
            conn.execute(
                """
                INSERT INTO card_transitions (id, card_id, from_column, to_column, moved_at, note)
                VALUES (%s, %s, %s, %s, %s, 'Status atualizado via CRUD')
                """,
                (uuid4(), card_id, card["column_id"], next_column, now),
            )
        return updated


def delete_card(card_id: UUID) -> bool:
    with get_connection() as conn:
        deleted = conn.execute("DELETE FROM cards WHERE id = %s RETURNING id", (card_id,)).fetchone()
        return deleted is not None


def resolve_parent_card(conn: Any, parent_card_id: UUID | None, current_card_id: UUID | None = None) -> UUID | None:
    if parent_card_id is None:
        return None

    if current_card_id is not None and parent_card_id == current_card_id:
        raise ValueError("Uma subtask nao pode ser filha dela mesma")
    if current_card_id is not None:
        children = conn.execute(
            "SELECT COUNT(*) AS total FROM cards WHERE parent_card_id = %s",
            (current_card_id,),
        ).fetchone()["total"]
        if children:
            raise ValueError("Cards com subtasks nao podem virar subtasks neste MVP")

    parent = conn.execute("SELECT id, parent_card_id FROM cards WHERE id = %s", (parent_card_id,)).fetchone()
    if not parent:
        raise ValueError("Card pai nao encontrado")
    if parent["parent_card_id"] is not None:
        raise ValueError("Subtasks nao podem ter subtasks filhas neste MVP")
    return parent["id"]


def get_board() -> dict[str, Any]:
    cards = list_cards()
    users = list_users()
    transitions = list_transitions(limit=100)
    metrics = calculate_metrics(cards, list_all_transitions())
    return {"cards": cards, "users": users, "transitions": transitions, "metrics": metrics}


def get_metrics() -> dict[str, Any]:
    return calculate_metrics(list_cards(), list_all_transitions())


def list_all_transitions() -> list[dict[str, Any]]:
    with get_connection() as conn:
        return conn.execute("SELECT * FROM card_transitions ORDER BY moved_at ASC").fetchall()


def seed_if_empty() -> None:
    with get_connection() as conn:
        ensure_users_from_cards(conn)
        count = conn.execute("SELECT COUNT(*) AS total FROM cards").fetchone()["total"]
        if count:
            return

    specs = [
        ("Instrumentar transicoes dos cards", "Thalys", "Feature", "Alta", [("backlog", 14), ("todo", 11), ("doing", 8), ("review", 5), ("done", 3)]),
        ("Dashboard Lead Time e Cycle Time", "Joao", "Feature", "Alta", [("backlog", 10), ("todo", 8), ("doing", 5), ("review", 1)]),
        ("Pipeline Railway via GitHub Actions", "Lucas", "Infra", "Media", [("backlog", 7), ("todo", 6), ("doing", 2)]),
        ("Teste dos criterios de aceite do Kanban", "Gustavo", "QA", "Media", [("backlog", 5), ("todo", 3)]),
        ("Jornada de criacao de card", "Melissa", "UX", "Baixa", [("backlog", 4)]),
        ("Modelo PostgreSQL de auditoria", "Joao", "Infra", "Alta", [("backlog", 16), ("todo", 14), ("doing", 12), ("review", 8), ("done", 6)]),
    ]

    with get_connection() as conn:
        owner_ids = ensure_users(conn, sorted({owner for _, owner, _, _, _ in specs}))
        created_cards: dict[str, UUID] = {}
        for title, owner, card_type, priority, transitions in specs:
            card_id = uuid4()
            created_cards[title] = card_id
            created_at = days_ago(transitions[0][1])
            current_column = transitions[-1][0]
            conn.execute(
                """
                INSERT INTO cards (id, owner_id, title, owner, card_type, priority, column_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    card_id,
                    owner_ids[owner],
                    title,
                    owner,
                    card_type,
                    priority,
                    current_column,
                    created_at,
                    days_ago(transitions[-1][1]),
                ),
            )
            previous = None
            for column_id, days in transitions:
                conn.execute(
                    """
                    INSERT INTO card_transitions (id, card_id, from_column, to_column, moved_at, note)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        uuid4(),
                        card_id,
                        previous,
                        column_id,
                        days_ago(days),
                        "Card criado" if previous is None else "Transicao de seed",
                    ),
                )
                previous = column_id

        subtask_specs = [
            (
                "Registrar evento ao soltar card na coluna",
                "Instrumentar transicoes dos cards",
                "Thalys",
                "Subtask",
                "Alta",
                [("backlog", 13), ("todo", 10), ("doing", 7), ("review", 4), ("done", 2)],
            ),
            (
                "Validar ordem cronologica das transicoes",
                "Instrumentar transicoes dos cards",
                "Gustavo",
                "Subtask",
                "Media",
                [("backlog", 11), ("todo", 8), ("doing", 5)],
            ),
            (
                "Adicionar seletor de responsavel no formulario",
                "Jornada de criacao de card",
                "Melissa",
                "Subtask",
                "Baixa",
                [("backlog", 3), ("todo", 2)],
            ),
        ]

        for title, parent_title, owner, card_type, priority, transitions in subtask_specs:
            parent_id = created_cards[parent_title]
            card_id = uuid4()
            created_at = days_ago(transitions[0][1])
            current_column = transitions[-1][0]
            conn.execute(
                """
                INSERT INTO cards (id, parent_card_id, owner_id, title, owner, card_type, priority, column_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    card_id,
                    parent_id,
                    owner_ids[owner],
                    title,
                    owner,
                    card_type,
                    priority,
                    current_column,
                    created_at,
                    days_ago(transitions[-1][1]),
                ),
            )
            previous = None
            for column_id, days in transitions:
                conn.execute(
                    """
                    INSERT INTO card_transitions (id, card_id, from_column, to_column, moved_at, note)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        uuid4(),
                        card_id,
                        previous,
                        column_id,
                        days_ago(days),
                        "Subtask criada" if previous is None else "Transicao de seed",
                    ),
                )
                previous = column_id


def days_ago(days: int) -> datetime:
    base = utcnow() - timedelta(days=days)
    return base.replace(hour=10 + (days % 7), minute=15, second=0, microsecond=0)


def resolve_owner(conn: Any, owner_id: UUID | None, owner_name: str | None) -> tuple[UUID, str]:
    if owner_id is not None:
        user = conn.execute("SELECT * FROM users WHERE id = %s", (owner_id,)).fetchone()
        if not user:
            raise ValueError("Usuario responsavel nao encontrado")
        if not user["active"]:
            raise ValueError("Usuario responsavel esta inativo")
        return user["id"], user["name"]

    if owner_name:
        users = ensure_users(conn, [owner_name])
        return users[owner_name], owner_name

    raise ValueError("Selecione um usuario responsavel")


def ensure_users(conn: Any, names: list[str]) -> dict[str, UUID]:
    now = utcnow()
    result: dict[str, UUID] = {}
    for name in names:
        normalized = name.strip()
        if not normalized:
            continue
        user = conn.execute("SELECT * FROM users WHERE lower(name) = lower(%s)", (normalized,)).fetchone()
        if not user:
            user = conn.execute(
                """
                INSERT INTO users (id, name, role, active, created_at, updated_at)
                VALUES (%s, %s, 'Produto', TRUE, %s, %s)
                RETURNING *
                """,
                (uuid4(), normalized, now, now),
            ).fetchone()
        result[user["name"]] = user["id"]
        result[normalized] = user["id"]
    return result


def ensure_users_from_cards(conn: Any) -> None:
    rows = conn.execute("SELECT DISTINCT owner FROM cards WHERE owner IS NOT NULL ORDER BY owner").fetchall()
    if not rows:
        return

    ensure_users(conn, [row["owner"] for row in rows])
    conn.execute(
        """
        UPDATE cards c
        SET owner_id = u.id
        FROM users u
        WHERE c.owner_id IS NULL AND lower(c.owner) = lower(u.name)
        """
    )
