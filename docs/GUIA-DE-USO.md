# Guia de uso do LifeAI

O LifeAI reúne rotina, objetivos e trabalho para ajudar você a organizar seu tempo. A navegação principal possui três telas: **Dashboard**, **Minha agenda** e **Planejamento**. Notificações, perfil e conversa com a IA abrem pelos botões do cabeçalho.

## Primeiro acesso

1. Entre com sua conta ou use o cadastro existente.
2. Para explorar com exemplos, no diretório `backend` execute `npm run seed`.
3. A conta de demonstração é `demo@lifeai.com`, com senha `LifeAI123!`.
4. Comece por **Planejamento → Trabalho → Trabalhos e jornadas** para cadastrar seu trabalho. Depois adicione rotinas e metas.

O seed preserva os registros existentes e não duplica os exemplos da mesma data. Ao executá-lo em outro dia, ele acrescenta exemplos para o novo período. Use a conta demo em ambiente de desenvolvimento.

## 1. Dashboard: acompanhar o dia

Mostra um resumo dos dados reais da sua conta:

- Quantas rotinas estão programadas para hoje.
- Quantas execuções de rotinas e lembretes foram concluídas.
- Quantas sessões de metas estão planejadas para hoje.
- Uma lista das primeiras oito atividades do dia, com seus horários.

Clique em **Abrir minha agenda** para ver o calendário completo. Os números não representam o progresso das tarefas do Kanban: essas tarefas têm acompanhamento próprio na aba Trabalho.

## 2. Minha agenda: visualizar e organizar o tempo

### Navegação no calendário

- **Mês:** visão geral das datas e atividades. Clique em um dia para abrir seus detalhes.
- **Semana:** atividades da semana, começando na segunda-feira.
- **Dia:** foco em uma data, com um seletor para trocar de dia.
- **Hoje:** volta à data atual.
- **Setas:** avançam ou voltam um mês, uma semana ou um dia, conforme a visualização.
- **Filtros:** mostram tudo ou somente rotinas, trabalho, metas, lembretes ou imprevistos.

O calendário usa horários e datas reais dos registros. As tarefas do Kanban não aparecem como compromissos: elas não possuem data e horário no modelo atual.

### Painel do dia

No painel da data selecionada:

1. Escolha o tipo de cadastro em **Adicionar à agenda**.
2. Clique em **Adicionar**.
3. Preencha o formulário e salve.
4. Use o lápis para editar e a lixeira para excluir.
5. Nas rotinas, use o botão de confirmação para registrar a conclusão da ocorrência daquele dia.

**Atenção:** editar uma rotina ou jornada altera o cadastro recorrente. A lixeira de uma atividade abre a confirmação de exclusão do cadastro inteiro, incluindo seus vínculos; ela não remove apenas a ocorrência visível. Para retirar somente um horário ou uma sessão, edite o cadastro e remova a linha correspondente.

## 3. Planejamento: cadastrar e manter seus planos

Todas as áreas têm busca por nome, filtros de status e cartões com ações de edição e exclusão. **Todos** inclui registros pausados. A busca ignora diferenças de acentuação e maiúsculas.

### Rotinas

Use para hábitos e atividades recorrentes, como caminhar, estudar ou organizar a casa.

O formulário contém:

- Nome e categoria, que também pode ser digitada livremente.
- Opção **Ativo**.
- Horários da semana: dia, início e fim.

Adicione uma linha para cada dia ou intervalo. Exemplo: caminhada na segunda e na quarta, das 07:00 às 07:40, exige duas linhas. O início deve ser anterior ao fim. Horários sobrepostos dentro do mesmo cadastro são rejeitados.

Uma rotina sem horários pode ser salva, mas só aparece no calendário depois de receber um agendamento. Desmarcar **Ativo** preserva o registro e o retira da agenda.

### Metas

Use para objetivos com prazo e dedicação planejada.

O formulário contém:

- Título, descrição e prazo opcional.
- Frequência desejada: de 1 a 7 sessões por semana.
- Duração desejada: de 15 a 240 minutos por sessão.
- Prioridade e status.
- Sessões na agenda: data, início, fim e status de cada sessão.

**Frequência e duração são preferências de planejamento.** Elas não criam sessões automaticamente neste formulário. Use **Adicionar** em **Sessões na agenda** para reservar cada período. A duração de uma sessão manual é definida pelos horários que você informar.

Você pode editar ou remover sessões individualmente dentro do formulário. Limpar o prazo remove a data limite da meta.

### Trabalho: cadastro e jornada

Em **Trabalho → Trabalhos e jornadas**, cadastre:

- Nome, empresa, cargo, modalidade e local.
- Status e opção **Ativo**.
- Jornada por dia da semana, com início e fim.
- Início e fim da pausa, se houver.
- Tarefas vinculadas ao trabalho, com título, descrição e status.

Informe os dois horários da pausa ou deixe ambos vazios. A pausa precisa ficar dentro da jornada. Use **Adicionar** para incluir outros dias ou tarefas. Os itens podem ser alterados ou removidos antes de salvar.

### Trabalho: Kanban de tarefas

