# Diagrama de Gantt - FlowMetrics

```mermaid
gantt
    title FlowMetrics - Execucao do MVP
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section Planejamento
    Definicao da proposta e escopo do MVP       :done, p1, 2026-05-01, 2026-05-05
    Backlog inicial e criterios de aceite       :done, p2, 2026-05-06, 2026-05-08

    section UX e Arquitetura
    Jornada do usuario e fluxo Kanban           :done, ux1, 2026-05-09, 2026-05-13
    Diagrama arquitetural C4                    :done, arq1, 2026-05-14, 2026-05-17
    Modelagem de cards e transicoes             :done, arq2, 2026-05-18, 2026-05-21

    section Desenvolvimento
    Interface do quadro Kanban                  :done, dev1, 2026-05-22, 2026-05-27
    Historico de transicoes                     :done, dev2, 2026-05-28, 2026-05-31
    Calculo de Lead Time e Cycle Time           :done, dev3, 2026-06-01, 2026-06-04
    Painel de metricas e gargalos               :done, dev4, 2026-06-05, 2026-06-07

    section Qualidade e Entrega
    Testes funcionais do MVP                    :active, qa1, 2026-06-08, 2026-06-10
    Ajustes visuais e documentacao              :qa2, 2026-06-11, 2026-06-13
    Preparacao da apresentacao                  :qa3, 2026-06-14, 2026-06-16
    Entrega final via Git/E-mail                :milestone, m1, 2026-06-17, 1d
```

## Etapas percorridas

| Etapa | Periodo | Resultado |
| --- | --- | --- |
| Planejamento | Maio, semana 1 | Escopo do MVP e proposta de valor definidos |
| UX e arquitetura | Maio, semanas 2 e 3 | Fluxo do usuario, C4 e modelo de eventos |
| Desenvolvimento | Maio/Junho | Kanban, auditoria e metricas funcionais |
| Qualidade | Junho, semana 2 | Validacao do fluxo, revisao e ajustes |
| Entrega | Junho | Apresentacao, Git/E-mail e demonstracao do MVP |
