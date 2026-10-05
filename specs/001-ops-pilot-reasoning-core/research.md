# Research: Núcleo de raciocínio do OpsPilot

## Decisão
Implementar um núcleo de raciocínio em `src/agents` com:
- uma interface `ReasoningStrategy`
- uma fábrica `createOpenRouterModel()`
- ferramentas em memória baseadas em `MemoryOpsStore`
- duas estratégias comparáveis: ReAct e Plan-and-Execute
- uma arena mínima para execução em CLI

## Rationale
A arquitetura atual já define a stack necessária: Node 22, TypeScript strict, Zod, LangChain/LangGraph e Express. O runtime já possui as dependências necessárias, então o núcleo deve seguir o padrão MVC adotado pelo projeto, mantendo lógica de negócio e ferramentas isoladas de I/O e respeitando a borda de entrada com Zod.

## Alternativas Consideradas

### 1. Implementar tudo em um único arquivo
Rejected: mistura responsabilidades e dificulta testes determinísticos.

### 2. Usar banco real MySQL desde o início
Rejected: a feature pede store em memória com seed determinístico; MySQL real adicionaria variáveis de infra e rede desnecessárias.

### 3. Emular estratégias sem LangGraph
Rejected: o stack obrigatória exige LangChain/LangGraph sobre OpenRouter; o uso do prebuilt `createReactAgent` reduz riscos e mantém compatibilidade com a stack do projeto.

## Convenções de implementação
- Validação em borda com Zod sempre que houver entrada de ferramentas ou CLI.
- Funções puras para domínio e persistência in-memory.
- Trace estruturado para observabilidade e debugging.
- Métricas de latência e contagem de chamadas LLM para comparações de estratégia.
- Testes sem rede usando `node:test` e mocks in-memory.
