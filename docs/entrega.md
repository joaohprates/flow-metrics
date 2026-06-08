# FlowMetrics - Entrega do 2o Bimestre

## Equipe e cargos

| Integrante | Cargo | Responsabilidade |
| --- | --- | --- |
| Joao Prates | CTO | Decisoes de arquitetura, padroes tecnicos e modelagem das metricas |
| Melissa Brambilla | Project Manager | Cronograma, backlog, ritos ageis e gestao da equipe |
| Thalys Albino | Tech Lead | Desenvolvimento tecnico e revisao da qualidade do codigo |
| Lucas Santos | DevOps Specialist | Plano de implantacao, infraestrutura em nuvem e CI/CD |
| Gustavo Pastre | QA e UX Lead | Estrategia de testes, qualidade e jornada da funcionalidade |

## Visao do negocio

A FlowMetrics e uma startup de Maringa, PR, criada para atender equipes de desenvolvimento agil e gestores de projeto que usam quadros Kanban, mas ainda dependem de extensoes ou ferramentas de BI para obter metricas de fluxo.

O concorrente de referencia e o Trello. O diferencial da FlowMetrics e entregar Lead Time, Cycle Time, Throughput e gargalos diretamente no fluxo do quadro.

## Ponto focal desenvolvido

Funcionalidade central: Painel Analitico de Metricas Ageis.

O MVP desenvolvido demonstra:

- Criacao e movimentacao de cards em quadro Kanban.
- Captura automatica de timestamps a cada troca de coluna.
- Persistencia real de cards e transicoes em PostgreSQL.
- API FastAPI para leitura do board, criacao de cards, movimentacao e metricas.
- Calculo de Lead Time e Cycle Time a partir do historico real do card.
- Identificacao da coluna com maior permanencia media.
- Auditoria das transicoes realizadas.
- Interface Next.js com painel de indicadores, colunas, grafico e detalhe do card.

## Stack entregue

- Frontend: Next.js, React e TypeScript.
- Backend: FastAPI, Pydantic e Psycopg.
- Banco: PostgreSQL 16.
- Infra local: Docker Compose.
- Qualidade: teste unitario do servico de metricas e build de producao do frontend.

## Resultados obtidos

O resultado ficou alinhado a proposta do primeiro bimestre: a solucao mostra que o quadro Kanban pode gerar metricas automaticamente sem extensoes externas.

Principais contribuicoes:

- A equipe transformou a ideia conceitual em um MVP executavel com stack de produto real.
- A arquitetura separou interface, API, regras de calculo e persistencia.
- O historico de transicoes passou a ser tratado como dado central do produto, nao apenas como log auxiliar.
- A entrega deixa uma base tecnica clara para evoluir autenticacao, permissoes, CI/CD e deploy via Railway.

## Aprendizados

- Metricas ageis dependem de dados historicos confiaveis.
- Um Kanban comum nao basta: o diferencial esta na interpretacao do fluxo.
- A modelagem de eventos de transicao facilita auditoria, relatorios e calculos futuros.
- Separar rotas HTTP, repositorio e servico de metricas ajuda a manter a regra de negocio isolada.
- Para um MVP, o mais importante e provar a funcionalidade central antes de expandir cadastro, permissoes e integracoes.

## Como apresentar

1. Abrir a apresentacao em `presentation/FlowMetrics-MVP-2o-Bimestre.pptx`.
2. Rodar a stack e acessar `http://localhost:3000`.
3. Mover cards entre colunas e mostrar a mudanca imediata nas metricas.
4. Criar um novo card e demonstrar que ele entra no board.
5. Abrir um card e mostrar seu historico de transicoes.
6. Apresentar o Gantt e a arquitetura.
7. Finalizar com resultados obtidos e proximos passos.
