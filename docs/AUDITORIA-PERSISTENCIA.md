# Conferência de persistência dos cadastros

A conferência testa o caminho formulário → API → PostgreSQL → consulta → reabertura do formulário. Os dados usados nos testes pertencem a contas isoladas e são removidos ao finalizar.

| Área | Campos conferidos |
| --- | --- |
| Rotinas | Nome, categoria sugerida ou personalizada, ativo/inativo, permissão de reorganização pela IA, dias e horários |
| Metas | Título, descrição, prazo e remoção do prazo, prioridade, status, frequência, duração, sessões e status das sessões |
| Trabalhos | Nome, empresa, cargo, modalidade, local, ativo/inativo, jornadas, dias, horários e remoção de pausas |
| Tarefas / Kanban | Título, descrição, inclusão, edição, movimentação entre os três status e exclusão |
| Lembretes | Título, descrição, horário, recorrência, data ou dia da semana, ativo/pausado/concluído |
| Imprevistos | Título, descrição, data, intervalo, prioridade e situação |
| Orçamento | Tipo, nome, categoria, valor, renda variável, entrada/valor guardado, reserva mensal e prazo de compra |
| Contas e recebimentos | Categoria, descrição, valor por vencimento, primeira data, repetição e data final; pagamento, adiamento, motivos e histórico |
| Água | Meta, tamanho do copo, intervalo, janela de horários, ativação e inclusão/edição/exclusão do consumo |
| Perfil | Nome, nascimento, ocupação, estado civil, filhos, foto e remoção da foto, fuso, visão da agenda, início da semana e preferências de notificações |

## Regras importantes

- Clique em **Salvar** no formulário: mudar um campo não grava um rascunho automaticamente. Falhas de validação mantêm o modal aberto com o erro.
- **Adicionar vencimento** vincula o registro de renda/despesa à conta agendada. Reabrir esse botão recupera o vencimento salvo. Editar nome, categoria e valor em qualquer um dos dois lados mantém o vínculo sincronizado.
- Um registro vinculado não pode mudar de tipo enquanto tiver a conta agendada. Remova a conta agendada antes de transformar uma despesa em outro tipo de planejamento.
- Contas anteriores à implementação do vínculo continuam independentes e podem ser editadas pelo calendário. Não são vinculadas automaticamente por coincidência de nome.
- Compras e caixinhas representam planejamento e metas de reserva. Não são contas com vencimento.
- Pagamentos já registrados preservam seu valor e histórico. Alterar o valor do cadastro afeta as ocorrências ainda não registradas.
- Concluir ou pular na agenda salva a situação daquela ocorrência; não encerra automaticamente o cadastro recorrente.
- Tema visual é uma preferência local do navegador. O botão de som controla a sessão atual e inicia ligado por padrão. Esses controles não representam campos dos cadastros no banco.
- Filtros, pesquisa e navegação não alteram os registros.

## Correções da conferência

1. A edição do orçamento também atualiza nome, categoria e valor na conta vinculada.
2. Categoria vazia é validada; não é substituída silenciosamente por “Outros” ao salvar o formulário financeiro.
3. A API de edição de rotina também persiste `isFlexible` e `isActive`.
4. Edições parciais de metas preservam frequência, duração e prioridade que não foram enviadas. Status e remoção do prazo também são aceitos nessa API.
5. A API de jornada limpa a pausa anterior quando uma jornada completa é enviada sem pausa.
6. As sugestões de categoria de rotina foram ampliadas sem impedir categorias personalizadas.

## Como repetir a validação

Dentro de `backend`:

```powershell
npx vitest run tests/integration/crudPersistence.integration.test.js tests/integration/planner/planner.integration.test.js tests/integration/financeBills.integration.test.js tests/integration/personalPlanning.integration.test.js tests/integration/profileNotifications.integration.test.js
```

A conferência usa as definições reais dos campos do frontend para montar os cadastros, percorre opções dos selects e compara a reabertura com uma leitura direta do banco. Há também verificações das APIs individuais, limpeza de campos e exclusões. A validação usa `.env.test` e exige o banco de testes preparado.
