from contextlib import contextmanager
from os import getenv
from urllib.parse import parse_qs, urlparse

from psycopg import Connection, connect
from psycopg.rows import dict_row

from app.config import get_settings


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Produto',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY,
    owner_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    owner TEXT NOT NULL,
    card_type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Alta', 'Media', 'Baixa')),
    column_id TEXT NOT NULL CHECK (column_id IN ('backlog', 'todo', 'doing', 'review', 'done')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS card_transitions (
    id UUID PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    from_column TEXT NULL,
    to_column TEXT NOT NULL CHECK (to_column IN ('backlog', 'todo', 'doing', 'review', 'done')),
    moved_at TIMESTAMPTZ NOT NULL,
    note TEXT NOT NULL DEFAULT 'Transicao registrada'
);

ALTER TABLE cards ADD COLUMN IF NOT EXISTS owner_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_name_idx ON users(name);
CREATE INDEX IF NOT EXISTS cards_owner_idx ON cards(owner_id);
CREATE INDEX IF NOT EXISTS cards_column_idx ON cards(column_id);
CREATE INDEX IF NOT EXISTS card_transitions_card_time_idx ON card_transitions(card_id, moved_at);
CREATE INDEX IF NOT EXISTS card_transitions_to_time_idx ON card_transitions(to_column, moved_at);
"""


class DatabaseUnavailable(RuntimeError):
    pass


@contextmanager
def get_connection() -> Connection:
    settings = get_settings()
    if getenv("VERCEL") and not settings.has_external_database_url:
        raise DatabaseUnavailable(
            "DATABASE_URL nao configurada na Vercel. Configure uma URL PostgreSQL externa com sslmode=require."
        )

    try:
        conn = connect(settings.database_url, row_factory=dict_row)
    except Exception as exc:
        raise DatabaseUnavailable(
            "Nao foi possivel conectar ao PostgreSQL. Verifique DATABASE_URL, acesso externo e sslmode=require."
        ) from exc

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(SCHEMA_SQL)


def database_diagnostics() -> dict[str, str]:
    settings = get_settings()
    parsed = urlparse(settings.database_url)
    query = parse_qs(parsed.query)
    host = parsed.hostname or "desconhecido"
    port = str(parsed.port or 5432)
    sslmode = query.get("sslmode", ["ausente"])[0]

    if getenv("VERCEL") and not settings.has_external_database_url:
        return {
            "status": "missing",
            "host": host,
            "port": port,
            "sslmode": sslmode,
            "message": "DATABASE_URL nao configurada na Vercel.",
        }

    try:
        with get_connection() as conn:
            conn.execute("SELECT 1").fetchone()
    except DatabaseUnavailable as exc:
        return {
            "status": "unavailable",
            "host": host,
            "port": port,
            "sslmode": sslmode,
            "message": str(exc),
        }

    return {
        "status": "connected",
        "host": host,
        "port": port,
        "sslmode": sslmode,
        "message": "PostgreSQL conectado.",
    }
