# Banco de dados — primeira entrega incremental

Esta entrega contém oito índices de apoio a chaves estrangeiras e dez restrições
CHECK. Mantém os campos, os tipos, as relações e os contratos atuais da API.
Não converte enums, não normaliza datas e não altera as exclusões em cascata.
A preservação de histórico por vigência depende de mudanças coordenadas no back-end
e permanece para uma próxima entrega.

## Alterações

- Índices em Job.userId, JobTaskEvent.userId, WorkSchedule.jobId,
  RoutineItem.userId, RoutineSchedule.routineItemId,
  RoutineExecution.routineItemId, RoutineExecution.routineScheduleId e
  ReminderExecution.reminderId. Apoiam consultas pelas relações e a verificação
  de referências em exclusões/atualizações; nenhum ganho percentual foi medido.
- Dias da semana de 0 a 6 em jornadas, horários de rotinas e lembretes.
  Lembretes continuam aceitando dia nulo.
- Início da semana limitado a domingo ou segunda, conforme a API atual.
- Consumo de água e valores de contas/ocorrências estritamente positivos.
- Entradas financeiras com valores guardados e mensais não negativos,
  valor guardado até o objetivo e parcelas entre 1 e 360.
- Fim de recorrência financeira igual ou posterior ao primeiro vencimento.
- Intervalos de tempo de tarefas com término igual ou posterior ao início;
  intervalos abertos continuam aceitando término nulo.

As restrições estão no SQL da migração, pois o schema Prisma não representa CHECK.
Devem ser preservadas ao preparar futuras migrações.

## Verificação e aplicação

Na pasta backend:

```powershell
npm run test:database
npm run test:unit
npx prisma validate
npm run db:check-integrity
```

O teste de banco usa PGlite (PostgreSQL em memória), sem ler .env ou acessar
bancos externos. Reexecuta todas as migrações anteriores, aplica a nova migração,
verifica índices, rejeição de escritas inválidas, valores de fronteira,
detecção de incompatibilidades anteriores e rollback em caso de falha.
Isso não substitui medir bloqueios e duração no PostgreSQL do ambiente de destino.

O comando db:check-integrity usa DATABASE_URL do ambiente ou do backend/.env,
em transação somente leitura. Exibe apenas contagens por restrição e retorna:
0 se compatível; 1 se houver incompatibilidade ou falha de conexão.
O banco deve estar atualizado até a migração anterior desta entrega.

Antes da aplicação no destino, verificar backup recuperável, executar o preflight
e programar uma janela compatível com o tamanho das tabelas. Somente com as
contagens zeradas, aplicar pelo procedimento normal:

```powershell
npx prisma migrate status
npx prisma migrate deploy
```

O migrate deploy aplica todas as migrações pendentes: conferir a lista antes de
executá-lo. Esta migração usa transação explícita, limite de espera por bloqueio
de 5 segundos e limite por instrução de 60 segundos. A criação dos índices é
convencional e pode bloquear escritas enquanto executa. Se algum limite for
atingido ou houver registro incompatível, a transação é revertida integralmente.
Não há correção ou remoção automática de registros.

Se o Prisma registrar esta migração como falha, confirmar o rollback, investigar
a causa e então usar prisma migrate resolve --rolled-back com o nome completo
20261113120000_database_integrity_basics antes de tentar novamente. Não marcar
como aplicada sem verificar o banco. Depois de sucesso, uma reversão exige nova
migração revisada; não editar esta migração já aplicada.

## Resultado nesta execução

- Schema Prisma validado e 239 testes unitários existentes aprovados.
- Testes de migração aprovados no PostgreSQL em memória.
- A conexão PostgreSQL configurada recusou acesso (ECONNREFUSED); o Docker local
  também não estava disponível. A migração não foi aplicada ao banco real e o
  preflight dos dados reais permanece pendente.
- Front-end e regras de negócio do back-end não foram alterados nesta etapa.
