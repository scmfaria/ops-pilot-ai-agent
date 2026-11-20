# Tasks: War Room Web do OpsPilot

**Input**: Design documents from `/specs/003-ops-pilot-war-room-web/`

**Prerequisites**: spec.md (required); `.github/instructions/design.instructions.md` (required for `web/**`)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Tarefas independentes que podem ser executadas em paralelo.
- **[Story]**: Identificador da história de usuário correspondente.
- Camadas não pulam: `http/cli -> service -> store`; a interface deve usar schemas Zod somente nas bordas externas.
- Toda lógica nova nasce com testes.
- Mantenha `npm run typecheck` e `npm test` verdes.

---

## Phase 1: Setup da aplicação web

**Purpose**: Preparar a SPA Vite + React + TypeScript e sua integração básica com o workspace.

- [ ] T001 Criar o projeto Vite React TypeScript em `web/`.
- [ ] T002 [P] Configurar TypeScript estrito e scripts `dev`, `build`, `preview` e `test` em `web/package.json`.
- [ ] T003 [P] Configurar Vite com base pública `/opspilot/` e servidor de desenvolvimento acessível em `/opspilot/` em `web/vite.config.ts`. _Nota (spec 004): a base é sobrescrevível via `VITE_BASE` (`web/base-path.ts`) para o deploy no GitHub Pages; o padrão continua `/opspilot/`._
- [ ] T004 [P] Configurar estilos globais, tokens semânticos de tema, espaçamento em escala e dark mode em `web/src/styles.css`.
- [ ] T005 [P] Criar a entrada React e o elemento raiz em `web/src/main.tsx` e `web/index.html`.
- [ ] T006 [P] Adicionar scripts da War Room ao `package.json` raiz sem substituir os scripts existentes.
- [ ] T007 [P] Atualizar `.gitignore` para artefatos de build e dependências locais da SPA.
- [ ] T008 [P] Documentar instalação e execução da SPA em `README.md`.

**Checkpoint**: SPA inicializa em `/opspilot/` e possui tema base claro/escuro.

---

## Phase 2: Foundational — contratos e integração HTTP

**Purpose**: Implementar os blocos compartilhados exigidos antes das histórias da interface.

**⚠️ CRITICAL**: Nenhuma história de UI pode ser considerada completa antes de terminar esta fase.

- [ ] T009 Criar schemas Zod de borda para requisição e resposta `/chat` em `web/src/api/chat-contract.ts`.
- [ ] T010 Criar tipos derivados dos schemas para resposta `200`, resposta `202`, trace e métricas em `web/src/api/chat-contract.ts`.
- [ ] T011 [P] Implementar cliente HTTP com timeout, suporte a JSON e normalização de erros em `web/src/api/client.ts`.
- [ ] T012 [P] Implementar persistência da URL da API no `localStorage` em `web/src/api/api-config.ts`.
- [ ] T013 [P] Implementar normalização da URL base removendo barras finais em `web/src/api/api-config.ts`.
- [ ] T014 [P] Criar armazenamento em React para tema claro/escuro em `web/src/theme/theme.ts`.
- [ ] T015 [P] Criar service de configuração do API base com URL padrão local e sem sobrescrever valor salvo em `web/src/api/api-config.ts`.
- [x] T016 Configurar CORS no servidor Express em `src/http/server.ts` usando uma configuração de origens permitidas por ambiente e incluindo desenvolvimento local.
- [x] T017 [P] Permitir `POST`, `OPTIONS`, `Content-Type` e `Authorization` no CORS configurado em `src/http/server.ts`.
- [x] T018 [P] Atualizar os testes HTTP para validar preflight e configuração de CORS em `src/http/server.test.ts`.
- [ ] T019 [P] Criar helper puro para montar `{baseUrl}/chat` sem barra duplicada em `web/src/api/api-config.ts`.

**Checkpoint**: Contrato tipado, cliente HTTP, configuração persistida e CORS estão disponíveis.

---

## Phase 3: User Story 1 — Chat da War Room (Priority: P1) 🎯 MVP

**Goal**: Permitir enviar mensagens ao agente, manter a conversa e apresentar respostas de forma acessível.

**Independent Test**: Iniciar a SPA, enviar uma mensagem válida e verificar a resposta `200`, o `conversationId`, o loading e o histórico.

### Tests for User Story 1

