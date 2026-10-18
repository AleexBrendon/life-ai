# Guia de uso do LifeAI

O LifeAI reúne rotina, objetivos e trabalho para ajudar você a organizar seu tempo. A navegação principal possui três telas: **Dashboard**, **Minha agenda** e **Planejamento**. Notificações, perfil e conversa com a IA abrem pelos botões do cabeçalho.

## Configurações, foto e calendário

Abra a **engrenagem** ou clique na sua foto no cabeçalho. O painel reúne:

- **Perfil pessoal:** nome, data de nascimento, ocupação, estado civil e informação sobre filhos.
- **Foto:** escolha JPG, PNG ou WebP de até 5 MB. O navegador faz um recorte central e reduz a imagem para 256 × 256 antes de enviar. Confira a prévia e clique em **Salvar configurações**. Para excluir, use **Remover foto** e salve. Ela fica vinculada ao perfil no banco e aparece no cabeçalho e na lateral após salvar; não depende do arquivo original continuar no computador.
- **Agenda e horários:** escolha o fuso, a visualização inicial de Minha agenda (mês, semana ou dia) e se a semana começa no domingo ou na segunda. Os valores são aplicados ao salvar.
- **Calendário dos campos de data:** use o ícone ao lado da data, selecione mês e ano e depois o dia. É possível digitar diretamente. Os seletores se ajustam à largura do campo sem ultrapassar o painel.
- **Notificações:** escolha se quer receber avisos das suas alterações. Os alarmes de água têm configuração independente. Alterações nas próprias configurações sempre recebem uma confirmação no sino.
- **Preferências específicas:** atalhos para meta de água, alarmes, orçamento e caixinhas.

Use **Descartar** para desfazer alterações ainda não salvas. O e-mail é exibido para identificação da conta e não é alterado nesse formulário.

## Notificações das ações

Cadastros, edições, exclusões, mudanças de status, registros de água, alterações financeiras e ações aplicadas da IA geram avisos no **sino**, quando a opção estiver ativada. Na agenda, concluir, pular ou voltar a pendente gera uma confirmação com a data selecionada. Alterar horários pelo formulário gera um aviso de edição; aprovar um ajuste da IA gera um aviso da proposta aplicada. A confirmação se refere à operação solicitada: um cadastro com vários horários ou uma proposta em lote gera um aviso da operação.

O contador é atualizado após a resposta da operação e os avisos ficam disponíveis na central. Use **Abrir área** para voltar à seção relacionada. Falhas de validação, leituras de dados e conversa da IA sem alteração não geram confirmação de mudança. Marcar, editar ou apagar a própria notificação não gera outra, evitando um ciclo de avisos.

## Primeiro acesso

1. Entre com sua conta ou use o cadastro existente.
2. Para explorar com exemplos, no diretório `backend` execute `npm run seed`.
3. A conta de demonstração é `demo@lifeai.com`, com senha `LifeAI123!`.
4. Comece por **Planejamento → Trabalho → Trabalhos e jornadas** para cadastrar seu trabalho. Depois adicione rotinas e metas.

O seed preserva os registros existentes e não duplica os exemplos da mesma data. Ao executá-lo em outro dia, ele acrescenta exemplos para o novo período. Use a conta demo em ambiente de desenvolvimento.

## Água: meta diária e lembretes

### Alarme na tela e intervalo

O topo do sistema exibe **Água**, consumo diário e o tempo até o próximo aviso. Com lembretes ativados, aparece um aviso na tela nos horários configurados. Use **Bebi … ml**, **Outro volume** ou **Agora não**. Dispensar não registra consumo nem desativa os próximos intervalos. A escolha é lembrada neste navegador para aquele intervalo.

Para começar, abra **Planejamento → Água → Configurar aviso de 1 em 1 hora**, revise a meta e os horários e salve. O botão preenche 60 minutos e ativa os avisos no formulário; você pode mudar o intervalo antes de salvar. As configurações existentes são preservadas até salvar.

