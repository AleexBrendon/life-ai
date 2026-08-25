# MVP de recomendações de IA

O MVP transforma a saída da IA em uma recomendação persistida e exige aprovação explícita do usuário antes de alterar sua agenda.

## Fluxo

1. O cliente solicita uma recomendação para uma data.
2. A aplicação monta o contexto, chama o provider, valida a decisão e verifica conflitos.
3. Uma recomendação de movimentação de rotina é armazenada com status `PENDING`.
4. O usuário aprova ou recusa a recomendação.
5. Na aprovação, a aplicação cria ou atualiza uma `RoutineExecution` para aquela data com o novo intervalo de horário.

O `RoutineSchedule` recorrente não é alterado. Assim, um ajuste sugerido para um dia específico não modifica as próximas ocorrências da rotina.

## Endpoints

### Gerar recomendação

`POST /api/ai/recommendations`

```json
{
  "date": "2026-08-23"
}
```

Se não houver ação, responde `200` com `recommendation: null`. Para uma ação suportada, responde `201` com a recomendação em estado `PENDING`.

### Listar recomendações

`GET /api/ai/recommendations?status=PENDING`

O filtro `status` aceita `PENDING`, `APPROVED` e `REJECTED`.

### Aprovar recomendação

`POST /api/ai/recommendations/:id/approve`

Aprova e executa a recomendação em uma transação. A resposta inclui a recomendação aprovada e o resultado da execução.

### Recusar recomendação

`POST /api/ai/recommendations/:id/reject`

Altera uma recomendação pendente para `REJECTED`, sem modificar a agenda.

Todos os endpoints exigem autenticação Bearer e só acessam recomendações do próprio usuário.

## Escopo atual

São executáveis apenas `MOVE_ROUTINE` e `RESCHEDULE_ROUTINE`. Ações como criar lembrete, criar evento ou pular rotina continuam bloqueadas para execução automática.

## Testes

O cenário E2E simula o provider de IA e verifica que a recomendação permanece pendente até ser aprovada, que a execução pontual recebe o novo horário e que o agendamento recorrente mantém o horário original.

```bash
npx vitest run tests/e2e/lifeai-complete-flow.e2e.test.js
```
