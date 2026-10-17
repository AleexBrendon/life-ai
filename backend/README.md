# Fluxo E2E do LifeAI

O arquivo `lifeai-complete-flow.e2e.test.js` valida a jornada principal de um usuário pela API, usando banco de dados e autenticação reais do ambiente de teste.

## Cobertura

- Cadastro, login, consulta do usuário autenticado, atualização de perfil e logout.
- Criação, consulta, atualização e remoção de trabalho e horário de trabalho.
- Criação, atualização, agendamento, execução e remoção de rotina.
- Criação, atualização, execução concluída e remoção de lembrete.
- Registro e resolução de imprevisto, detecção de conflito com horário de trabalho e decisão de preservar o trabalho.
- Consulta consolidada do calendário e do dashboard.
- Criação, atualização, leitura, filtragem e remoção de notificações.

O teste limpa o banco antes de cada execução e ao final, portanto os dados criados não permanecem no ambiente de testes.

## Execução

No diretório `backend`, com o ambiente de testes configurado:

```bash
npx vitest run tests/e2e/lifeai-complete-flow.e2e.test.js
```

## IA

O fluxo E2E não chama um provider de IA. Atualmente não há uma rota HTTP da aplicação que exponha a orquestração de IA; essa camada é validada pelos testes unitários e de integração em `tests/unit/services/ai*.test.js` e `tests/integration/ai/ai.integration.test.js`.

Para incluí-la em um E2E futuro, é necessário expor um endpoint para a operação e usar um provider simulado, para que o teste permaneça determinístico e não dependa de credenciais, rede ou custos externos.

## Limpeza de comentários

Também foram removidos os comentários de sintaxe dos arquivos JavaScript em `src` e `tests`. A remoção preservou strings e expressões regulares, e não alterou o comportamento executável da aplicação.

## Dados de demonstração

Com PostgreSQL disponível e o schema aplicado, execute no diretório `backend`:

```bash
npm run seed
```

Também disponível por `npx prisma db seed`.

Acesse com `demo@lifeai.com` e senha `LifeAI123!`.
O seed usa a data atual em `America/Sao_Paulo` e cria rotinas para todos os dias, histórico e próximas execuções, trabalho com tarefas, metas com sessões, lembretes, um imprevisto e notificações.
Pode ser executado novamente: preserva registros existentes e não duplica os exemplos para a mesma data. Não redefine atividades que você concluiu durante os testes. Não executa com `NODE_ENV=production`.

## Guia do usuário

Veja [como usar as telas, os formulários, o calendário e o Kanban](../docs/GUIA-DE-USO.md).

O frontend usa `/api/planner/:kind` para salvar os cadastros completos de forma transacional. Recursos: `rotinas`, `metas`, `trabalho`, `lembretes` e `imprevistos`. As listas de horários, tarefas e sessões representam o estado completo do formulário: retirar uma linha e salvar remove o vínculo correspondente.

Validação dos novos fluxos:

```bash
npx vitest run tests/integration/planner/planner.integration.test.js
```

Os testes usam usuários próprios no banco de testes e removem apenas esses usuários ao terminar.

## Tutorial passo a passo

Para aprender usando exemplos, consulte o [Tutorial do sistema](docs/tutorial-do-sistema.md), separado da documentação técnica de IA e do guia de referência.
