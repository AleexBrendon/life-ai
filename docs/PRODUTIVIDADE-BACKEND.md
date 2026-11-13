# Busca, histórico e reagendamento — primeira entrega de backend

Esta entrega fornece APIs autenticadas. A navegação visual de busca/histórico e os botões de reagendamento ainda precisam ser integrados ao frontend. As telas atuais continuam funcionando; alterações feitas nelas pelos endpoints cobertos passam a gerar histórico.

## Banco e publicação

A migração `20261114120000_productivity_backend` adiciona `ChangeEvent` e `ScheduleChangePreview`, com índices por usuário e remoção em cascata ao excluir a conta. Não altera dados existentes. O deploy da API já usa `prisma generate && prisma migrate deploy` antes de iniciar o servidor. Não há novas chaves ou variáveis de ambiente.

Para desenvolvimento: executar `npx prisma migrate deploy` e `npx prisma generate` em `backend`, apontando para o banco de desenvolvimento. Os testes usam PostgreSQL isolado em memória e não precisam do banco local ou de produção.

## Contrato HTTP

Base: `/api/productivity`. Todas as rotas exigem `Authorization: Bearer <token>`. Respostas seguem `{ success, data }`; erros retornam `{ success: false, message }`.

| Método e rota | Uso |
|---|---|
| `GET /search?q=leitura&limit=20&offset=0` | Busca paginada |
| `GET /history?limit=20&beforeId=123` | Histórico com cursor decrescente |
| `GET /history/:id` | Antes/depois da alteração |
| `POST /history/:id/undo` com `{}` | Desfazer uma ação compatível |
| `POST /reschedule/preview` | Gerar prévia, conflitos e sugestões |
| `POST /reschedule/:id/apply` com `{ "allowConflicts": false }` | Confirmar uma prévia |

### Busca global

- Pesquisa literal, sem distinção entre maiúsculas/minúsculas, em rotinas, metas, trabalhos, tarefas, lembretes, imprevistos, planejamento financeiro e contas. A busca não remove acentos.
- `q`: 2–100 caracteres; `limit`: 1–50; `offset`: 0–5000.
- `kind` opcional: `rotinas`, `metas`, `trabalho`, `tarefas`, `lembretes`, `imprevistos` ou `financas`.
- Retorna `items`, `hasMore` e `nextOffset`. Cada item tem `kind`, `type`, `id`, `title`, `excerpt` e `href` para a área correspondente; o link não seleciona automaticamente o cadastro.
- Prioriza títulos que começam com o termo e desempata por tipo/ID. Alterações nos registros entre páginas podem mudar a paginação.
- Consulta SQL parametrizada; `%`, `_` e barras são tratados literalmente. Cada ramo limita os registros ao usuário antes da busca. Tarefas são limitadas pelo proprietário do trabalho. Não pesquisa credenciais, assinaturas push ou URLs privadas de calendários.

### Histórico e desfazer

Cobertura automática:

- Criação, edição e exclusão via `/api/planner/:kind`: registra o cadastro e seus filhos, apenas para consulta. Não oferece recuperação de exclusões nem recriação de relacionamentos apagados.
- Mudanças em `/api/activity-status`, inclusive sincronização offline pelo serviço compartilhado: oferece desfazer do status.
- Reagendamentos confirmados pela nova API: oferece desfazer do horário/data.

Não é uma auditoria universal de todos os endpoints antigos. Operações de finanças, IA, importação, marcos e rotas legadas específicas conservam seus comportamentos/históricos existentes. Não há reconstrução retroativa de alterações anteriores à migração.

Filtros do histórico: `kind` e `sourceId`. Para cadastros, `kind` é o modelo (`routineItem`, `job`, `goal`, `reminder`, `unexpectedEvent`); para ocorrências, usa as áreas (`rotinas`, `trabalho`, `lembretes`, `metas`, `imprevistos`). IDs de rotina/trabalho em ocorrências são IDs de horários, não de cadastros. A lista traz metadados; os detalhes contêm os snapshots. O histórico também integra a exportação JSON da conta.

O desfazer é transacional, limitado à última ação registrada naquele alvo e validado contra o estado atual. Se houver mudança posterior, remoção ou conflito, retorna `409`. Não há desfazer em cadeia de eventos anteriores. Uma repetição da mesma solicitação já concluída retorna `alreadyUndone: true`. Reabrir uma sessão que já comprova progresso de um marco exige revisão do marco. Desfazer reagendamento exige que o horário anterior ainda seja futuro e esteja livre.

### Reagendamento

Exemplo de corpo para prévia:

```json
{
  "kind": "metas",
  "sourceId": 42,
  "date": "2030-01-07",
  "toDate": "2030-01-08",
  "startTime": "14:00",
  "endTime": "15:00"
}
```

- `sourceId` referencia o horário da rotina, a sessão da meta, o imprevisto ou o lembrete.
- Somente atividades pendentes. Datas/horários representam o fuso do perfil, usando as mesmas convenções da agenda existente. Escolha um horário futuro, até 30/12/2099.
- Rotinas: ajusta apenas a ocorrência na mesma data, preservando o modelo semanal.
- Sessões de metas e imprevistos: permite mudar data e intervalo.
- Lembretes avulsos (`NONE`): permite mudar data/horário; usar `startTime === endTime`. Lembretes com registros de execução não mudam de data por esta API.
- Não move jornadas de trabalho nem séries recorrentes de lembretes. Para isso, usar o planejamento da série. Imprevistos com registros de execução nas datas envolvidas também exigem revisão do cadastro antes de mudar a data.
- Detecta conflitos com agenda do dia e dias vizinhos, incluindo preparo/deslocamento. Considera pausas de trabalho; ignora ocorrências puladas/não realizadas. Um lembrete pontual ocupa um minuto. Limites que apenas se encostam não conflitam.
- Sugere até três alternativas no mesmo dia, em incrementos de 15 minutos, entre 07h e 23h. As sugestões não geram outras prévias: envie a opção escolhida em nova solicitação de prévia.
- A prévia não altera a agenda nem gera notificação de cadastro. Expira em dez minutos; limite de 30 prévias pendentes por usuário.
- A confirmação recalcula a agenda e compara a impressão digital da prévia dentro de uma transação serializável. Mudanças posteriores exigem nova prévia, mesmo quando `allowConflicts` é `true`.
- Conflitos apresentados podem ser aceitos explicitamente com `allowConflicts: true`. Essa aceitação não aprova alterações posteriores e não move outros compromissos.
- Repetir a confirmação de uma prévia já aplicada não reaplica a alteração. Prévias expiradas são removidas gradualmente ao criar novas prévias; essa idempotência depende de sua retenção.

## Verificação

Executar em `backend`: `npm run test:productivity`, `npm run test:unit`, `npm run test:backend`, `npm run test:evolution` e `npm run test:database`.

Os testes novos aplicam todas as migrações em PostgreSQL isolado e usam o Prisma real. Cobrem busca/paginação, termos literais e tentativa de SQL injection, autenticação, separação entre contas, histórico do planejamento, falha de auditoria com rollback, desfazer, conflitos, preparo, expiração, prévia desatualizada, preservação de séries e repetição de confirmação.
