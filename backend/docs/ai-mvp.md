# MVP de recomendações de IA

## Reorganização semanal e compras

As novas funções usam `AiRecommendation` com ações `REORGANIZE_WEEK` e `PURCHASE_ADVICE`. Nenhuma sugestão altera cadastros antes da aprovação explícita. A propriedade do registro é validada em todas as rotas.

- `POST /api/ai/week/preview`: recebe `date`, `message` opcional, `unexpectedEventId` opcional e preferências; monta domingo a sábado, gera até três alternativas locais e solicita uma explicação ao modelo gratuito.
- `GET /api/ai/week?date=YYYY-MM-DD`: recupera a proposta pendente da semana.
- `POST /api/ai/week/:id/apply`: recebe `optionId` (`minimal`, `focus` ou `balanced`). Revalida o retrato da agenda, conflitos, propriedade, status e duração; aplica em transação serializável e impede reaplicação. Rotinas usam `RoutineExecution`, preservando o `RoutineSchedule`. Sessões de metas podem mudar dentro do mesmo dia.
- `POST /api/ai/shopping/analyze`: recebe descrição, valores em centavos, juros mensais conhecidos ou `null`, critérios de avaliações e links opcionais. Pesquisa dados públicos e calcula estratégias por até 24 meses.
- `GET /api/ai/shopping`: recupera as últimas dez análises do usuário.
- `POST /api/ai/shopping/:id/apply`: recebe `strategyId` (`cash` ou `installments`), recalcula o orçamento em transação serializável e cria/atualiza apenas o planejamento financeiro.

As análises explicativas usam apenas `openrouter/free` ou modelos com sufixo `:free`, sem plugins pagos de busca. A indisponibilidade do provedor ativa o modo local identificado na resposta. O modelo não define IDs, preços nem horários executáveis: os horários e cálculos são construídos e validados pelo servidor. As explicações são curtas, sem Markdown nem números; respostas que tentam narrar cálculos numéricos são descartadas em favor da explicação local. Rendas fixas do orçamento e das contas usam a maior estimativa, e rendas variáveis confirmadas são somadas separadamente. Contas vencidas do mês já estão na despesa mensal; somente atrasados de meses anteriores são descontados adicionalmente.

Rotinas têm `isFlexible=false` por padrão. Trabalho, rotinas fixas, lembretes e imprevistos não são deslocados. Compromissos fixos conflitantes tornam a alternativa não aplicável. O período padrão é 07:00–23:00, com pausas configuráveis; não há alegação de otimização médica ou matemática global.

Contas e rendas do orçamento têm `isVariable`. Rendas variáveis futuras e recebimentos avulsos não confirmados são excluídos da capacidade de parcelamento. Contas vencidas sem pagamento, compras e reservas existentes reduzem a capacidade. Despesas antigas e contas usam a maior estimativa para evitar somar cadastros duplicados. O dinheiro disponível e as condições do cartão são declarados pelo usuário; não há acesso ao saldo bancário.

A pesquisa usa índices públicos e metadados JSON-LD das páginas comerciais. Só URLs HTTPS de domínios explícitos são aceitas; redirecionamentos também são validados. Há limite de tempo e tamanho da resposta. Textos remotos nunca são tratados como instruções executáveis. Vendas, avaliações, preço em BRL e vendedor oficial ausentes continuam desconhecidos. Não há contorno de CAPTCHA, login ou bloqueios das lojas. Os links de busca direta e o preço informado são o caminho alternativo quando não há dados verificáveis. Reputação da plataforma não deve ser confundida com a de um anúncio ou vendedor: [Mercado Livre — reputação de vendedor](https://www.mercadolivre.com.br/ajuda/reputacao-vendedor-como-funciona_866).

### Testes das novas funções

```bash
npx vitest run tests/integration/ai/ai-mvp.integration.test.js tests/unit/services/weeklyPlanner.service.test.js tests/unit/services/purchaseAdvisor.service.test.js tests/unit/services/shoppingSources.service.test.js
```

Os testes simulam o provider e as lojas, sem enviar dados reais. Cobrem propriedade, aprovação única, alteração concorrente da agenda/orçamento, preservação da recorrência, renda variável, juros, bloqueios das fontes e URLs não permitidas.

## Ajustes pontuais de um dia (fluxo anterior)

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

## Cadastro pela descrição da rotina

Para o fluxo de novos cadastros com revisão e confirmação, consulte [Cadastros a partir da descrição da rotina](ai-setup.md).

## Reavaliação com os cadastros atuais

Cada `POST /api/ai/week/preview` também consulta os cadastros atuais do próprio usuário e inclui `changes.assessment` na proposta. O objeto contém `checkedAt`, contagens e `findings` sobre rotinas/trabalhos sem horários, metas sem sessões na semana selecionada e ausência de rotinas flexíveis. A consulta é refeita a cada geração e não depende do histórico textual do chat. A agenda efetiva da semana continua sendo obtida por `context`, incluindo os status e ajustes pontuais atuais. O fingerprint da agenda continua sendo revalidado na aprovação.

O frontend permite solicitar uma nova geração pelo botão “Sugerir melhorias com dados atuais”. A apresentação diferencia envio, sucesso, falha e proposta aguardando revisão, preserva o texto em falhas e mantém a confirmação após criar cadastros. Os retornos dos modos de análise também exibem uma confirmação de conclusão e são trazidos para a área visível.
