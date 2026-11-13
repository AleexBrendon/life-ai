# Identidade visual do LifeAI

## Direção

Grafite e cinza formam as superfícies; âmbar destaca a ação principal, o contexto selecionado e o progresso. O tema escuro é o padrão para novos dispositivos. Uma preferência clara ou de sistema já salva continua sendo respeitada.

- Escuro: fundo `#151719`, superfície `#202327`, texto `#F3F4F6`, texto secundário `#ADB3BD`.
- Claro: fundo `#F2F3F5`, superfície branca, texto `#24272D`, texto secundário `#59616D`.
- Ação: fundo `#F5C451` com texto `#25200F` nos dois temas.
- Links e foco: `#F5C451` no escuro e `#8A5700` no claro.
- Confirmação, erro e categorias conservam sinais próprios, acompanhados de texto e ícones.

Os tokens da identidade estão em `frontend/src/styles/identity.css`, carregado após as camadas existentes. Os tons verdes decorativos antigos foram neutralizados nas folhas legadas, preservando as estruturas responsivas e as variações de categoria. Novos componentes devem usar os tokens compartilhados, sem adicionar paletas locais.

## Organização

- Dashboard: contexto diário, compromisso em andamento/próximo, resumo, agenda com links, progresso e atividades pendentes com horário encerrado. Os gráficos são carregados ao abrir “Explorar análises”. Não são inferidas pendências financeiras sem consultar seus dados.
- Notificações: painel lateral, lista compacta, agrupamento por data no fuso do perfil, filtros e acesso às preferências push. Abrir, ler, editar e registrar água preservam seus fluxos. Um alerta de compromisso fica visível por vez, com acesso à central quando houver mais.
- Agenda, planejamento, trabalho, água, financeiro e evolução: componentes, superfícies, navegação e controles seguem a mesma paleta.
- Login/cadastro, perfil, assistente, diálogos e seletores recebem a mesma identidade. Ícones SVG/PNG e manifesto acompanham a nova marca.

## Verificação

`npm test`, `npm run build`, `npm run test:ui`, `npm run test:evolution-ui` e `npm run test:identity-ui`, executados em `frontend`.

A revisão de identidade usa dados fictícios e percorre as áreas em 1440 e 390 pixels, nos temas claro e escuro. Verifica largura, filtros, leitura de notificações, Escape e login, produzindo capturas em diretório temporário. A verificação de evolução cobre os fluxos existentes, incluindo fila offline e isolamento entre contas. Isso não substitui teste de push real ou uma auditoria completa de acessibilidade.

Esta entrega trata da apresentação e da organização da informação. Novas funcionalidades, sincronização adicional e personalização do dashboard ficam para a etapa seguinte.
