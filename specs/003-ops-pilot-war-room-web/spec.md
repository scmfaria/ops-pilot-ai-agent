# Spec: War Room Web do OpsPilot

## Contexto

Criar uma interface web chamada **War Room** para operadores acompanharem incidentes e interagirem com o copiloto OpsPilot. A aplicação será uma SPA construída com Vite, React e TypeScript, organizada como uma interface operacional de chat com visualização detalhada do raciocínio.

A interface deve seguir as regras de design de `.github/instructions/design.instructions.md` e consumir a API HTTP existente do OpsPilot.

## Objetivos

- Permitir que o operador envie mensagens ao agente pelo endpoint `POST /chat`.
- Exibir respostas, histórico da conversa e métricas básicas.
- Permitir abrir o trace tipado da execução em uma visualização estruturada.
- Representar respostas aguardando decisão humana como cartões de aprovação ou negativa.
- Permitir configurar a URL da API sem alterar o código.
- Suportar implantação da SPA na base `/opspilot/` e comunicação cross-origin com a API.

## Requisitos

### 1. Stack e estrutura

- A aplicação deve usar Vite, React e TypeScript.
- A aplicação deve ser criada dentro de `web/`.
- Os arquivos públicos devem suportar uma base de implantação configurável.
- A base de produção da aplicação deve ser `/opspilot/`.

### 2. Tela de chat War Room

- A tela principal deve apresentar:
  - título da War Room;
  - histórico da conversa;
  - campo de mensagem;
  - botão de envio;
  - seletor da estratégia `react` ou `plan-and-execute`;
  - opção para ativar reflexão.
- Cada mensagem do usuário deve aparecer alinhada separadamente da resposta do assistente.
- Enquanto uma resposta estiver sendo processada, o envio deve ficar bloqueado e um estado de carregamento deve ser anunciado.
- O `conversationId` recebido pela API deve ser reutilizado nas mensagens seguintes.
- O estado vazio deve explicar que ainda não existe conversa ativa e sugerir uma primeira pergunta.

### 3. Trace tipado

- Cada resposta que possuir trace deve mostrar uma ação `Ver raciocínio`.
- O botão deve abrir um painel, drawer ou modal acessível contendo os eventos tipados:
  - `thought`;
  - `action`;
  - `observation`;
  - `plan`;
  - `critique`;
  - `answer`.
- Eventos `action` devem renderizar `tool` e `args` de forma estruturada.
- Eventos devem ser apresentados em ordem pelo campo `step`.
- Um trace vazio deve ter um estado vazio próprio, não parecer uma falha.
- Ao fechar o painel, o foco deve retornar ao botão que abriu o trace.

### 4. Resposta HTTP 202 — aprovação humana

- Quando a API responder com `202 Accepted`, a interface deve interpretar a resposta como uma proposta aguardando decisão.
- A resposta 202 deve renderizar um cartão de ação com:
  - resumo da proposta;
  - indicação visual e textual de status pendente;
  - botão `Aprovar`;
  - botão `Negar`;
  - acesso ao trace associado, quando fornecido.
- Os botões devem ter estados de carregamento e desabilitados após uma decisão local.
- Antes de uma integração real de decisão, Aprovar e Negar podem atualizar apenas o estado da conversa com feedback claro: `Aprovação registrada` ou `Negação registrada`.
- O cartão não deve ser reapresentado como pendente após uma decisão.
- O status HTTP 202 não deve ser tratado como erro de rede.

### 5. Configuração da API

- Um botão de engrenagem deve abrir as configurações da integração.
- A configuração deve permitir informar a URL base da API HTTP.
- A URL configurada deve ser usada para montar a chamada `POST {baseUrl}/chat`.
- Remover barras finais deve evitar URLs com `//chat`.
- A configuração deve validar uma URL HTTP ou HTTPS antes de salvar.
- A configuração deve persistir localmente no navegador.
- O padrão configurável deve apontar para o servidor local de desenvolvimento, sem substituir o valor salvo pelo usuário.

### 6. Base da aplicação

- A aplicação deve usar `/opspilot/` como base pública em produção.
- A configuração do servidor de desenvolvimento deve permitir acesso direto em `/opspilot/`.
- Links e navegação internos devem respeitar a base, sem depender de caminho absoluto `/`.

