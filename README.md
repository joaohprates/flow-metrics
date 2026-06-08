# FlowMetrics

MVP pratico para o trabalho do 2o bimestre de Gerencia de Projetos e Arquitetura de Software.

## Objetivo

A FlowMetrics e uma solucao concorrente ao Trello focada em equipes ageis que precisam de metricas de fluxo sem depender de extensoes externas. O MVP demonstra um quadro Kanban com rastreamento automatico de transicoes e calculo de indicadores como Lead Time, Cycle Time, Throughput e gargalo atual.

## Entregaveis

- `mvp/`: MVP funcional em navegador, sem instalacao.
- `backend/`: contrato de API FastAPI planejado para a arquitetura do MVP.
- `docs/gantt.md`: diagrama de Gantt em Mermaid.
- `docs/arquitetura.md`: diagrama arquitetural C4 nivel 1 e 2 em Mermaid.
- `docs/entrega.md`: resumo para apresentacao, com equipe, foco e resultados.
- `docs/roteiro-apresentacao.md`: fala sugerida para apresentar o trabalho.
- `docs/checklist-entrega.md`: conferencia dos itens obrigatorios.
- `presentation/`: scripts e apresentacao final quando gerada.

## Como executar o MVP

Abra o arquivo:

```text
C:\trabal\juliano\mvp\index.html
```

Tambem e possivel servir localmente:

```powershell
python -m http.server 4173 -d mvp
```

Depois acesse:

```text
http://localhost:4173
```

## Funcionalidades implementadas

- Quadro Kanban com cinco colunas: Backlog, A Fazer, Em Progresso, Revisao e Concluido.
- Drag-and-drop de cards entre colunas.
- Registro automatico de timestamp a cada transicao.
- Calculo de Lead Time medio.
- Calculo de Cycle Time medio.
- Throughput dos ultimos 7 dias.
- Identificacao de gargalo por permanencia media.
- Grafico de tempo medio por coluna.
- Historico de auditoria das ultimas transicoes.
- Criacao de novos cards.
- Filtro por responsavel.
- Exportacao JSON do estado do quadro.
- Persistencia local via LocalStorage.

## Ordem sugerida para entrega

1. Apresentar `presentation/FlowMetrics-MVP-2o-Bimestre.pptx`.
2. Na parte do MVP, abrir `mvp/index.html`.
3. Demonstrar criacao de card, movimentacao entre colunas e auditoria.
4. Usar `docs/gantt.md` e `docs/arquitetura.md` como apoio caso o professor queira ver os diagramas em texto.
5. Usar `docs/roteiro-apresentacao.md` para dividir a fala da equipe.

## Stack prevista na proposta

- Frontend: Next.js / React.
- Backend: FastAPI / Python.
- Banco de dados: PostgreSQL.
- Deploy: GitHub Actions + Railway.

Para viabilizar a demonstracao local sem instalacao, o MVP entregue usa HTML, CSS e JavaScript puros, mas preserva o modelo funcional que seria conectado ao backend FastAPI e ao PostgreSQL descritos nos documentos de arquitetura.