Os 60 minutos são uma opção de organização, não uma recomendação clínica. O [NHS orienta beber líquidos regularmente ao longo do dia](https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/), sem estabelecer um intervalo universal em minutos. Necessidades variam, inclusive com calor, exercício, gravidez e condições de saúde. Água dos alimentos e outras bebidas também contribuem para a hidratação; esta tela registra apenas os volumes que você informa. Se houver restrição de líquidos, siga a orientação de quem acompanha sua saúde.

Clique em **Ativar som** no topo para permitir um toque breve nesta sessão. Ao recarregar ou abrir outra sessão, ative novamente se desejar. O alarme visual e sonoro exige o sistema aberto e conexão com a API; abas em segundo plano podem sofrer atraso do navegador. Não é um despertador do celular. A contagem segue o fuso do perfil, e os lembretes param ao atingir a meta registrada.

1. Abra **Planejamento → Água → Configurar meta e lembretes**.
2. Informe a sua meta em litros e o tamanho do copo em mililitros. A meta é definida por você; o sistema não calcula uma recomendação de saúde.
3. Ative os lembretes, escolha o intervalo e os horários de início e fim, e salve.
4. Quando beber, clique em **Bebi … ml**. Para outro volume, use **Outra quantidade**.
5. Acompanhe o total, a barra de progresso e quanto falta. Use o lápis para corrigir um registro ou a lixeira para excluí-lo.

Os lembretes chegam ao **sino**, com contador de não lidas e atalho **Registrar água**. O servidor verifica os horários a cada minuto e o frontend atualiza as notificações a cada minuto. Só existe um aviso por intervalo; não são acumulados avisos de intervalos perdidos enquanto a API estava desligada. Quando o consumo registrado atingir a meta, os próximos lembretes daquele dia param. No dia seguinte o total diário começa em zero, preservando o histórico no banco. A data segue o fuso horário configurado no perfil.

Os avisos dependem da API em execução. Não são notificações push do celular, SMS ou WhatsApp. Receber um lembrete não registra água automaticamente. A tela apresenta os consumos do dia atual.

## Finanças: salário, despesas, compras e caixinhas

Abra **Planejamento → Finanças**. Esta aba é um orçamento mensal recorrente, sem conexão com banco e sem extrato por competência.

1. Em **Rendas**, cadastre o salário líquido e outras entradas mensais.
2. Em **Despesas**, cadastre os gastos mensais, como aluguel, alimentação, transporte e assinaturas.
3. Em **Caixinhas**, defina o nome, o valor do objetivo, quanto já está guardado e quanto pretende reservar a cada mês.
4. Em **Compras planejadas**, informe o preço total, a entrada ou valor já guardado e em quantos meses quer dividir o restante.
5. Confira o **Saldo livre / mês**, a parcela calculada e se cada objetivo cabe no orçamento. Use o lápis para ajustar qualquer registro e a lixeira para removê-lo.

O cálculo é:

```text
Disponível antes dos objetivos = renda mensal − despesas mensais
Parcela planejada = (preço da compra − entrada/valor guardado) ÷ meses
Saldo livre = disponível − parcelas de todas as compras − reservas das caixinhas
Prazo mínimo de uma compra = restante ÷ saldo disponível após os outros objetivos
```

Parcelas e prazos são arredondados para cima; a última parcela pode ser menor por ajuste de centavos. Quando não existe saldo positivo após os outros compromissos, o sistema informa que a compra não tem prazo viável no orçamento atual. O prazo mínimo de cada compra considera as outras compras e caixinhas já cadastradas; ao mudar um objetivo, os demais são recalculados.

**Exemplo:** renda de R$ 5.000, despesas de R$ 3.000 e caixinha de R$ 500/mês deixam R$ 1.500 para uma compra. Um notebook de R$ 3.000, sem entrada, cabe em no mínimo 2 meses. Se você escolher 3 meses, a parcela será de R$ 1.000 e o saldo livre mensal será de R$ 500.