- [ ] T020 [P] [US1] Testar `chatContract` para request válido, response `200`, response `202` e payload inválido em `web/src/api/chat-contract.test.ts`.
- [ ] T021 [P] [US1] Testar cliente HTTP para sucesso `200`, payload inválido, timeout e falha de rede em `web/src/api/client.test.ts`.
- [ ] T022 [P] [US1] Testar atualização do histórico e reutilização de `conversationId` em `web/src/features/chat/chat-state.test.ts`.
- [ ] T023 [P] [US1] Testar normalização e persistência da URL da API em `web/src/api/api-config.test.ts`.
- [ ] T024 [P] [US1] Testar a componente de chat com estado vazio, envio, loading e resposta em `web/src/features/chat/Chat.test.tsx`.

### Implementation for User Story 1

- [ ] T025 [US1] Criar tipos e reducer puro do estado da conversa em `web/src/features/chat/chat-state.ts`.
- [ ] T026 [US1] Implementar hook de execução do chat em `web/src/features/chat/use-chat.ts`.
- [ ] T027 [US1] Criar layout semântico da War Room em `web/src/features/chat/ChatPage.tsx`.
- [ ] T028 [P] [US1] Criar componente de histórico de mensagens em `web/src/features/chat/MessageList.tsx`.
- [ ] T029 [P] [US1] Criar componente do campo de mensagem, envio e feedback de loading em `web/src/features/chat/MessageComposer.tsx`.
- [ ] T030 [P] [US1] Criar seletor de estratégia `react` e `plan-and-execute` em `web/src/features/chat/StrategyControls.tsx`.
- [ ] T031 [P] [US1] Criar controle de reflexão em `web/src/features/chat/StrategyControls.tsx`.
- [ ] T032 [US1] Renderizar métricas `llmCalls`, `latencyMs` e `historyMessages` em `web/src/features/chat/MessageItem.tsx`.
- [ ] T033 [US1] Implementar estado vazio indicando que não há conversa ativa e sugerindo uma primeira pergunta em `web/src/features/chat/MessageList.tsx`.
- [ ] T034 [US1] Impedir envio duplicado durante loading e anunciar o estado para tecnologia assistiva em `web/src/features/chat/MessageComposer.tsx`.
- [ ] T035 [US1] Preservar a mensagem do usuário quando a API retornar erro e oferecer tentar novamente em `web/src/features/chat/ChatPage.tsx`.

**Checkpoint**: Chat funcional com 200, loading, erro, estado vazio e histórico persistido por `conversationId`.

---

## Phase 4: User Story 2 — Trace tipado acessível (Priority: P1)

**Goal**: Exibir o raciocínio da resposta em um painel tipado e acessível.

**Independent Test**: Enviar uma resposta com trace, clicar em `Ver raciocínio`, navegar pelo painel e fechá-lo pelo teclado com retorno do foco.

### Tests for User Story 2

- [ ] T036 [P] [US2] Testar ordenação dos eventos de trace pelo campo `step` em `web/src/features/trace/trace-state.test.ts`.
- [ ] T037 [P] [US2] Testar renderização de todos os tipos: `thought`, `action`, `observation`, `plan`, `critique` e `answer` em `web/src/features/trace/TracePanel.test.tsx`.
- [ ] T038 [P] [US2] Testar o estado vazio de trace sem caracteres ou ações que pareçam erro em `web/src/features/trace/TracePanel.test.tsx`.
- [ ] T039 [P] [US2] Testar que o painel usa dialog semântico, captura foco e o retorna ao abrir/fechar em `web/src/features/trace/TracePanel.test.tsx`.

### Implementation for User Story 2

- [ ] T040 [US2] Criar helper puro de ordenação e classificação do trace em `web/src/features/trace/trace-state.ts`.
- [ ] T041 [US2] Criar componente `TracePanel` como dialog/drawer acessível em `web/src/features/trace/TracePanel.tsx`.
- [ ] T042 [P] [US2] Criar componente para evento `thought` em `web/src/features/trace/TraceEvent.tsx`.
- [ ] T043 [P] [US2] Criar componente para evento `action`, exibindo `tool` e `args` estruturados em `web/src/features/trace/TraceEvent.tsx`.
- [ ] T044 [P] [US2] Criar componente para `observation`, `plan`, `critique` e `answer` em `web/src/features/trace/TraceEvent.tsx`.
- [ ] T045 [US2] Adicionar ação `Ver raciocínio` nas mensagens que possuem trace em `web/src/features/chat/MessageItem.tsx`.
- [ ] T046 [US2] Implementar estado vazio próprio para trace sem eventos em `web/src/features/trace/TracePanel.tsx`.
- [ ] T047 [US2] Implementar fechamento por Escape e retorno de foco ao gatilho em `web/src/features/trace/TracePanel.tsx`.
- [ ] T048 [US2] Garantir leitura semântica e ordem lógica dos eventos em `web/src/features/trace/TracePanel.tsx`.

