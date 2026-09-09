# Ocultar link "Área Administrativa" do Footer da Home

## Objetivo

Remover apenas a exibição visual do link "Área Administrativa" do rodapé da página inicial pública, sem afetar a rota `/admin`, o painel administrativo, autenticação, permissões, APIs, Firestore ou qualquer outra funcionalidade.

## Localização confirmada

O link está em `src/components/Footer.tsx`, dentro do subfooter (linhas 200-206):

```tsx
<a
  id="footer-admin-link"
  href="/admin"
  className="hover:text-white transition-colors cursor-pointer opacity-70"
>
  Área Administrativa
</a>
```

A busca por `/admin` e "Área Administrativa" nos componentes da Home (`src/components`, `src/App.tsx`, `src/routes/index.tsx`) retornou apenas essa ocorrência.

## Alteração a ser feita

1. Remover o elemento `<a id="footer-admin-link" ...>Área Administrativa</a>` do subfooter em `src/components/Footer.tsx`.
2. Manter os links adjacentes (Termos de Uso, Política de Privacidade) e toda a estrutura/funcionalidade do Footer intactos.
3. Não alterar `src/routes/admin.tsx`, `src/components/AdminDashboard.tsx`, autenticação, regras do Firestore, APIs ou qualquer outro arquivo.

## Verificação pós-alteração

- A Home não deve mais exibir o botão/link "Área Administrativa" no rodapé.
- A rota `https://prosfec.com.br/admin` continua acessível diretamente.
- O painel administrativo continua funcionando normalmente.
- Typecheck e build passam sem erros.
