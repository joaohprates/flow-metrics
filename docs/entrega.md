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

O concorrente de referencia e o Trello. O diferencial da FlowMetrics e entregar Lead Time, Cycle Time, throughput e gargalos diretamente no fluxo do quadro.

## Ponto focal desenvolvido

Funcionalidade central: Painel Analitico de Metricas Ageis.

O MVP desenvolvido demonstra:

- Criacao e movimentacao de cards em quadro Kanban.
- Captura automatica de timestamps a cada troca de coluna.
- Calculo de Lead Time e Cycle Time a partir do historico real do card.
- Identificacao da coluna com maior permanencia media.
- Auditoria das transicoes realizadas.
- Exportacao JSON dos dados do quadro.

## Resultados obtidos

O resultado foi coerente com a proposta do primeiro bimestre: a solucao mostra que o quadro Kanban pode gerar metricas automaticamente sem extensoes externas.

Principais contribuicoes:

- A equipe conseguiu transformar uma ideia conceitual em um MVP demonstravel.
- A arquitetura separou bem interface, API, regras de calculo e persistencia.
- O historico de transicoes passou a ser tratado como dado central do produto, nao apenas como log auxiliar.
- A entrega gerou base para evoluir para uma aplicacao real com Next.js, FastAPI, PostgreSQL e deploy via Railway.

## Aprendizados

- Metricas ageis dependem de dados historicos confiaveis.
- Um Kanban comum nao basta: o diferencial esta na interpretacao do fluxo.
- A modelagem de eventos de transicao facilita auditoria, relatorios e calculos futuros.
- Separar Controller, Service e Repository ajuda a manter a regra de negocio isolada.
- Para um MVP, o mais importante e provar a funcionalidade central antes de expandir cadastro, permissoes e integracoes.

## Como apresentar

1. Abrir o MVP em `mvp/index.html`.
2. Mover cards entre colunas e mostrar a mudanca imediata nas metricas.
3. Criar um novo card e demonstrar que ele entra no historico.
4. Abrir um card e mostrar sua linha do tempo.
5. Apresentar o Gantt e a arquitetura.
6. Finalizar com resultados obtidos e proximos passos.