**Checkpoint**: Trace completo, tipado, navegável por teclado e com retorno de foco.

---

## Phase 5: User Story 3 — Aprovação humana em HTTP 202 (Priority: P1)

**Goal**: Representar propostas pendentes e permitir Aprovar ou Negar sem executar decisões no servidor nesta versão.

**Independent Test**: Receber um `202`, verificar o cartão pendente e confirmar que Aprovar ou Negar altera o estado local sem reapresentar o cartão como pendente.

### Tests for User Story 3

- [ ] T049 [P] [US3] Testar reconhecimento de `202` com `pendingApproval: true` em `web/src/features/approval/approval-state.test.ts`.
- [ ] T050 [P] [US3] Testar compatibilidade com `202` sem `pendingApproval` em `web/src/features/approval/approval-state.test.ts`.
- [ ] T051 [P] [US3] Testar estados locais aprovado e negado em `web/src/features/approval/approval-state.test.ts`.
- [ ] T052 [P] [US3] Testar bloqueio dos dois controles durante decisão em `web/src/features/approval/ApprovalCard.test.tsx`.
- [ ] T053 [P] [US3] Testar que Aprovar e Negar anunciam feedback acessível em `web/src/features/approval/ApprovalCard.test.tsx`.

### Implementation for User Story 3

- [ ] T054 [US3] Criar reducer puro para estados `pending`, `approved` e `denied` em `web/src/features/approval/approval-state.ts`.
- [ ] T055 [US3] Adaptar o cliente para não interpretar `202` como erro em `web/src/api/client.ts`.
- [ ] T056 [US3] Criar componente `ApprovalCard` com título, descrição e status pendente em `web/src/features/approval/ApprovalCard.tsx`.
- [ ] T057 [P] [US3] Implementar ação `Aprovar` com estado em progresso e feedback `Aprovação registrada` em `web/src/features/approval/ApprovalCard.tsx`.
- [ ] T058 [P] [US3] Implementar ação `Negar` com estado em progresso e feedback `Negação registrada` em `web/src/features/approval/ApprovalCard.tsx`.
- [ ] T059 [US3] Desabilitar controles após decisão local e impedir uma decisão duplicada em `web/src/features/approval/ApprovalCard.tsx`.
- [ ] T060 [US3] Integrar o cartão de aprovação ao item de resposta no chat em `web/src/features/chat/MessageItem.tsx`.
- [ ] T061 [US3] Vincular o trace da resposta `202` à ação `Ver raciocínio` em `web/src/features/approval/ApprovalCard.tsx`.

**Checkpoint**: Resposta 202 renderizada como proposta pendente com decisão local acessível.

---

## Phase 6: User Story 4 — Configuração da API e tema (Priority: P2)

**Goal**: Permitir configurar a URL da API e alternar tema sem acessar o código-fonte.

**Independent Test**: Abrir a engrenagem, salvar uma URL válida, fechar e recarregar a página; após isso, o chat deve usar essa URL e respeitar o tema escolhido.

### Tests for User Story 4

- [ ] T062 [P] [US4] Testar rejeição de URL vazia, `javascript:` e protocolo não HTTP em `web/src/api/api-config.test.ts`.
- [ ] T063 [P] [US4] Testar remoção de barras finais e montagem de `/chat` em `web/src/api/api-config.test.ts`.
- [ ] T064 [P] [US4] Testar persistência e carregamento da URL em `web/src/api/api-config.test.ts`.
- [ ] T065 [P] [US4] Testar preferência inicial por `prefers-color-scheme` e persistência da escolha em `web/src/theme/theme.test.ts`.
- [ ] T066 [P] [US4] Testar abertura, validação e fechamento da modal de configurações em `web/src/features/settings/SettingsDialog.test.tsx`.

