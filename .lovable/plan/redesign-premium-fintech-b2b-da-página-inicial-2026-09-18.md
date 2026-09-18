# Redesign Premium Fintech B2B da página inicial

## Objetivo

Atualizar somente a página inicial pública da PROSFEC para a direção escolhida **Dark fintech glassmorphism**, preservando textos, links, ordem das seções, SEO, responsividade e toda a lógica atual do simulador.

## Direção visual aprovada

- **Paleta:** carvão `#0B0F14`, azul-petróleo `#13242A`, off-white `#F8FAFC` e verde `#22C55E`.
- **Tipografia:** Space Grotesk nos títulos e DM Sans nos textos.
- **Composição:** grade modular bento, com hierarquia forte e espaços amplos.
- **Movimento:** entradas curtas e elevação discreta nos cartões, com suporte a movimento reduzido.
- **Limites:** sem amarelo, roxo, visual cyberpunk, números inventados, sombras pesadas ou mudanças funcionais.

## Alterações

1. **Base visual da Home**
   - Isolar os novos tokens e padrões na página inicial para não alterar Admin, Portal do Parceiro ou páginas públicas de contrato/proposta.
   - Usar corpo off-white, títulos de seção escuros, rótulos verdes espaçados e cartões brancos com borda sutil.
   - Carregar Space Grotesk e DM Sans pelo cabeçalho global, mantendo fallbacks seguros.

2. **Navegação e hero escuro**
   - Adaptar a navegação à abertura escura sem alterar seus links ou ações.
   - Transformar o primeiro bloco em uma composição escura de alto contraste, com o texto e os botões atuais.
   - Recriar o “Exemplo de Diagnóstico” como painel flutuante translúcido, com profundidade, borda discreta e brilho verde contido.
   - Preservar os três sinais de confiança e a lista de linhas analisadas, sem adicionar métricas fictícias.

3. **Seções em grade modular**
   - Aplicar a linguagem bento em Segurança, Soluções, Momento da Empresa, Como Atuamos, Benefícios e Soluções Específicas.
   - Remover aparência de caixas repetitivas: variar proporções e hierarquia sem alterar o conteúdo ou a ordem.
   - Padronizar cartões com borda suave, ícones verdes e elevação máxima de poucos pixels.

4. **Destaques escuros**
   - Converter Diagnóstico PROSFEC e Programa de Parceiros em painéis carvão/azul-petróleo com borda translúcida.
   - Manter textos claros, checks verdes e todos os botões e destinos existentes.

5. **Simulador**
   - Envolver a experiência atual em uma superfície clara refinada, com borda sutil e profundidade leve.
   - Ajustar visualmente campos, seletores e barra de progresso para o padrão Apple/Stripe solicitado.
   - Não alterar cálculos, etapas, validações, envio ou estados existentes.

6. **FAQ, chamada final e rodapé**
   - Harmonizar FAQ e chamada final com o novo sistema visual.
   - Manter conteúdo, links e estrutura funcional do rodapé.

## Detalhes técnicos

- Alterações concentradas nos componentes já usados por `src/App.tsx`, nos estilos globais necessários e no carregamento das fontes.
- Tokens semânticos próprios para a Home; nenhuma regra visual dos painéis internos será reutilizada ou sobrescrita.
- Sem mudanças em Firebase, APIs, autenticação, pagamentos, contratos, dados ou regras de negócio.
- Metadados atuais da rota `/` serão preservados.

## Validação

- Conferir a Home em desktop e mobile, incluindo menu, hero, cartões, simulador, FAQ, chamadas e rodapé.
- Testar os botões de rolagem e links existentes.
- Verificar ausência de sobreposição, cortes de texto e rolagem horizontal.
- Confirmar compilação sem erros e revisar o contraste das superfícies claras e escuras.
