# Roteiro de apresentacao - FlowMetrics

## Abertura

Boa noite, professor. Nossa startup e a FlowMetrics, uma solucao concorrente ao Trello criada para equipes ageis e gestores que precisam acompanhar metricas reais do fluxo de trabalho sem depender de extensoes externas.

## Slide 1 - FlowMetrics

Apresentar a proposta central:

- O Kanban organiza o trabalho.
- A FlowMetrics mede o tempo do trabalho.
- O diferencial e gerar metricas automaticamente a partir das movimentacoes dos cards.

## Slide 2 - Problema

Explicar a dor:

- Ferramentas como Trello ajudam na visualizacao, mas nao entregam analise de fluxo de forma nativa.
- Equipes acabam usando Power-Ups, planilhas ou BI externo.
- Isso aumenta custo, dispersa dados e dificulta identificar gargalos cedo.

Frase-chave: "O problema nao e saber em qual coluna o card esta, e saber quanto tempo ele esta parado ali."

## Slide 3 - Solucao

Mostrar o raciocinio do produto:

- Cada mudanca de coluna vira um evento de auditoria.
- Esses eventos alimentam Lead Time, Cycle Time e gargalo.
- A metrica nasce do fluxo real, nao de preenchimento manual.

## Slide 4 - MVP

Abrir o MVP em `mvp/index.html` e demonstrar:

1. Cards ja carregados no quadro.
2. Indicadores no topo.
3. Arrastar um card entre colunas.
4. Ver metricas e auditoria atualizando.
5. Criar um novo card.
6. Abrir detalhes de um card para mostrar a timeline.
7. Exportar JSON se quiser evidenciar os dados.

## Slide 5 - Arquitetura

Explicar a separacao:

- Web App: interface do quadro e painel.
- API FastAPI: entrada HTTP e validacao.
- Metrics Service: regras de calculo.
- PostgreSQL: historico de cards e transicoes.
- Autenticacao externa: validacao de usuario.

Frase-chave: "A regra de negocio fica isolada da tela, entao o painel pode evoluir sem quebrar o calculo das metricas."

## Slide 6 - Dados

Enfatizar que o evento `card_transitions` e a fonte da verdade:

- Lead Time: criado em ate concluido.
- Cycle Time: entrou em progresso ate concluido.
- Gargalo: maior permanencia media por coluna.

## Slide 7 - Gantt

Apresentar as etapas:

- Planejamento.
- UX e arquitetura.
- Desenvolvimento.
- QA e documentacao.
- Apresentacao final.

## Slide 8 - Resultados

Fechar com resultado obtido:

- MVP funcional.
- Diagrama arquitetural.
- Gantt.
- Base para evolucao com Next.js, FastAPI, PostgreSQL e Railway.

Frase final:

"O diferencial da FlowMetrics nao e mover cards. E transformar movimento em inteligencia operacional."

## Perguntas provaveis

### Por que nao basta usar Trello?

Porque o Trello e forte como quadro visual, mas a proposta da FlowMetrics e incorporar metricas de fluxo diretamente no produto, sem extensoes externas.

### O MVP esta funcional?

Sim. O MVP permite criar cards, mover entre colunas, registrar transicoes, calcular metricas, mostrar gargalo e exportar os dados.

### Onde entra arquitetura?

Na separacao entre interface, API, servico de metricas e persistencia. Isso permite trocar a tela ou evoluir o banco sem misturar regras de calculo.

### Qual e o principal aprendizado?

Metricas ageis dependem de historico confiavel. Por isso, o evento de transicao e o dado central do produto.
