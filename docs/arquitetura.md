# Arquitetura - FlowMetrics MVP

## C4 - Nivel 1: Contexto

```mermaid
flowchart LR
    gestor["Gestor de Projetos"]
    flow["FlowMetrics"]
    auth["Sistema de Autenticacao Externo"]

    gestor -->|"Gerencia tarefas e visualiza Lead Time, Cycle Time e gargalos"| flow
    flow -->|"Autentica usuarios"| auth
```

## C4 - Nivel 2: Containers

```mermaid
flowchart TB
    gestor["Gestor de Projetos"]

    subgraph flowmetrics["FlowMetrics"]
        web["Web App\nNext.js / React"]
        api["API Backend\nFastAPI / Python"]
        service["Metrics Service\nLead Time, Cycle Time, Gargalos"]
        db[("PostgreSQL\nCards, colunas e transicoes")]
    end

    auth["Sistema de Autenticacao Externo"]
    cicd["GitHub Actions"]
    railway["Railway"]

    gestor -->|"Acessa via navegador"| web
    web -->|"JSON / HTTPS"| api
    api -->|"Valida sessao"| auth
    api -->|"Orquestra regras"| service
    service -->|"Le e grava historico"| db
    cicd -->|"Build e deploy"| railway
    railway -->|"Hospeda Web App e API"| flowmetrics
```

## Camadas internas

```mermaid
flowchart LR
    controller["Controllers\nRotas HTTP"]
    service["Services\nRegras de negocio"]
    repository["Repositories\nPersistencia"]
    database[("PostgreSQL")]

    controller --> service
    service --> repository
    repository --> database
```

## Modelo de dados essencial

```mermaid
erDiagram
    USERS ||--o{ BOARDS : owns
    BOARDS ||--o{ COLUMNS : contains
    COLUMNS ||--o{ CARDS : groups
    CARDS ||--o{ CARD_TRANSITIONS : records

    USERS {
        uuid id PK
        string name
        string email
        string role
    }

    BOARDS {
        uuid id PK
        uuid owner_id FK
        string name
        timestamp created_at
    }

    COLUMNS {
        uuid id PK
        uuid board_id FK
        string name
        int position
    }

    CARDS {
        uuid id PK
        uuid board_id FK
        uuid column_id FK
        string title
        string owner_name
        string type
        string priority
        timestamp created_at
        timestamp updated_at
    }

    CARD_TRANSITIONS {
        uuid id PK
        uuid card_id FK
        uuid from_column_id FK
        uuid to_column_id FK
        timestamp moved_at
    }
```

## Decisoes arquiteturais

- O historico de transicoes e a fonte da verdade para metricas de fluxo.
- Lead Time e calculado da criacao do card ate a entrada em Concluido.
- Cycle Time e calculado da entrada em Em Progresso ate a entrada em Concluido.
- Gargalo e calculado pela maior permanencia media por coluna.
- O MVP local usa LocalStorage para demonstracao rapida; em producao, a mesma regra vai para FastAPI + PostgreSQL.
- A separacao Controller / Service / Repository evita que a regra de calculo fique presa na interface.
