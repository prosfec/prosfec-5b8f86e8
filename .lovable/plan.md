# Redesign Fintech Premium — Portal do Parceiro PROSFEC

## Por que o redesign anterior quase não apareceu

A auditoria do código mostra a causa, e ela não é falta de estilos:

1. Cada bloco do portal carrega a aparência escrita diretamente no próprio elemento (fundo branco, texto escuro, borda cinza, sombra e arredondamento fixos, um a um). As regras premium criadas antes foram escritas como ajustes gerais por fora e, na prática, quase sempre perdem para o que está escrito no elemento — sobrou apenas uma diferença sutil de borda e sombra.
2. As classes premium foram aplicadas em pouquíssimos pontos (menu lateral, topo, cartão do link e três cartões). Todo o resto do painel — cartão do parceiro, funil, leads recentes, Passo 6, comissões, tabelas, abas e janelas — continuou com a aparência antiga.
3. A estrutura (a ordem e o tamanho dos blocos) não mudou. Sem mudar composição e hierarquia, trocar tom de cinza não muda a percepção.

Conclusão: a correção exige reescrever a aparência dentro dos blocos, e não acrescentar mais regras gerais.

## O que será feito

Reconstrução visual do Portal do Parceiro inteiro, em tema escuro premium como padrão (o botão "Aparência" continua alternando para o claro, que permanece coerente), mantendo a densidade compacta atual.

Nada de lógica muda: dados, cálculos, comissões, pagamentos, rotas, consultas e permissões ficam exatamente como estão.

### 1. Base do tema
- O portal passa a abrir no visual escuro; a preferência salva do usuário continua respeitada.
- Superfícies: fundo preto-grafite, cartões chumbo com borda finíssima, verde PROSFEC para positivo, âmbar/vermelho apenas para status. Sem amarelo, sem neon exagerado.
- Um conjunto pequeno de estilos de bloco (cartão, cartão-destaque, painel, linha de lista, rótulo, valor, faixa de status) usado por todos os blocos, para que a aparência pare de ser escrita elemento a elemento.

### 2. Menu lateral
Logo, identidade do parceiro e grupos: OPERAÇÃO (Dashboard, Funil Kanban Vendas, Painel de Oportunidade, Minha Equipe quando houver), FINANCEIRO (Serviços Contábeis, Controle de Serviços), CONTA (Meu Perfil, Contrato de Parceria) e, no rodapé, Aparência, Voltar ao Site e Sair. Item ativo com fundo verde translúcido, borda sutil, indicador lateral e ícone destacado. Nenhum destino de link muda.

### 3. Topo
Barra tipo terminal financeiro: saudação e nome, código do parceiro, selo de status e as ações atuais, com mais respiro e contraste.

### 4. Cartão de identidade do parceiro
Nome, empresa, plano, código e status em um cartão premium com selo de nível, em vez do bloco administrativo atual.

### 5. Métricas financeiras
- Primeiro nível, em destaque: Crédito Aprovado Real, Comissões & Repasses, Saldo Disponível — número grande, rótulo pequeno, ícone, microtexto e leve brilho verde.
- Segundo nível, discreto: Total Indicados, Em Atendimento, Consultas e Buscas.
- Nenhuma métrica nova; só os dados que já existem.

### 6. Link de indicação
Vira ferramenta comercial: título, descrição, URL em destaque, botão copiar, status de afiliação e o QR Code caso já exista hoje.

### 7. Funil e leads recentes
Funil com estágio, quantidade, percentual e barra segmentada de progressão (mesmos estágios e cálculos). Leads recentes viram lista operacional: identificação, empresa, estágio, status, data e ação, em linhas de altura uniforme.

### 8. Passo 6 — Desempenho & Controle Financeiro de Serviços
Reorganizado como extrato financeiro: cabeçalho, totais, indicadores, filtros e busca em uma faixa de controle, depois a lista de clientes com detalhes expansíveis. Os botões "Todos os detalhes"/"Recolher" e todos os filtros continuam funcionando igual.

### 9. Comissões
Aparência de carteira: saldo disponível em destaque, conquistada/pendente/paga/em processamento com status claros, valores alinhados à direita e o botão Solicitar Comissão preservado.

### 10. Janelas e abas
Adicionar Saldo, Recarga, Solicitar Comissão, Ficha do Lead e demais janelas recebem o mesmo padrão (cabeçalho, corpo e rodapé), mantendo o comportamento e a rolagem no celular já corrigida.

### 11. Responsivo e performance
Desktop com menu fixo, tablet em duas colunas, celular com gaveta, cartões empilhados, sem corte lateral e alvos de toque grandes. Transições curtas (150–250ms), sem efeitos pesados, respeitando redução de movimento.

## Detalhes técnicos

- Arquivos: `src/components/PartnerPortal.tsx` (principal) e `src/styles.css` (escopo `.soft-ui`, sem afetar Home, ADM e páginas públicas); componentes filhos do portal só se controlarem a aparência de um bloco.
- Substituir as classes de aparência espalhadas nos blocos por um conjunto único de classes de superfície, evitando o conflito que anulou o trabalho anterior.
- Tema escuro como padrão inicial do portal, mantendo a persistência da escolha do usuário.
- Execução em 5 etapas (base+menu+topo / identidade+métricas / link+funil+leads / Passo 6+comissões / janelas+responsivo), com typecheck e build ao final de cada uma.
- Validação visual por captura de tela dos blocos no desktop, tablet e celular, nos dois temas; o login de parceiro não está disponível no ambiente de testes, então o usuário confirma no acesso dele ao final.