Os cálculos não incluem juros, taxas, inflação ou rendimento. As caixinhas são reservas de planejamento: nenhum dinheiro é transferido. Atualize **Já guardado / entrada** manualmente quando separar dinheiro ou pagar parte da compra; os saldos não aumentam com a passagem do mês. Ao atingir o objetivo, sua reserva mensal deixa de comprometer o orçamento. Evite cadastrar a mesma parcela em Compras e também em Despesas, ou a mesma reserva em Compra e Caixinha, para não contar o valor duas vezes. Não use os mesmos valores guardados em objetivos diferentes.

## 1. Dashboard: acompanhar o dia

Mostra um resumo dos dados reais da sua conta:

- Quantas rotinas estão programadas para hoje.
- Quantas atividades da agenda foram concluídas, incluindo rotinas, lembretes, períodos de trabalho, sessões de metas e imprevistos.
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

Em **Minha agenda**, selecione a data e use as ações de cada atividade: **Concluir**, **Pular neste dia** ou **Voltar a pendente**. Isso vale para rotinas, períodos de trabalho, lembretes, sessões de metas e imprevistos. Ao pular, confirme no modal; o motivo é opcional. Você pode desfazer uma conclusão ou um skip voltando a pendente. Cada turno de trabalho tem acompanhamento próprio. A alteração vale apenas para a ocorrência e não conclui o trabalho inteiro, a meta inteira nem as próximas repetições.

O **Progresso do dia** considera todas as atividades programadas da agenda. Concluídas aumentam o percentual; puladas continuam no total, mas aparecem separadamente. Voltar a pendente retira a conclusão do cálculo. Ações da agenda não concluem tarefas do Kanban, não registram água e não movimentam caixinhas.

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
- A aba **Conversar** não executa alterações a partir das mensagens. Para criar cadastros pela descrição, selecione **Cadastrar minha rotina** e confirme a proposta. Ajustes pontuais de horário usam **Propor ajuste**.
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

## Gráficos do Dashboard

O Dashboard também apresenta gráficos com filtro de 7 dias, 14 dias ou 6 semanas:

- **Ritmo de conclusão:** percentual de execuções e sessões concluídas entre os registros existentes em cada dia. Dias sem registros ficam como lacunas; não representam conclusão zero.
- **Conclusões por categoria:** quantidade de conclusões distribuída pela categoria da rotina, além de Lembretes e Metas.
- **Mapa de horários:** minutos dos intervalos concluídos de rotinas e sessões de metas, agrupados por dia da semana e hora. Lembretes não somam duração.

O tempo exibido é o somatório dos intervalos registrados como concluídos, sem cronometragem real. Intervalos simultâneos são somados. Trabalho e tarefas do Kanban não entram nessas métricas. Quando não há histórico, a tela mostra um estado vazio em vez de números de exemplo.

## Pedir e aprovar ajustes pela assistente

No painel **Assistente IA**, abaixo da conversa:

1. Escolha o **Dia para analisar**.
2. Clique em **Propor ajuste**.
3. Confira a rotina, a justificativa e o intervalo proposto para a data escolhida.
4. Clique em **Aprovar e aplicar** para gravar ou em **Recusar** para manter a agenda.

As propostas pendentes são persistidas e voltam a aparecer ao abrir o painel. A alteração aprovada vale para a ocorrência da data escolhida; o horário semanal recorrente é preservado. O calendário e o Dashboard são atualizados após a aplicação.

Esse recurso analisa o dia selecionado; a mensagem digitada na conversa não é um comando executável. No momento, são suportados ajustes de horário de rotinas. Para criar registros a partir de uma descrição, use a aba **Cadastrar minha rotina**. Exclusão de registros pela IA não está disponível. A análise pode informar que não há ação ou retornar um erro de validação ou do provedor.

Na conversa, **Enter** envia a mensagem e **Shift+Enter** insere uma nova linha.

## Cadastrar o sistema contando sua rotina

