# Checklist de entrega - Trabalho 2o Bimestre

## Itens obrigatorios do PDF

- [x] MVP minimo produto viavel funcional.
- [x] Diagrama de Gantt com etapas e datas/meses percorridos.
- [x] Diagrama arquitetural da solucao do MVP.
- [x] Nomes dos integrantes e respectivos cargos.
- [x] Ponto focal de trabalho com descricao da funcionalidade central.
- [x] Resultados obtidos, contribuicoes e aprendizados.
- [x] Formato de apresentacao.
- [x] Material pronto para entrega via Git/E-mail.

## Arquivos principais

- `apps/web/`: frontend Next.js, React e TypeScript.
- `apps/api/`: backend FastAPI com camadas de configuracao, banco, modelos, repositorio e metricas.
- `infra/docker-compose.yml`: PostgreSQL, API e Web em ambiente local.
- `docs/stack-real.md`: stack executada e fluxo funcional.
- `docs/entrega.md`: resumo academico completo.
- `docs/gantt.md`: Gantt em Mermaid.
- `docs/arquitetura.md`: arquitetura em Mermaid.
- `docs/roteiro-apresentacao.md`: roteiro de fala.
- `presentation/FlowMetrics-MVP-2o-Bimestre.pptx`: apresentacao final.
- `README.md`: instrucoes de execucao.
- `mvp/`: fallback estatico legado, nao e mais a entrega principal.

## Ordem sugerida para demonstracao

1. Abrir `presentation/FlowMetrics-MVP-2o-Bimestre.pptx`.
2. Apresentar slides 1 a 3.
3. Abrir `http://localhost:3000`.
4. Mover um card no quadro.
5. Mostrar atualizacao de metricas e auditoria.
6. Criar um novo card.
7. Explicar que a transicao foi gravada na API FastAPI e no PostgreSQL.
8. Voltar para os slides finais.
9. Fechar com resultados e proximos passos.

## Comandos principais

```powershell
npm install
npm run stack:up
```

Depois acessar:

```text
http://localhost:3000
```

## Validacoes realizadas

- [x] Build de producao do frontend.
- [x] Teste unitario do servico de metricas.
- [x] `npm audit` sem vulnerabilidades.
