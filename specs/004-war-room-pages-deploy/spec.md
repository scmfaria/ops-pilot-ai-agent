# Feature Specification: Deploy da War Room Web no GitHub Pages

**Feature Branch**: `004-war-room-pages-deploy`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "deploy do web/ no pages via Actions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicação automática a cada mudança na interface (Priority: P1)

Como mantenedora do OpsPilot, quero que toda alteração aprovada na War Room (`web/`) que chegue à branch principal seja publicada automaticamente em um endereço público, para que operadores e avaliadores sempre acessem a versão mais recente sem passos manuais.

**Why this priority**: É o objetivo central da feature: sem publicação automática, a War Room só existe na máquina de quem desenvolve.

**Independent Test**: Fazer uma alteração visível em `web/`, integrá-la à branch principal e verificar que, ao final da execução da automação, o endereço público exibe a alteração.

**Acceptance Scenarios**:

1. **Given** uma alteração em `web/` integrada à branch principal, **When** a automação de publicação termina com sucesso, **Then** o endereço público exibe a nova versão da War Room.
2. **Given** uma alteração que não toca `web/` nem a própria automação (ex.: só a API), **When** ela é integrada à branch principal, **Then** nenhuma nova publicação é disparada.
3. **Given** a War Room publicada, **When** um usuário abre o endereço público, **Then** a página carrega com todos os estilos e scripts, sem recursos quebrados.

---

### User Story 2 - Publicação manual sob demanda (Priority: P2)

Como mantenedora, quero disparar uma publicação manualmente, para republicar a interface após mudar a configuração do repositório ou recuperar de uma falha, sem precisar criar um commit artificial.

**Why this priority**: Útil para recuperação e primeira configuração, mas o fluxo automático já entrega o valor principal.

**Independent Test**: Disparar a automação manualmente pela interface do repositório e verificar que uma nova publicação é concluída.

**Acceptance Scenarios**:

1. **Given** o repositório configurado para publicação, **When** a mantenedora dispara a automação manualmente, **Then** a War Room é reconstruída e republicada a partir do estado atual da branch principal.

---

### User Story 3 - Publicação segura e previsível (Priority: P2)

Como mantenedora, quero que a automação use apenas as permissões estritamente necessárias e nunca publique uma versão quebrada, para reduzir riscos ao repositório e evitar que usuários vejam uma página fora do ar.

**Why this priority**: Segurança por padrão é princípio da constituição do projeto; publicação parcial ou com falha prejudica a confiança na ferramenta.

**Independent Test**: Introduzir um erro que quebre a construção da interface e verificar que a versão publicada anterior permanece no ar; inspecionar as permissões concedidas à automação.

**Acceptance Scenarios**:

1. **Given** uma alteração que faz a construção da War Room falhar, **When** a automação executa, **Then** a publicação não acontece e a versão anterior continua disponível.
2. **Given** duas integrações seguidas na branch principal, **When** as automações se sobrepõem, **Then** as publicações acontecem em sequência, sem interromper uma publicação em andamento, e a versão final corresponde à integração mais recente.
3. **Given** a definição da automação, **When** suas permissões são revisadas, **Then** ela só pode ler o código, publicar a página e se identificar junto ao serviço de hospedagem — sem permissão de escrita no código.

---

### User Story 4 - Documentação de publicação e uso remoto (Priority: P3)

Como pessoa que chega ao projeto, quero instruções no README sobre como a War Room é publicada, qual a configuração única necessária no repositório e como conectar a página publicada a uma API, para conseguir reproduzir e usar o deploy sem ajuda.

**Why this priority**: Facilita adoção e manutenção, mas não bloqueia a publicação em si.

**Independent Test**: Seguir apenas o README, em um fork limpo, até ter a War Room publicada e conversando com uma API.

**Acceptance Scenarios**:

1. **Given** um fork do repositório, **When** a pessoa segue o README, **Then** consegue habilitar a publicação e ver a War Room no endereço público do fork.
2. **Given** a War Room publicada, **When** a pessoa segue o README para liberar a origem pública na API e informar a URL da API na interface, **Then** consegue enviar uma mensagem e receber resposta.

### Edge Cases