1. Abra **Assistente IA → Cadastrar minha rotina**.
2. Descreva seus trabalhos, hábitos, objetivos e lembretes. Exemplo: “Trabalho de segunda a sexta das 9h às 18h. Caminho terça e quinta das 7h às 7h40. Quero estudar inglês 3 vezes por semana, 30 minutos por sessão.”
3. Se faltarem dias ou horários de uma rotina ou trabalho, responda às perguntas no mesmo campo.
4. Confira o resumo, os dias, os horários e todos os campos na proposta. O formulário de revisão mostra também tarefas e sessões vinculadas.
5. Para corrigir, escreva a alteração e envie. A proposta anterior é substituída pela corrigida.
6. Clique em **Confirmar e cadastrar** para salvar todos os itens juntos, ou em **Descartar** para não criar nada.

As propostas completas ficam pendentes e podem ser recuperadas ao reabrir essa aba. O texto das perguntas e respostas não fica salvo como histórico de conversa.

São suportados novos trabalhos com jornadas e tarefas, rotinas com horários, metas com sessões quando informadas, lembretes e imprevistos. Metas sem sessões explícitas não recebem horários inventados; a preferência padrão, quando usada, é de 3 sessões semanais de 60 minutos, visível na revisão. O sistema recusa horários inválidos e sobreposição dentro do mesmo cadastro. Isso não reorganiza compromissos de outros cadastros automaticamente.

Nenhum cadastro é criado durante a análise. A confirmação aplica o lote em uma transação: se um item falhar, os demais também não são criados. A mesma proposta não pode ser aplicada duas vezes. Um nome já existente na mesma categoria bloqueia o lote para revisão, sem sobrescrever registros anteriores. Para editar registros já existentes, use os formulários do Planejamento.

**Enter** envia a descrição; **Shift+Enter** insere uma linha. A geração depende da disponibilidade do provedor da IA e pode exigir uma nova tentativa se ele responder em formato inválido.

## Pedir que a IA encaixe estudo, corrida e descanso

Na aba **Cadastrar minha rotina**, você pode pedir uma proposta completa de organização, além de registrar compromissos fixos. Exemplo: “Preserve meus horários de trabalho e encaixe faculdade EAD, corrida e descanso nas janelas livres. Sugira dias e durações para eu revisar.”

Os compromissos fixos informados devem ser preservados. Para atividades flexíveis, a IA pode escolher horários e durações e apresentá-los em **Sugestões para você revisar**. A proposta é um ponto inicial, não uma garantia de rotina ótima. Confira deslocamentos, disponibilidade, descanso e possíveis conflitos antes de confirmar.

Como ponto inicial revisável, a IA recebe orientação para sugerir até três estudos semanais de 45 minutos, até três corridas de 30 minutos e blocos de descanso de 30 minutos, reduzindo a quantidade se não encontrar espaço. As escolhas aparecem na revisão e podem ser corrigidas pela conversa. Perguntas devem se concentrar em compromissos fixos com horários ausentes ou contraditórios, em vez de exigir que você monte os horários flexíveis sozinho.

## Planejamento gratuito com cálculo local

Para descrições reconhecidas com dias e intervalos explícitos — por exemplo, jornadas divididas, freelancer, aulas e compromissos pessoais — o sistema pode extrair os horários localmente e calcular janelas para estudo, corrida e descanso. Esse caminho não chama o provedor, não usa créditos e continua exigindo revisão e confirmação.

As sugestões partem de até três corridas de 30 minutos, três sessões de estudo de 45 minutos nos próximos sete dias e pausas de 30 minutos. Os dias e intervalos são mostrados na proposta para alteração. São reservados intervalos de 15 minutos entre atividades; deslocamentos e necessidades individuais de sono não são estimados.

A interpretação local é limitada aos formatos reconhecidos e deve ser conferida, principalmente quando a descrição associa vários compromissos ao mesmo dia. Descrições que não forem reconhecidas seguem para a IA gratuita. Corrigir uma proposta existente também pode depender do provedor. Horários ausentes ou ambíguos não devem ser tratados como certeza.
