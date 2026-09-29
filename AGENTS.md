<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Persist admin movement-read timestamps on each lead, not browser storage, so the queue is shared across staff devices.

- Leads de energia solar ficam na coleção `leads_energia`, separada de `leads_distribuidos`, porque o funil solar tem fluxo comercial próprio (4 etapas, sem consulta/taxa).
- Saques solares e seus leads devem mudar de estado juntos em transações Firestore com validação dos IDs e valores atuais, porque a Mesa e o parceiro podem agir simultaneamente e um mesmo contrato não pode ser pago duas vezes.
