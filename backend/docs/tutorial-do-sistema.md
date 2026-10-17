# Tutorial do sistema LifeAI

Este tutorial apresenta um roteiro prático para aprender a usar o LifeAI. Ao final, você terá uma rotina, uma meta com sessão agendada, um trabalho com tarefas no Kanban, um lembrete e um imprevisto cadastrados.

O LifeAI organiza informações em três telas principais:

| Tela | Para que serve |
| --- | --- |
| Dashboard | Consultar o resumo do dia, o progresso e as próximas atividades. |
| Minha agenda | Visualizar compromissos no calendário e consultar ou alterar os registros do dia. |
| Planejamento | Cadastrar e administrar rotinas, metas, trabalho, tarefas, lembretes e imprevistos. |

Os exemplos abaixo podem ser adaptados aos seus horários. Campos com asterisco são obrigatórios.

## 1. Entrar no sistema

1. Abra o endereço do frontend. No ambiente local padrão, use `http://127.0.0.1:5173/`.
2. Entre com seu e-mail e senha. Caso ainda não tenha uma conta, use a opção de cadastro disponível na tela de acesso.
3. Após entrar, abra **Dashboard** pelo menu principal.

### Usar a conta de demonstração

Se quiser aprender com exemplos já cadastrados, execute no terminal, a partir da pasta do projeto:

```powershell
cd backend
npm run seed
```

O banco de dados precisa estar disponível e com o schema aplicado. Depois entre com:

- E-mail: `demo@lifeai.com`
- Senha: `LifeAI123!`

O seed é para desenvolvimento. Ele não apaga os dados existentes e não duplica os mesmos exemplos para a mesma data. Alterações na conta demo são compartilhadas entre quem utilizar essa conta.

## 2. Conhecer o Dashboard

Observe os cartões de **Rotinas de hoje**, **Concluídas**, **Sessões de metas** e **Trabalho**.

- **Agenda de hoje** apresenta até oito atividades, ordenadas por horário. Use **Ver agenda** ou o link ao final da lista para consultar o calendário.
- **Progresso do dia** considera as execuções concluídas de rotinas e lembretes, em relação aos agendamentos dessas duas categorias. Não é o progresso do Kanban ou das metas.
- **A seguir** destaca uma atividade ainda não concluída cujo início está previsto para o horário atual ou mais tarde. Se não houver, o cartão informa que não há outra atividade prevista para começar hoje.
- Os atalhos permitem abrir metas, Kanban e assistente IA.

**Resultado esperado:** você entende o que está programado e escolhe por onde começar. Se sua conta estiver vazia, siga os próximos passos para preenchê-la.

## 3. Criar sua primeira rotina

Exemplo: reservar um período para caminhar duas vezes por semana.

1. Entre em **Planejamento → Rotinas**.
2. Clique em **Adicionar rotina**.
3. Informe o nome **Caminhada no bairro**.
4. Na categoria, selecione ou digite **Atividade física**.
5. Mantenha a opção **Ativo** marcada.
6. Em **Horários da semana**, clique em **Adicionar**.
7. Escolha **Segunda**, com início às **07:00** e fim às **07:40**.
8. Adicione outra linha para **Quarta**, no mesmo intervalo.
9. Clique em **Salvar alterações**.

**Resultado esperado:** um cartão da rotina aparece na listagem. Os horários aparecem no calendário nos respectivos dias da semana.

Uma rotina sem horários pode ser salva, mas não gera atividades no calendário. Você pode adicionar mais horários depois pelo lápis do cartão.

## 4. Criar uma meta e reservar uma sessão

Exemplo: estudar React com um objetivo definido.

1. Entre em **Planejamento → Metas**.
2. Clique em **Adicionar meta**.
3. Informe o título **Concluir meu projeto React** e uma descrição do que deseja entregar.
4. Se quiser, selecione uma data de prazo futura.
5. Defina **3** sessões por semana, com **60** minutos por sessão.
6. Escolha a prioridade e mantenha o status **Ativa**.
7. Em **Sessões na agenda**, clique em **Adicionar**.
8. Escolha uma data futura, início às **18:30**, fim às **19:30** e status **Pendente**.
9. Salve o formulário.

**Resultado esperado:** a meta aparece na listagem e a sessão aparece na data escolhida em **Minha agenda**.

A frequência e a duração são preferências. Preencher esses números não cria sessões automaticamente neste formulário: você precisa adicionar as datas e os horários. Cada sessão manual usa o intervalo informado na própria linha.

## 5. Cadastrar trabalho, jornada e pausa

