# Cadastros a partir da descrição da rotina

Este fluxo complementa o MVP de movimentação de rotinas. Usa `AiRecommendation` com `action=CREATE_PLAN`, `targetType=PLAN` e os itens validados em `changes.items`; não exige nova migração.

## Interface

**Assistente IA → Cadastrar minha rotina**. A descrição e as respostas de esclarecimento são convertidas em proposta revisável. Nenhum registro de trabalho, rotina, meta, lembrete ou imprevisto é criado durante a análise. A aplicação ocorre exclusivamente pelo botão de confirmação.

## Endpoints autenticados

- `POST /api/ai/setup/preview`: recebe `message`, até seis mensagens de `history`, `draft` opcional e `previousProposalId` opcional. Responde com `message`, `questions`, `draft` e `proposal`. Se houver perguntas, a proposta aplicável é nula.
- `POST /api/ai/setup/:id/apply`: aplica uma proposta persistida pendente do próprio usuário. O corpo da requisição não define o plano; os itens são lidos do banco e revalidados.
- `GET /api/ai/recommendations?status=PENDING`: inclui propostas de cadastro e de movimentação; o frontend separa pelo campo `action`.
- `POST /api/ai/recommendations/:id/reject`: descarta uma proposta pendente do próprio usuário.

## Validação e persistência

O provider responde em JSON com `message`, `questions` e `items`. Cada item tem `kind` (`rotinas`, `trabalho`, `metas`, `lembretes` ou `imprevistos`) e `data`. Os contratos reutilizam os schemas dos formulários, incluindo horários, jornadas, pausas, tarefas e sessões.

São recusados IDs e `userId` em registros a criar, horários inválidos, dias fora do intervalo, sobreposições dentro do mesmo cadastro e propostas com nomes repetidos. O ID do usuário é sempre obtido da autenticação.

O fluxo permite até 10 cadastros por proposta e 30 itens por coleção vinculada. Novos trabalhos e rotinas precisam de ao menos um horário. Metas podem ficar sem sessões; os horários não são inferidos da frequência semanal.

Na confirmação, a transação reivindica a proposta com uma atualização condicional de `PENDING` para `APPROVED`. Somente quem obtiver essa atualização pode criar os registros. Toda falha desfaz a atualização e as criações. Os IDs criados ficam em `result.created`, e `executedAt` é registrado. Propostas já aplicadas não podem ser reaplicadas. Nomes existentes na mesma categoria são recusados sem sobrescrita.

Correções substituem a proposta anterior por uma nova pendente; a anterior fica `REJECTED`. Esclarecimentos incompletos ficam apenas na sessão do painel. Propostas completas podem ser recuperadas do banco ao reabrir a interface.

O modelo recebe a descrição, as últimas seis mensagens e até 30 nomes existentes por categoria para reduzir duplicações. Não recebe senhas nem a chave do provedor no conteúdo da conversa. A revisão da proposta deve conferir os dados extraídos: validação de formato não garante interpretação perfeita da linguagem natural.

## Testes

```bash
npx vitest run tests/integration/ai/ai-setup.integration.test.js
```

Os testes simulam o provider sem chamadas externas, usam usuários próprios no banco de testes e validam esclarecimentos, revisão antes da criação, propriedade, aplicação única, rollback do lote, correções, horários inválidos e criação das entidades vinculadas.

### Recuperação de respostas fora do formato

A leitura aceita JSON puro ou envolvido por texto e cercas de código, preservando o conteúdo dos campos. Se o contrato ainda for inválido, o backend solicita uma correção de formato ao provedor uma única vez. As validações dos cadastros continuam obrigatórias; o sistema não completa horários desconhecidos para forçar a aprovação. Se ambas as respostas falharem, a descrição fica preservada no frontend e nenhum cadastro é criado.

Se a proposta continuar inválida após a correção automática, o assistente oferece organizar os dados por etapas e mantém a descrição no histórico da sessão. Esse caso não cria registros e retorna uma pergunta de continuação. Erros de conexão com o provedor usam 503; limites usam 429; campos inválidos enviados pelo cliente usam 400. Falhas são registradas com categoria e status, sem gravar a descrição ou a chave da API nos logs.

## Modelo dedicado e limites do planejamento

`OPENROUTER_SETUP_MODEL` permite usar um modelo diferente do chat para preparar os cadastros. Se estiver vazio, o fluxo usa `OPENROUTER_MODEL`. O Docker repassa ambas as configurações. `OPENROUTER_SETUP_REASONING` é opcional e só deve ser definido para valores aceitos pelo modelo escolhido; alguns modelos gratuitos exigem raciocínio e rejeitam `none`.

Atividades flexíveis podem receber horários sugeridos, identificados em `changes.assumptions` e exibidos na revisão. A validação compara intervalos entre os registros da proposta, respeitando as pausas de trabalho informadas. Isso não verifica automaticamente todos os compromissos que já existam fora da proposta.

Os testes reais com modelos gratuitos apresentaram respostas truncadas, estruturas inválidas e indisponibilidade. Passar nos testes de contrato com provider simulado não garante que um modelo gratuito produza um plano complexo válido em toda chamada. O fluxo preserva a revisão e não salva resultados inválidos.

## Caminho local para descrições de rotina

`localSchedule.service.js` reconhece alguns formatos portugueses de dias, listas e intervalos de horário. Quando a descrição contém compromissos reconhecíveis e solicita encaixe de atividades, `proposeSetup` usa esse caminho antes do provedor. A proposta é validada pelos mesmos schemas e pelo detector de sobreposições, persistida como `CREATE_PLAN/PENDING` e aplicada somente na confirmação.

O cálculo considera os intervalos fixos extraídos e os horários e sessões existentes do usuário. Os nomes já existentes na categoria são omitidos do novo lote, preservando esses registros. O sistema usa preferências iniciais explícitas e uma busca de janelas em passos de 15 minutos; não é um otimizador global nem interpreta qualquer frase natural.

Testes:

```bash
npx vitest run tests/unit/services/localSchedule.service.test.js tests/integration/ai/ai-setup.integration.test.js
```