### Implementation for User Story 4

- [ ] T067 [US4] Criar botão de engrenagem com nome acessível em `web/src/features/settings/SettingsButton.tsx`.
- [ ] T068 [US4] Criar dialog de configurações com campo da URL da API em `web/src/features/settings/SettingsDialog.tsx`.
- [ ] T069 [US4] Validar URL HTTP/HTTPS na borda do formulário e manter o valor inválido visível em `web/src/features/settings/SettingsDialog.tsx`.
- [ ] T070 [US4] Persistir URL válida no `localStorage` e mostrar confirmação acessível em `web/src/features/settings/SettingsDialog.tsx`.
- [ ] T071 [US4] Implementar seleção explícita de light/dark/system em `web/src/theme/ThemeControls.tsx`.
- [ ] T072 [US4] Aplicar tema semântico com tokens de superfície, texto, borda e foco em `web/src/styles.css`.
- [ ] T073 [US4] Aplicar a URL salva a todas as chamadas posteriores do chat em `web/src/features/chat/use-chat.ts`.
- [ ] T074 [US4] Implementar fechamento por Escape e retorno de foco da engrenagem em `web/src/features/settings/SettingsDialog.tsx`.

**Checkpoint**: URL da API é configurável e persistida; tema claro/escuro funciona em todos os componentes.

---

## Phase 7: Estados globais, erros e UX operacional

**Purpose**: Uniformizar carregamento, erros HTTP, retry e feedback em toda a aplicação.

- [ ] T075 [P] Criar mapeamento puro de erros HTTP para mensagens operacionais em `web/src/api/error-messages.ts`.
- [ ] T076 [P] Testar mensagens para `400`, `422`, `504`, `500` e falha de rede em `web/src/api/error-messages.test.ts`.
- [ ] T077 Criar componente global de erro com `role="alert"` e ação de retry em `web/src/components/InlineAlert.tsx`.
- [ ] T078 [P] Diferenciar erro de campo no formulário da configuração e erro global da API em `web/src/features/settings/SettingsDialog.tsx` e `web/src/features/chat/ChatPage.tsx`.
- [ ] T079 [P] Garantir que retry reutiliza a última mensagem sem apagá-la em `web/src/features/chat/use-chat.ts`.
- [ ] T080 [P] Garantir loading inline proporcional para envio e loading do dialog em `web/src/features/chat/MessageComposer.tsx` e `web/src/features/trace/TracePanel.tsx`.
- [ ] T081 [P] Preservar o layout durante loading para evitar deslocamentos bruscos em `web/src/styles.css`.
- [ ] T082 [P] Criar estado de erro específico para CORS/rede indisponível em `web/src/api/error-messages.ts`.
- [ ] T083 [P] Anunciar loading e decisões por `aria-live` em `web/src/features/chat/ChatPage.tsx` e `web/src/features/approval/ApprovalCard.tsx`.

**Checkpoint**: Todos os estados assíncronos possuem feedback claro, acessível e recuperável.

---

## Phase 8: Responsividade, design e acessibilidade

**Purpose**: Validar hierarquia, escala de espaçamento, responsividade e requisitos WCAG da War Room.

- [ ] T084 [P] Aplicar hierarquia semântica com um `h1`, seções `h2` e subseções `h3` em `web/src/features/chat/ChatPage.tsx`.
- [ ] T085 [P] Usar escala de espaçamento baseada em múltiplos de 4 px em `web/src/styles.css`.
- [ ] T086 [P] Implementar layout desktop em aproximadamente `1440 px` em `web/src/styles.css`.
- [ ] T087 [P] Implementar layout tablet em aproximadamente `768 px` em `web/src/styles.css`.
- [ ] T088 [P] Implementar layout mobile em aproximadamente `375 px` em `web/src/styles.css`.
- [ ] T089 [P] Garantir áreas tocáveis mínimas de `44 × 44 px` nos controles principais em `web/src/styles.css`.
- [ ] T090 [P] Garantir contraste WCAG AA para texto normal, texto grande e controles em `web/src/styles.css`.
- [ ] T091 [P] Implementar estados de foco visíveis sem remover o foco nativo sem substituição em `web/src/styles.css`.
- [ ] T092 [P] Garantir que informação não depende apenas de cor nos estados e badges em `web/src/**/*.tsx`.
- [ ] T093 [P] Implementar reflow do histórico e dos dialogs em texto ampliado e zoom em `web/src/styles.css`.
- [ ] T094 [P] Validar navegação completa por teclado sem armadilhas em chat, trace e configurações.
- [ ] T095 [P] Validar modo claro e dark mode em desktop, tablet e mobile.
- [ ] T096 [P] Validar estados normal, vazio, loading, erro e aprovação em desktop, tablet e mobile.