1. Entre em **Planejamento → Trabalho**.
2. Selecione **Trabalhos e jornadas**.
3. Clique em **Adicionar trabalho**.
4. Informe o nome **Projeto do aplicativo**.
5. Preencha empresa, cargo, modalidade e local, se forem relevantes.
6. Escolha o status **Em andamento** e mantenha **Ativo** marcado.
7. Em **Jornada e intervalos**, adicione uma linha para **Segunda**.
8. Informe início às **09:00**, fim às **18:00**, pausa das **12:00** às **13:00**.
9. Adicione linhas para outros dias, se necessário.
10. Salve.

**Resultado esperado:** o trabalho fica disponível para seleção no Kanban e suas jornadas aparecem no calendário.

Se não houver pausa, deixe os dois campos vazios. Se houver, informe início e fim; ambos precisam estar dentro da jornada.

## 6. Organizar tarefas no Kanban

1. Ainda em **Planejamento → Trabalho**, abra **Kanban de tarefas**.
2. No seletor **Trabalho**, escolha **Projeto do aplicativo**.
3. Clique em **Nova tarefa**.
4. Informe o título **Revisar a tela inicial**, descreva a entrega e selecione **A fazer**.
5. Clique em **Salvar tarefa**.
6. Arraste o cartão para **Em andamento**. Como alternativa, use o seletor de status no próprio cartão.
7. Quando terminar, mova para **Concluído**.
8. Recarregue a página para conferir a persistência.

**Resultado esperado:** a tarefa permanece na coluna escolhida após o recarregamento.

Use o lápis para editar título, descrição e status. Use a lixeira para excluir com confirmação. No celular, as colunas ficam empilhadas; o seletor de status permite mover tarefas sem arrastar.

As tarefas não possuem data e horário no modelo atual, portanto não aparecem como compromissos no calendário.

## 7. Criar um lembrete

Exemplo: lembrar de fazer uma pausa todos os dias.

1. Entre em **Planejamento → Lembretes**.
2. Clique em **Adicionar lembrete**.
3. Informe o título **Pausa para alongar**.
4. Escolha o horário **15:00**.
5. Em repetição, selecione **Todos os dias**.
6. Mantenha **Ativo** marcado e salve.

**Resultado esperado:** o lembrete aparece na lista e na agenda diária.

Outras opções de repetição:

| Opção | O que preencher |
| --- | --- |
| Uma vez | Data e horário. |
| Todos os dias | Horário. |
| Toda semana | Dia da semana e horário. |

Para pausar, edite e desmarque **Ativo**. Para encontrar registros pausados, use **Todos** ou **Pausados**. A busca aceita palavras do título ou da descrição.

O cadastro registra o lembrete no sistema. Ele não configura por si só envio de e-mail, push ou notificações externas.

## 8. Registrar um imprevisto

1. Entre em **Planejamento → Imprevistos**.
2. Clique em **Adicionar imprevisto**.
3. Informe **Buscar uma encomenda**.
4. Escolha a data, início às **17:00** e fim às **17:20**.
5. Defina prioridade **Média** e status **Pendente**.
6. Salve.
7. Quando resolver, use o lápis e altere o status para **Resolvido**.

**Resultado esperado:** o imprevisto aparece na data informada. O cadastro não reorganiza automaticamente os outros compromissos.

## 9. Usar Minha agenda

1. Abra **Minha agenda**.
2. Alterne entre **Mês**, **Semana** e **Dia**.
3. Use as setas para navegar e **Hoje** para retornar à data atual.
4. Clique em uma data para consultar suas atividades no painel do dia.
5. Use os filtros para consultar uma categoria ou selecione **Tudo**.
6. Role a lista do planejamento do dia para ver as atividades restantes; a data e a ação de adicionar permanecem fora dessa rolagem.

Para adicionar um registro pela agenda, escolha o tipo em **Adicionar à agenda** e clique em **Adicionar**. Confira a data ou os dias da semana no formulário antes de salvar.

### Concluir uma rotina do dia

1. Selecione o dia da rotina.
2. Localize a atividade no painel.
3. Clique no botão de confirmação, com símbolo de check.

**Resultado esperado:** a ocorrência daquele dia fica concluída. Isso não conclui automaticamente as próximas ocorrências da rotina.

### Editar ou excluir pela agenda

- O lápis abre o cadastro completo da atividade.
- A lixeira abre a confirmação de exclusão do cadastro inteiro.
- Para remover apenas um horário ou uma sessão, abra o cadastro, remova a linha correspondente e salve.

