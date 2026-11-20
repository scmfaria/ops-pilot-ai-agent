---
applyTo: "web/**"
---

# Instruções de design para interfaces web

Use estas regras para criar ou revisar qualquer interface dentro de `web/**`. O objetivo é produzir uma interface consistente, utilizável, responsiva e acessível, não apenas visualmente bonita.

## Hierarquia visual

- Organize a página em: contexto global, título da tela, conteúdo principal e ações secundárias.
- Use uma hierarquia clara de títulos: um único `h1` por tela, `h2` para seções principais e `h3` para subseções.
- Destaque o conteúdo por peso, tamanho e contraste — evite introduzir cores como único mecanismo de hierarquia.
- Posicione ações primárias perto do contexto relacionado e mantenha ações destrutivas separadas das ações comuns.
- Prefira layouts previsíveis e agrupamentos com significado. Use cards apenas quando o agrupamento possui uma relação funcional real.
- Evite excesso de bordas, sombras e divisores. Priorize espaçamento e alinhamento para separar regiões.

## Escala de espaçamento

- Use uma escala consistente baseada em múltiplos de 4 px: `4`, `8`, `12`, `16`, `24`, `32`, `48` e `64` px.
- Use `8 px` como unidade base na maioria dos componentes.
- Use espaçamento interno menor que o espaçamento externo entre regiões.
- Preserve alinhamento horizontal e vertical em linhas, grades e cards.
- Em layouts responsivos, reduza espaçamentos largos antes de remover conteúdo essencial.
- Não use valores arbitrários sem necessidade comprovada. Centralize tokens de espaçamento no tema ou nas classes compartilhadas.

## Estados vazios

- Todo estado vazio deve explicar o que aconteceu e indicar uma ação útil possível.
- Inclua, quando apropriado: título curto, descrição objetiva, ícone ou ilustração discreta e uma ação principal.
- Não use textos genéricos como “Nada aqui” sem contexto.
- Exemplo:
  - Título: “Nenhum incidente ativo”
  - Descrição: “Não há alertas em andamento no momento.”
  - Ação: “Ver histórico”
- Estados vazios não devem parecer estados de carregamento nem estados de erro.

## Estados de erro

- Erros devem identificar o problema, a causa conhecida e a próxima ação possível.
- Use erro próximo ao campo ou conteúdo afetado. Reserve banners ou mensagens globais para erros que afetam a tela inteira.
- Todo erro deve possuir uma indicação não apenas visual: texto claro, `role="alert"` ou outro mecanismo semântico adequado.
- Diferencie validação de formulário, falha temporária de rede, acesso negado e falha grave do sistema.
- Em formulários, preserve os dados inseridos e mostre mensagens específicas junto aos campos inválidos.
- Se houver tentativa automática ou retentativa manual, informe o estado e evite ação duplicada durante o processamento.

## Carregamento e feedback

- Use indicadores proporcionais ao tempo da operação: texto inline para ações rápidas e skeleton ou indicador claro para carregamentos maiores.
- Prefira preservar o layout durante o carregamento para evitar deslocamentos bruscos.
- Desabilite ou represente como em progresso ações que podem iniciar operações duplicadas.
- Anuncie feedbacks assíncronos importantes para tecnologias assistivas.
- Não use apenas animação ou cor para comunicar estado.

## Dark mode

- Dark mode deve ser uma variante semântica do tema, não uma simples inversão de todas as cores.
- Use tokens para superfícies, texto, bordas, foco e estados de feedback.
- Defina hierarquia de superfícies: fundo, superfície elevada, conteúdo em destaque e overlays.
- Garanta contraste em textos, ícones informativos, controles e estados ativos em ambos os temas.
- Não use preto puro indiscriminadamente; prefira uma escala neutra adequada ao contexto.
- Respeite `prefers-color-scheme` e permita controle explícito do usuário quando o produto possuir tema configurável.
- Mantenha sombras sutis no modo claro e elevações visuais consistentes no modo escuro.

## Acessibilidade

- Aplique semântica HTML adequada antes de adicionar atributos ARIA ou JavaScript.
- Use elementos interativos nativos sempre que possível.
- Toda interação via ponteiro deve também ser acessível por teclado.
- Defina ordem de foco previsível e preserve o foco após atualizações ou fechamento de dialogs.
- Use estados de foco visíveis com contraste adequado e nunca os remova com `outline: none` sem substituição equivalente.
- Todas as imagens com conteúdo informativo precisam de texto alternativo adequado. Imagens decorativas devem ser ocultadas da acessibilidade.
- Ícones usados como controle precisam de nome acessível, por meio de `aria-label`, texto visível ou alternativa equivalente.
- Não transmita informação apenas por cor. Adicione texto, ícone ou padrão junto a estados vermelhos, verdes e de alerta.
- Respeite zoom, reflow em telas estreitas e texto ampliado.
- Mantenha áreas tocáveis com tamanho prático; como referência mínima, use `44 × 44 px` para ações principais.
- Garanta contraste WCAG AA mínimo: `4.5:1` para texto normal e `3:1` para texto grande e elementos gráficos essenciais.
- Inclua labels explícitos em campos de formulário e associe instruções e erros ao campo por meio de referências semânticas.
- Evite conteúdo que pisque ou se mova sem controle do usuário.

## Responsividade

- Parta do conteúdo real e valide layouts estreitos, médios e largos.
- Evite larguras fixas que podem causar scroll horizontal.
- Empilhe elementos antes de comprimir texto ou controles.
- Mantenha navegação, busca e ações críticas acessíveis em diferentes tamanhos de tela.
- Em tabelas grandes, prefira scroll horizontal controlado, reformatação ou layout em cards quando apropriado.

## Simulação antes da implementação

Quando houver ferramenta de navegador disponível, use um simulador visual para validar a interface em pelo menos três estados:

1. Desktop: largura aproximada de `1440 px`.
2. Tablet: largura aproximada de `768 px`.
3. Mobile: largura aproximada de `375 px`.

Também valide:

- estado normal;
- estado vazio;
- estado de carregamento;
- estado de erro;
- modo claro;
- modo escuro;
- navegação apenas por teclado;
- zoom ou texto ampliado;
- mensagens exibidas para tecnologias assistivas.

Se estiver implementando com Cursor ou GitHub Copilot, peça ou produza uma checklist antes da alteração e uma verificação após a alteração. Não invente dados ou comportamentos não pedidos; use dados de exemplo claramente identificáveis e estados previsíveis.

## Processo esperado da implementação

1. Identifique os componentes afetados e os estados necessários.
2. Utilize os componentes e tokens existentes antes de criar novos primitives.
3. Preserve dados visíveis e estado do usuário durante interações.
4. Trate erro, vazio e carregamento como estados de primeira classe.
5. Revise contraste, foco, semântica e navegação por teclado.
6. Execute testes de componente, testes de acessibilidade quando disponíveis e a validação visual nos tamanhos definidos.

## Checklist final

- [ ] Hierarquia visual está clara.
- [ ] Espaçamento usa escala consistente.
- [ ] Estados normal, vazio, erro e carregamento foram considerados.
- [ ] Dark mode utiliza tokens semânticos e mantém contraste.
- [ ] Layout funciona em mobile, tablet e desktop.
- [ ] Navegação por teclado funciona corretamente.
- [ ] Foco é visível e previsível.
- [ ] Elementos possuem nomes e semântica adequados.
- [ ] Informações não dependem apenas de cor.
- [ ] Feedback assíncrono é anunciado quando necessário.