**Checkpoint**: Interface está visualmente consistente e acessível nos tamanhos definidos.

---

## Phase 9: Integração e polish final

**Purpose**: Completar documentação, testes e gates de qualidade.

- [ ] T097 [P] Adicionar testes de integração HTTP da API configurada em `src/http/server.test.ts`.
- [ ] T098 [P] Atualizar `README.md` com base `/opspilot/`, URL da API, CORS e execução da SPA.
- [ ] T099 [P] Atualizar `.env.example` com variável de origens CORS permitidas, sem adicionar segredos.
- [ ] T100 [P] Criar exemplos de execução local da SPA e da API em `README.md`.
- [ ] T101 Executar `npm run typecheck` no workspace raiz.
- [ ] T102 Executar `npm test` no workspace raiz.
- [ ] T103 Executar `npm run build` na SPA e confirmar saída compatível com `/opspilot/`.
- [ ] T104 Executar o fluxo completo em browser: chat, 200, 202, trace, configurações e erros.
- [ ] T105 Executar validação visual em `1440 px`, `768 px` e `375 px`.
- [ ] T106 Executar validação de dark mode, teclado, foco, zoom e estados vazios/erro/loading.
- [ ] T107 Fazer revisão final da checklist de acessibilidade e design de `.github/instructions/design.instructions.md`.

**Checkpoint**: A War Room está integrada, testada, acessível e pronta para entrega local.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: pode começar imediatamente.
- **Foundational (Phase 2)**: depende da conclusão de Phase 1 e bloqueia todas as histórias de usuário.
- **User Stories (Phases 3-6)**: dependem de Phase 2.
  - P1: Chat, Trace e Aprovação são a entrega MVP.
  - P2: Configuração da API e tema podem ser implementadas após o MVP, ou em paralelo após os contratos base.
- **States/UX (Phase 7)**: pode começar após o cliente HTTP e os componentes principais existirem.
- **Design/a11y (Phase 8)**: depende dos componentes principais estarem implementados.
- **Polish (Phase 9)**: depende de todas as fases anteriores.

### User Story Dependencies

- **US1 Chat**: independentemente testável após contratos HTTP e store existentes.
- **US2 Trace**: depende da resposta tipada de US1, mas pode ser implementada em paralelo ao histórico após o contrato base.
- **US3 Aprovação 202**: depende da resposta do cliente de US1 e dos tipos de trace de US2.
- **US4 Configuração e tema**: depende do cliente HTTP base, mas é independente do conteúdo do chat.

### Within Each User Story

- Testes escritos antes da implementação.
- Contratos puros antes dos hooks React.
- Componentes acessíveis antes da integração visual final.
- Estado vazio, loading e erro no mesmo ciclo da feature.

### Parallel Opportunities

- T002-T008 são independentes após a criação inicial de `web/`.
- T009-T015 podem ser desenvolvidas em paralelo após o contrato principal ser definido.
- T016-T019 podem ser desenvolvidas em paralelo com os contratos da SPA.
- Os componentes de chat, trace, aprovação e settings podem ser trabalhados em paralelo depois dos tipos compartilhados.
- Os testes marcados `[P]` podem rodar em paralelo após os arquivos alvo serem criados.

---

## Implementation Strategy

### MVP First (US1-US3)

1. Complete Setup e Foundational.
2. Complete US1 — chat e histórico.
3. Complete US2 — trace tipado.
4. Complete US3 — aprovação HTTP 202.
5. Pare e valide o MVP no browser antes de avançar para settings e polish.

### Incremental Delivery

1. Base da SPA + contratos HTTP + CORS.
2. Chat funcional com loading e estados vazios/erro.
3. Trace tipado em dialog acessível.
4. Cartão 202 com Aprovar/Negar local.
5. Engrenagem de configuração e tema.
6. Responsividade, validação visual e release.
