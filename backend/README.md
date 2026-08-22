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