Editar uma rotina ou jornada altera seu agendamento recorrente. Não confunda essa ação com mudar somente uma ocorrência de um dia.

## 10. Editar, remover linhas e excluir registros

### Alterar um cadastro

1. Localize o cartão no Planejamento e clique no lápis, ou use **Ver e editar detalhes**.
2. Altere os campos necessários.
3. Use **Adicionar** para incluir horários, sessões ou tarefas.
4. Use **Remover** para retirar uma linha.
5. Clique em **Salvar alterações**.

Os itens vinculados são salvos junto com o cadastro. Se houver falha, a transação é desfeita. Verifique a mensagem apresentada e corrija o formulário.

**Cancelar**, o botão de fechar e a tecla **Esc** fecham sem salvar. Durante o salvamento, as ações de fechamento ficam bloqueadas.

### Excluir um cadastro

1. Clique na lixeira do registro.
2. Confira o nome e os efeitos apresentados.
3. Confirme a exclusão ou cancele.

A exclusão não pode ser desfeita. Rotinas perdem seus horários e execuções vinculadas; trabalhos perdem jornadas e tarefas; metas perdem sessões. Faça esse teste com um registro criado especificamente para isso.

Evite editar o mesmo cadastro em duas abas ao mesmo tempo, pois cada formulário envia a lista completa dos itens vinculados.

## 11. Consultar notificações

1. Clique no **sino**, no cabeçalho.
2. Alterne entre **Todas** e **Não lidas**.
3. Use o check para marcar uma notificação como lida, ou **Marcar todas como lidas**.
4. Use o lápis para editar título, mensagem e prioridade.
5. Use a lixeira para excluir com confirmação.
6. Feche o painel para voltar à tela anterior.

## 12. Atualizar seu perfil

1. Clique na **engrenagem**.
2. Atualize nome, nascimento, ocupação, estado civil, fuso horário e indicação de filhos.
3. Clique em **Salvar perfil**.
4. Confira a mensagem de sucesso.

O e-mail é exibido somente para consulta. O calendário usa referência de data em `America/Sao_Paulo`; alterar o fuso no perfil não converte automaticamente todos os horários já cadastrados ou as consultas legadas do sistema.

## 13. Conversar com a IA

1. Clique em **Assistente IA**, no cabeçalho ou no atalho do Dashboard.
2. Digite, por exemplo: **Como posso organizar melhor meu dia?**
3. Clique em **Enviar** e aguarde a resposta.
4. Use a sugestão como apoio e aplique as alterações desejadas nos formulários.

A IA precisa de um provedor configurado no backend. Se estiver indisponível, a interface apresenta uma mensagem de erro.

A conversa não altera a agenda automaticamente. O histórico da interface permanece enquanto o painel estiver aberto e é limpo quando ele é fechado. O contexto enviado ao provedor contém um resumo do dia e até seis mensagens anteriores.

### Conversa e recomendações são fluxos diferentes

O backend também possui um MVP de recomendações que exige aprovação antes de aplicar alterações pontuais. O painel de conversa atual não oferece os botões de aprovação ou recusa desse fluxo. Não é necessário chamar endpoints para seguir este tutorial.

Para consultar o funcionamento técnico das recomendações, veja [MVP de recomendações de IA](ai-mvp.md).

## 14. Sair da conta

1. Clique em **Sair**, no cabeçalho.
2. Aguarde o retorno à tela de login.

O sistema solicita a revogação do token no backend e remove a sessão local. Se a API estiver indisponível, a sessão local ainda é removida.

## Dúvidas durante o uso

| Situação | O que conferir |
| --- | --- |
| Cadastro não aparece na agenda | Confira a data, o dia da semana, os horários, a opção Ativo e o filtro selecionado. |
| Meta não aparece no calendário | Adicione uma sessão com data e horários; somente a frequência semanal não cria sessões. |
| Não consigo criar tarefa no Kanban | Cadastre um trabalho em Trabalhos e jornadas e selecione-o no Kanban. |
| Horário não é aceito | O início deve ser anterior ao fim; evite sobreposições dentro do mesmo cadastro e confira a pausa. |
| Salvamento falhou | Leia o erro no formulário, revise os campos obrigatórios e confira a disponibilidade da API. |
| Não encontro um registro | Limpe a busca e selecione Todos; ele pode estar pausado ou concluído. |
| A IA não responde | Confira a configuração e disponibilidade do provedor no backend. |
| Aparece uma mensagem de sessão expirada | Entre novamente com sua conta. |

Para uma consulta por funcionalidade, veja também o [Guia de uso](../../docs/GUIA-DE-USO.md).
