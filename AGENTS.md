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
- Credit diagnosis requests never call an external API: the server records the request, debits the partner and queues it for staff to attach the PDF, because reports now come from an offline external source.
- The principal Assessoria/Avulso contract is discontinued; only already-signed ones are served, so historical signatures stay immutable while new contracts are only price-and-service documents.
- The admin dashboard loads Firestore collections lazily per tab (once per session) with server-side counts for menu badges; never reintroduce a full-database load on login or open-ended onSnapshot listeners, because they drove Firestore reads far above the free quota.
- Solar simulation PDFs and published offers are owned by the Mesa; store offers on the energy lead and reference their IDs from chat notes so lazy loading remains unchanged.
- Generate native solar proposal PDFs during Mesa publication and persist immutable input snapshots per offer; download fallbacks must use those snapshots, never the current lead, to preserve the published financial terms.
- Requesting and selecting solar offers uses Firestore transactions and matching security-rule validation; preserve published simulation notes when clearing chat so proposals remain accessible.
- Institutional energy capture uses the existing Firebase service identity over REST, signed same-origin submissions and create-only request IDs; never open anonymous Firestore writes or replace the existing CRM backend.
- Public energy referral responses project only the assessor's public-facing name and WhatsApp; lead attribution is revalidated server-side and uses the existing solar Kanban field names.
- Representante Comercial shares the solar partner portal (isEnergiaOnly) but skips the Assessor 22-day training, hour tracking and evaluation; its contract acceptance is stored on the partner doc with version, because the commercial-partnership contract is autonomous (no subordination).
- The partner-plant (usina) catalog and eligibility engine live in `src/lib/catalogoUsinas.ts` as code with tests; the Mesa recommendation only pre-fills offer fields and never blocks manual edits, because commercial terms change often and staff must keep the final say.
- Keep distributor and solar-panel fields outside full-dossier completeness; quotation requests validate their own prerequisites, preserving existing lead stages and requests.
- Render quotation request events through a shared ADM/partner card and recognize only the exact legacy system message; this preserves history without converting ordinary conversation into events.