- A hospedagem serve a aplicação em um subcaminho com o nome do repositório, diferente da base padrão `/opspilot/` definida na spec 003: a publicação deve usar o subcaminho real da hospedagem, sem alterar a base padrão usada fora dela.
- Um fork com outro nome de repositório deve funcionar sem editar a automação.
- Acesso direto a um endereço interno inexistente da SPA (ex.: recarregar a página em um subcaminho) deve devolver a própria aplicação, não uma página de erro genérica da hospedagem.
- A página publicada é servida por HTTPS: uma API acessível apenas por HTTP fora de `localhost` será bloqueada pelo navegador (conteúdo misto); o README deve deixar isso claro.
- A origem pública não liberada no CORS da API: a interface deve mostrar o erro de conexão já previsto na spec 003, não falhar silenciosamente.
- A publicação não está habilitada nas configurações do repositório: a automação falha de forma visível, com indicação do passo pendente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A automação MUST construir e publicar a War Room sempre que houver integração na branch principal que altere `web/` ou a própria definição da automação.
- **FR-002**: A automação MUST permitir disparo manual.
- **FR-003**: A automação MUST NOT ser disparada por alterações exclusivas fora de `web/` e da própria automação.
- **FR-004**: A construção MUST usar dependências travadas pelo lockfile de `web/`, garantindo builds reprodutíveis.
- **FR-005**: A construção MUST gerar a aplicação com a base pública correspondente ao subcaminho real da hospedagem (derivado do nome do repositório), mantendo `/opspilot/` como base padrão fora desse contexto.
- **FR-006**: A publicação MUST ocorrer somente se a construção concluir com sucesso; falhas MUST manter a versão anteriormente publicada.
- **FR-007**: Publicações concorrentes MUST ser serializadas, sem cancelar uma publicação em andamento.
- **FR-008**: A automação MUST declarar apenas as permissões mínimas: leitura do código, escrita na publicação de páginas e emissão de token de identidade para a hospedagem.
- **FR-009**: A publicação MUST incluir um fallback que entregue a aplicação para endereços internos desconhecidos.
- **FR-010**: A execução MUST expor o endereço público resultante ao final da publicação.
- **FR-011**: O README MUST documentar: o fluxo de publicação, as permissões e o motivo de cada uma, a configuração única necessária no repositório, o endereço público, a sobrescrita da base pública e como liberar a origem publicada no CORS da API.
- **FR-012**: A automação MUST NOT exigir nem expor segredos; nenhuma credencial da API ou do provedor de modelo pode ser embutida na página publicada.

### Key Entities

- **Artefato de publicação**: o conjunto estático gerado da War Room (página, estilos, scripts, fallback), versionado por execução da automação.
- **Ambiente de publicação**: o destino público da página, com seu endereço e histórico de implantações.
- **Base pública**: o subcaminho sob o qual a aplicação é servida (`/opspilot/` por padrão; nome do repositório na hospedagem).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma alteração em `web/` integrada à branch principal fica visível no endereço público em até 5 minutos, sem intervenção manual.
- **SC-002**: 100% das publicações bem-sucedidas carregam a página sem recursos com erro (nenhum estilo ou script ausente).
- **SC-003**: 0 publicações ocorrem a partir de uma construção com falha.
- **SC-004**: Uma pessoa nova no projeto consegue publicar a War Room em um fork seguindo apenas o README em até 15 minutos.
- **SC-005**: Alterações que não tocam `web/` nem a automação geram 0 publicações.

## Assumptions

- O repositório é hospedado no GitHub e a publicação usa GitHub Pages com GitHub Actions, conforme pedido; a opção "Source: GitHub Actions" é configurada uma única vez por uma pessoa com acesso de administração.
- A branch principal é `main`.
- Não há domínio customizado nesta versão; o endereço é o padrão da hospedagem (`https://<owner>.github.io/<repo>/`).
- Apenas o frontend é publicado; a API continua sendo executada pela pessoa usuária (local ou em outro host) e não faz parte desta feature.
- A URL da API continua sendo configurada pela própria interface (spec 003), sem variáveis de build para isso.
- A spec 003 permanece válida: `/opspilot/` segue como base padrão; esta feature apenas adiciona a possibilidade de sobrescrevê-la no momento da construção.
- Não há preview por pull request nesta versão.
- Uma implementação inicial já existe (`.github/workflows/deploy-pages.yml`, `VITE_BASE` em `web/vite.config.ts` e seção no README) e deve ser revisada contra esta spec no `/speckit.plan`.
