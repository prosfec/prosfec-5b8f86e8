# Fazer as simulações da Home voltarem a aparecer nos painéis

## O que foi verificado no código

- A tela de resultado envia a simulação para a nova rota do servidor com um código próprio (ex.: `PRF-482913`) em `src/App.tsx`.
- Quando vem esse código, o servidor grava o lead usando uma gravação parcial, que precisa listar **o nome de cada campo** na própria URL de gravação.
- Um dos campos gravados chama-se **`recomendações`** (com acento e cedilha). Nomes de campo com acento não são aceitos nessa forma de listagem sem tratamento especial — o banco recusa a gravação inteira.
- Antes da mudança, a gravação era feita pela biblioteca do Firebase, que tratava esse nome automaticamente. Por isso o problema só apareceu agora.
- Na tela, a falha é apenas registrada como aviso no console (`console.warn`) e nada é mostrado ao visitante — daí a impressão de que "salvou", quando na verdade nada foi gravado.
- Os painéis não têm problema: o Admin lista por data de criação e o portal do parceiro filtra por `parceiroId`, e ambos os campos estão presentes no documento montado.

Observação: essa é a causa mais provável identificada na leitura do código; o primeiro passo abaixo confirma com um teste real antes de considerar resolvido.

## Correções

### 1. Gravação parcial à prova de nomes com acento (servidor)
- Tratar corretamente qualquer nome de campo fora do padrão simples (acento, cedilha, espaço, hífen) ao montar a lista de campos da gravação.
- Isso conserta de uma vez todas as gravações parciais do sistema, não só a da simulação.

### 2. Criação mais segura do lead novo
- Para um lead que ainda não existe, gravar o documento inteiro de uma vez (sem lista de campos), mantendo o código de rastreio como identificador.
- Assim, um nome de campo problemático nunca mais impede o cadastro de um lead novo.

### 3. Campos garantidos em todo lead da Home
- Garantir sempre `status: "novo"`, `etapa: 1`, `dataCriacao` e `updated_at` no lead criado, para aparecer nas listagens e no funil desde o primeiro instante.
- Em lead já existente, esses campos continuam preservados como hoje.

### 4. Falha deixa de ser silenciosa
- Na tela, registrar o erro real com `console.error` (mensagem e código de retorno da rota), facilitando o diagnóstico futuro.
- O visitante continua vendo o resultado normalmente, sem mensagem de erro.

### 5. Verificação
- Fazer uma simulação de teste pela Home e confirmar que o lead aparece no painel do Admin e, com link de indicação, também no portal do parceiro.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`
  - `firestoreDocUrl`: escapar cada máscara — se não casar `/^[A-Za-z_][A-Za-z0-9_]*$/`, envolver em crases e aplicar `encodeURIComponent` no fieldPath.
  - `POST /api/public/leads/simulacao`: no caminho de lead novo com `leadId`, usar gravação sem `updateMask` (documento completo) e acrescentar `status`, `etapa`, `dataCriacao`, `updated_at` quando ausentes.
- `src/App.tsx` — `handleLeadCaptured`: trocar `console.warn` por `console.error` com status e mensagem da resposta.
- Sem mudanças em regras do Firestore, autenticação, comissões, layout ou nas consultas dos painéis.