Em **Trabalho → Kanban de tarefas**:

1. Selecione o trabalho.
2. Clique em **Nova tarefa** ou **Adicionar tarefa** na coluna desejada.
3. Informe título, descrição opcional e status.
4. Arraste o cartão entre **A fazer**, **Em andamento** e **Concluído**.
5. Como alternativa ao arraste, mude o seletor de status no próprio cartão. Essa opção também funciona no celular e com teclado.
6. Use o lápis para editar a tarefa e a lixeira para excluir com confirmação.

A mudança de coluna é salva na API. Se houver falha, o cartão mantém o estado anterior. No celular, as colunas ficam empilhadas. Para criar o primeiro trabalho, abra **Trabalhos e jornadas**.

### Lembretes

Use para compromissos rápidos que precisam de um aviso ou registro de horário.

O formulário contém:

- Título, descrição e horário.
- Repetição: **Uma vez**, **Todos os dias** ou **Toda semana**.
- Data, quando a repetição for **Uma vez**.
- Dia da semana, quando a repetição for **Toda semana**.
- Opção **Ativo** para manter ou pausar o lembrete.

Ao trocar a repetição, o sistema limpa os campos incompatíveis. Por exemplo, um lembrete que vira diário deixa de ter uma data única. Os filtros permitem consultar todos, ativos, pausados e concluídos, quando houver registros nesse estado.

Cadastrar um lembrete não configura envio de e-mail, push ou agendamento externo de notificações. O front mostra os registros disponibilizados pelo backend.

### Imprevistos

Use para compromissos pontuais que alteram sua programação.

Preencha título, descrição opcional, data, início, fim, prioridade e status. Altere para **Resolvido** ou **Cancelado** quando necessário. Editar um imprevisto não reorganiza automaticamente as outras atividades.

## Como funcionam os formulários e as exclusões

- Campos com **\*** são obrigatórios.
- **Adicionar** inclui uma linha de horário, sessão ou tarefa.
- **Remover** retira a linha do formulário; a alteração é aplicada somente ao salvar.
- **Cancelar**, o botão de fechar e a tecla **Esc** fecham o formulário sem salvar.
- **Salvar alterações** grava o cadastro e seus itens vinculados juntos. Se alguma parte falhar, a transação é desfeita.
- Confira o erro exibido no formulário quando o salvamento for recusado.
- Durante o salvamento, os campos e botões de fechamento ficam bloqueados.
- A exclusão de um registro exige confirmação e não pode ser desfeita.

Excluir uma rotina também remove horários e execuções vinculadas. Excluir um trabalho remove jornadas e tarefas. Excluir uma meta remove suas sessões. Esses efeitos são informados na confirmação.

Evite editar o mesmo registro simultaneamente em duas abas: o salvamento envia a lista completa de itens vinculados do formulário aberto.

## Cabeçalho: notificações, configurações e IA

### Sino: notificações

Consulte todas as notificações ou somente as não lidas. Você pode:

- Marcar uma notificação ou todas como lidas.
- Editar título, mensagem e prioridade.
- Excluir uma notificação com confirmação.

### Engrenagem: configurações

Atualize nome, data de nascimento, ocupação, estado civil, fuso horário e indicação de filhos. O e-mail aparece apenas para consulta. Clique em **Salvar perfil** para gravar.

O calendário utiliza datas de referência em `America/Sao_Paulo`. A aplicação ainda possui consultas legadas que dependem do fuso do servidor; alterar o perfil não converte automaticamente todos os horários cadastrados.

### Assistente IA

Abra **Assistente IA**, escreva sua mensagem e clique em **Enviar**. O assistente recebe um resumo compacto do dia para ajudar a pensar em prioridades e organização.

- Precisa de `OPENROUTER_API_KEY` e do provedor configurados no backend.
- A conversa permanece enquanto o painel estiver aberto; fechar o painel ou sair da conta limpa o histórico da interface.
- O histórico enviado ao provedor é limitado às seis mensagens anteriores.
- A conversa não cria, edita, exclui nem conclui registros automaticamente. Aplique sugestões nos formulários.
- Uma mensagem de indisponibilidade indica que a chamada ao provedor falhou ou não está configurada.

### Sair

Clique em **Sair** para solicitar a revogação do token no backend, limpar a sessão local e retornar ao login. Se a API estiver indisponível, a sessão local ainda será removida.

## Roteiro rápido para testar

1. Entre na conta demo e confira os cartões do Dashboard.
2. Abra a agenda, selecione um dia e alterne entre mês, semana e dia.
3. Crie uma rotina com dois horários; edite um deles e salve.
4. Crie uma meta com uma sessão e confirme que aparece na data correta.
5. Crie um trabalho com jornada, pausa e uma tarefa.
6. No Kanban, mova a tarefa, edite a descrição e confira a persistência ao recarregar.
7. Crie um lembrete semanal para domingo e depois transforme em diário.
8. Registre um imprevisto e altere o status para resolvido.
9. Teste a exclusão de um registro criado para o teste, conferindo a confirmação.
10. Abra o sino, edite uma notificação e marque-a como lida.
11. Atualize o perfil e finalize com **Sair**.
