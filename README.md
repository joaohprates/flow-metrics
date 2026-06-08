# FlowMetrics

MVP pratico para o trabalho do 2o bimestre de Gerencia de Projetos e Arquitetura de Software.

## Objetivo

A FlowMetrics e uma solucao concorrente ao Trello focada em equipes ageis que precisam de metricas de fluxo sem depender de extensoes externas. O MVP entrega um quadro Kanban com rastreamento automatico de transicoes e calculo de Lead Time, Cycle Time, Throughput e gargalo atual.

## Stack executada

- Frontend: Next.js, React e TypeScript em `apps/web`.
- Backend: FastAPI, Pydantic e Psycopg em `apps/api`.
- Banco de dados: PostgreSQL 16.
- Infraestrutura local: Docker Compose em `infra/docker-compose.yml`.
- Arquitetura interna: rotas HTTP, camada de repositorio e servico puro de metricas.

> Observacao tecnica: o frontend usa `next@16.3.0-canary.44` porque, no momento da validacao, o `npm audit` apontava vulnerabilidade transitiva de PostCSS nas versoes estaveis disponiveis.

## Entregaveis

- `apps/web/`: aplicacao Next.js com dashboard Kanban, metricas e interacoes.
- `apps/api/`: API FastAPI com persistencia PostgreSQL, seed e calculo de metricas.
- `infra/docker-compose.yml`: stack local com `postgres`, `api` e `web`.
- `docs/gantt.md`: diagrama de Gantt em Mermaid.
- `docs/arquitetura.md`: diagrama arquitetural e modelo de dados.
- `docs/stack-real.md`: descricao objetiva da stack implementada.
- `docs/entrega.md`: resumo academico, equipe, foco e resultados.
- `docs/roteiro-apresentacao.md`: fala sugerida para apresentar o trabalho.
- `docs/checklist-entrega.md`: conferencia dos itens obrigatorios.
- `presentation/FlowMetrics-MVP-2o-Bimestre.pptx`: apresentacao final.
- `mvp/`: versao estatica legada, mantida apenas como fallback de demonstracao.

## Como executar com Docker

Instale as dependencias do workspace:

```powershell
npm install
```

Suba a stack completa:

```powershell
npm run stack:up
```

Acesse:

```text
http://localhost:3000
```

API:

```text
http://localhost:8000/health
```

Para encerrar:

```powershell
npm run stack:down
```

## Como executar em modo desenvolvimento

Suba apenas o banco:

```powershell
npm run db:up
```

Instale e rode a API:

```powershell
.\.venv\Scripts\python.exe -m pip install -r apps\api\requirements.txt
$env:PYTHONPATH='C:\trabal\juliano\apps\api'
$env:DATABASE_URL='postgresql://flowmetrics:flowmetrics@127.0.0.1:5432/flowmetrics'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Em outro terminal, rode o frontend:

```powershell
npm run dev:web
```

## Funcionalidades implementadas

- Quadro Kanban com cinco colunas: Backlog, A Fazer, Em Progresso, Revisao e Concluido.
- Drag-and-drop de cards entre colunas no frontend.
- Criacao de novos cards via API.
- Persistencia real em PostgreSQL.
- Registro automatico de timestamp a cada transicao.
- Historico de auditoria vindo da tabela `card_transitions`.
- Calculo de Lead Time medio.
- Calculo de Cycle Time medio.
- Throughput dos ultimos 7 dias.
- Identificacao de gargalo por permanencia media.
- Grafico de tempo medio por coluna.
- Filtro por responsavel e abertura de detalhes do card.

## Validacao

```powershell
npm --workspace apps/web run build
$env:PYTHONPATH='C:\trabal\juliano\apps\api'
.\.venv\Scripts\python.exe -m pytest apps\api\tests -q
npm audit --json
```

## Ordem sugerida para apresentacao

1. Apresentar `presentation/FlowMetrics-MVP-2o-Bimestre.pptx`.
2. Abrir `http://localhost:3000`.
3. Demonstrar criacao de card, movimentacao entre colunas e auditoria.
4. Mostrar que os dados persistem no PostgreSQL por meio da API FastAPI.
5. Usar `docs/gantt.md` e `docs/arquitetura.md` como apoio caso o professor queira ver os diagramas em texto.
