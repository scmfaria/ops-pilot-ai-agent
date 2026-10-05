# Quickstart: OpsPilot reasoning core

## Pré-requisitos
- Node.js 22+
- npm
- variável de ambiente opcional para OpenRouter:
  - `OPEN_ROUTER_API_KEY`
  - `OPEN_ROUTER_MODEL`
  - `OPEN_ROUTER_BASE_URL`

## Instalação
```bash
npm install
cp .env.example .env
```

## Seed do store
```bash
npm run seed
```

## Arena
```bash
npm run arena -- --strategies react --max-iterations 4
npm run arena -- --strategies plan-and-execute --max-iterations 4
npm run arena -- --strategies react --strategies plan-and-execute --max-iterations 6
```

## Testes
```bash
npm test
npm run typecheck
```

## Resultado esperado
- O store inicial deve exibir 5 serviços e 6 alertas.
- O trace deve mostrar eventos em ordem determinística.
- As métricas devem indicar chamadas de LLM e tempo de resposta.