### 7. CORS

- A API Express deve aceitar chamadas da origem do frontend em desenvolvimento e em implantação configurada.
- Os métodos permitidos devem incluir `POST` e `OPTIONS`.
- Os headers permitidos devem incluir `Content-Type` e `Authorization` caso autenticação seja implementada posteriormente.
- O fluxo deve permitir preflight OPTIONS para `POST /chat`.
- A origem permitida não deve ser codificada em um único ambiente quando houver configuração externa; a configuração deve preferir uma lista ou variável de ambiente.
- Em modo de desenvolvimento, localhost na porta do Vite deve ser permitido.

### 8. Estados vazios e de erro

- Estado vazio: nenhuma mensagem ou nenhum trace.
- Estado de carregamento: envio em andamento ou abertura de dados assíncronos.
- Erros HTTP devem informar status e uma próxima ação possível.
- Erros específicos devem ser diferenciados:
  - `400`: requisição inválida;
  - `422`: estratégia desconhecida;
  - `504`: timeout da API;
  - falha de rede: API indisponível ou CORS incorreto.
- Erros devem oferecer uma ação de tentar novamente sem apagar a mensagem do usuário.
- Erros globais devem usar semântica de alerta acessível.

### 9. Design e acessibilidade

- Deve ser aplicado dark mode com respetio a `prefers-color-scheme` e controle explícito do usuário.
- A hierarquia, escala de espaçamento, estados vazios, estados de erro, dark mode e responsividade devem seguir `.github/instructions/design.instructions.md`.
- O layout deve ser funcional em `1440 px`, `768 px` e `375 px`.
- Todos os controles devem ser acessíveis por teclado.
- Foco visível, labels explícitos, nomes acessíveis e navegação sem armadilhas são obrigatórios.
- Mensagens de carregamento e decisão devem ser anunciadas por tecnologias assistivas.
- Contraste deve atender WCAG AA.

## Contratos de dados

### Requisição `POST /chat`

```json
{
  "message": "Liste os alertas disparados",
  "strategy": "react",
  "reflect": false,
  "conversationId": "conv-opcional"
}
```

### Resposta `200`

```json
{
  "answer": "...",
  "trace": [],
  "metrics": {
    "llmCalls": 1,
    "latencyMs": 142,
    "historyMessages": 0
  },
  "conversationId": "conv-id"
}
```

### Resposta `202`

```json
{
  "answer": "Abrir incidente para api-gateway",
  "trace": [],
  "metrics": {
    "llmCalls": 1,
    "latencyMs": 142,
    "historyMessages": 0
  },
  "conversationId": "conv-id",
  "pendingApproval": true,
  "proposal": {
    "title": "Ação recomendada",
    "description": "Abrir incidente para api-gateway"
  }
}
```

O frontend deve tratar `pendingApproval` como opcional e, para compatibilidade, também reconhecer uma resposta 202 com os campos existentes quando `pendingApproval` não estiver presente.

## Critérios de aceitação

- Uma SPA Vite React TypeScript roda em `/opspilot/`.
- O chat envia mensagens ao endpoint configurado e mantém `conversationId`.
- Respostas `200` são exibidas com histórico e métricas.
- O botão `Ver raciocínio` abre o trace tipado e pode ser fechado pelo teclado.
- Respostas `202` renderizam cartão com Aprovar e Negar.
- Engrenagem permite configurar e persistir a URL da API.
- Preflight CORS e chamadas de browser são aceitos pela API.
- Estados vazio, carregamento, erro e decisional são implementados.
- Desktop, tablet e mobile são validados visualmente.
- Dark mode e navegação por teclado são validados.
- `npm run typecheck` e os testes existentes permanecem verdes.

## Fora de escopo nesta especificação

- Autenticação e autorização de usuários.
- Persistência server-side das decisões Aprovar/Negar.
- Criar ou integrar endpoints reais de aprovação além do fluxo opcional definido pelo frontend.
- Implementar videoconferência ou colaboração em tempo real.
- Criar painéis completos de alertas e incidentes além da experiência de chat.
