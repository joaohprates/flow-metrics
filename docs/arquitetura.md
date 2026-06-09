# Arquitetura - FlowMetrics MVP

## C4 - Nivel 1: Contexto

```mermaid
flowchart LR
    gestor["Gestor de Projetos"]
    flow["FlowMetrics"]
    auth["Sistema de Autenticacao Externo\n(proxima iteracao)"]

    gestor -->|"Gerencia tarefas e visualiza Lead Time, Cycle Time e gargalos"| flow
    flow -.->|"Validacao de usuario planejada"| auth
```

## C4 - Nivel 2: Containers

```mermaid
flowchart TB
    gestor["Gestor de Projetos"]

    subgraph flowmetrics["FlowMetrics"]
        web["apps/web\nNext.js / React / TypeScript"]
        api["apps/api\nFastAPI / Python"]
        service["Metrics Service\nLead Time, Cycle Time, Throughput, Gargalos"]
        users["Users CRUD\nusuarios responsaveis"]
        repo["Repository\nSQL e persistencia"]
        db[("PostgreSQL 16\nusers, cards e card_transitions")]
    end

    compose["Docker Compose"]
    vercel["Vercel Services\nweb / backend"]
    ci["GitHub Actions\nplanejado"]

    gestor -->|"Acessa via navegador"| web
    web -->|"JSON / HTTP"| api
    api -->|"Gerencia responsaveis"| users
    api -->|"Executa regras"| service
    api -->|"Le e grava dados"| repo
    repo --> db
    compose -->|"Sobe postgres, api e web"| flowmetrics
    vercel -->|"Publica web em / e backend em /_/backend"| flowmetrics
    ci -.->|"Build e testes"| flowmetrics
```

## Camadas internas da API

```mermaid
flowchart LR
    routes["app/main.py\nRotas HTTP"]
    models["app/models.py\nContratos Pydantic"]
    repository["app/repository.py\nPersistencia"]
    metrics["app/metrics.py\nRegras puras de calculo"]
    database[("PostgreSQL")]

    routes --> models
    routes --> repository
    routes --> metrics
    repository --> database
```

## Modelo de dados implementado

```mermaid
erDiagram
    USERS ||--o{ CARDS : owns
    CARDS ||--o{ CARD_TRANSITIONS : records

    USERS {
        uuid id PK
        string name
        string role
        boolean active
        timestamp created_at
        timestamp updated_at
    }

    CARDS {
        uuid id PK
        uuid owner_id FK
        string title
        string owner
        string card_type
        string priority
        string column_id
        timestamp created_at
        timestamp updated_at
    }

    CARD_TRANSITIONS {
        uuid id PK
        uuid card_id FK
        string from_column
        string to_column
        timestamp moved_at
        string note
    }
```

## Decisoes arquiteturais

- O historico de transicoes e a fonte da verdade para metricas de fluxo.
- Usuarios sao gerenciados como entidade propria para evitar responsavel digitado livremente no card.
- Lead Time e calculado da criacao do card ate a entrada em Concluido.
- Cycle Time e calculado da primeira entrada em Em Progresso ate a entrada em Concluido.
- Throughput considera cards concluidos nos ultimos 7 dias.
- Gargalo e calculado pela maior permanencia media por coluna.
- A API separa rotas, modelos, repositorio e calculo de metricas para evitar regra de negocio presa na interface.
- O MVP atual ja usa Next.js, FastAPI e PostgreSQL; a versao estatica em `mvp/` ficou apenas como fallback.
- Autenticacao externa, CI/CD e deploy Railway estao documentados como evolucao natural da proposta original.
