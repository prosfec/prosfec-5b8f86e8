# Limpeza da interface: preços antigos, "Afiliado" e resquícios de Hubla/Lastlink

Objetivo: a tela do parceiro deixa de mostrar preços defasados, a modalidade "Afiliado" some do cadastro e nenhum botão ou texto envia o parceiro para pagar em plataformas externas (Hubla/Lastlink), que já foram desligadas no servidor.

## O que muda

### 1. Seleção de plano no cadastro público (tela de Parceiros)
O campo "Selecione o seu Plano de Repasses" hoje mostra valores em reais. Passa a mostrar apenas:
- STARTER (0,5% repasse)
- Executive Partner PROSFEC (1,5% repasse)
- MASTER PARTNER (3,0% repasse)

Os identificadores gravados no banco continuam exatamente os mesmos.

### 2. Fim da opção "Afiliado"
- A opção AFILIADO é removida da lista de planos do cadastro.
- Os textos e condições ligados a esse tipo de conta na tela de cadastro concluído deixam de existir (o botão passa a ser sempre "Acessar Meu Painel Agora (Iniciar Teste de 3 Dias)").
- A área de Afiliados do painel já está desativada e permanece assim; nada de novo é exibido.
- Observação: o formulário de convite de equipe não tem preços nem "Afiliado", então não é alterado.

### 3. Remoção de tudo que aponta para Hubla/Lastlink
- Tela "Cadastro Efetuado": sai o botão "Garantir Plano Definitivo na Hubla".
- Tela de "Teste de 3 Dias Finalizado / Licença Vencida": sai o botão "Efetuar Pagamento na Hubla" e o texto que explica a liberação automática pela Hubla. Permanece o botão "Regularizar via WhatsApp", que passa a ser o caminho oficial, com o aviso ajustado para: a liberação é feita pela equipe PROSFEC após a confirmação do pagamento.
- Tela "Recurso de Prospecção Bloqueado" (Caça-Leads): mesmo tratamento — sai o botão de pagamento externo, fica o contato por WhatsApp.
- Avisos financeiros que citam "compensação bancária na Hubla" passam a falar apenas em prazo de compensação (48h no Pix, 15 dias no cartão), sem citar a plataforma.
- Cartão de configuração de "códigos/links de checkout Hubla" (dentro da área de afiliados, já oculta) é removido da tela.

## O que NÃO muda
- Nenhuma regra de gravação no banco, parâmetros de indicação na URL ou o teste grátis de 3 dias (`duracaoDias: 3`).
- Cálculo de comissões, saques e a tabela de preços dinâmica continuam iguais.
- Os campos técnicos já existentes no banco não são apagados; apenas deixam de aparecer na tela.

## Detalhes técnicos
- Arquivo principal: `src/components/PartnerPortal.tsx` (select de planos ~4736-4749; tela de sucesso ~4560-4580; bloqueio de assinatura ~4880-4930; bloqueio do Caça-Leads ~7380-7395; banners ~5980 e ~6298; bloco de códigos Hubla ~9549-9630).
- Remoção apenas de JSX/textos; estados e handlers relacionados a códigos Hubla que ficarem sem uso na interface serão removidos somente se não forem referenciados em nenhuma gravação.
- Ao final: `bunx tsgo --noEmit` e `bun run build`.
