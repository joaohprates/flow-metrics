# Stack real executada

Esta versao substitui o MVP estatico inicial por uma entrega alinhada ao PDF do primeiro bimestre.

## Frontend

- Next.js 16.3.0-canary.44
- React 19
- TypeScript
- App Router
- Client component para Kanban, drag-and-drop e criacao de cards
- Versao canary escolhida porque o audit do npm apontou vulnerabilidade transitiva de PostCSS nas versoes estaveis disponiveis no momento da validacao.

## Backend

- FastAPI
- Pydantic
- Psycopg 3
- Camadas separadas em `config`, `db`, `models`, `repository`, `metrics` e `main`

## Banco de dados

- PostgreSQL 16
- Tabela `cards`
- Tabela `card_transitions`
- Indices para coluna atual e historico por card

## Infraestrutura

- Docker Compose
- Servicos: `postgres`, `api`, `web`
- Healthcheck no PostgreSQL
- Seed automatico no startup da API

## Fluxo funcional

1. O usuario acessa o Next.js em `http://localhost:3000`.
2. O frontend chama a API FastAPI em `http://127.0.0.1:8000`.
3. A API le e grava no PostgreSQL.
4. Cada movimento de card cria uma linha em `card_transitions`.
5. O servico de metricas calcula Lead Time, Cycle Time, Throughput e gargalo.

## Endpoints principais

- `GET /health`
- `GET /api/board`
- `GET /api/cards`
- `POST /api/cards`
- `PATCH /api/cards/{card_id}/move`
- `GET /api/transitions`
- `GET /api/metrics`
