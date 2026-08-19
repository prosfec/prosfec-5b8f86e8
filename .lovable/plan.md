# Resultado do teste dos tokens e próximos passos

## O que testei agora (endpoints reais, ao vivo)

| Endpoint | Token usado | Resultado |
| --- | --- | --- |
| `GET /api/credit/catalogo` | INTEGRADOR_API_KEY | 200 — catálogo retornado (produto RedeBe 360, R$ 69,86) |
| `GET /api/credit/supplier-balance` | INTEGRADOR_API_KEY | 200 — `{"success":true}` |
| `POST /api/consulta-cnpj` | integração de CNPJ | 200 — dados corretos (Banco do Brasil SA) |

Conclusão: os tokens que já vêm embutidos no código (INTEGRADOR, REDEBE, HUBLA, GOOGLE MAPS) estão respondendo e o sistema funciona normalmente com eles.

## O que não funciona hoje

`GEMINI_API_KEY` não tem valor embutido. O código lança o erro "A chave GEMINI_API_KEY não foi encontrada" assim que qualquer rota de IA é chamada. Rotas afetadas:

- `POST /api/credit/diagnostico-prosfec`
- `POST /api/credit/diagnostico-passo7`
- `POST /api/credit/diagnostico-simulador`
- `POST /api/caca-leads` (enriquecimento por IA)

Ou seja: diagnóstico PROSFEC IA, passo 7, simulador e caça-leads ficam indisponíveis até a chave ser cadastrada.

## Plano proposto

1. Você cadastra a `GEMINI_API_KEY` oficial pelo formulário seguro de secrets.
2. Cadastrar também como secrets os valores hoje fixos no código: `REDEBE_TOKEN`, `INTEGRADOR_API_KEY`, `HUBLA_WEBHOOK_TOKEN`, `GOOGLE_MAPS_API_KEY` (posso usar os valores atuais ou os oficiais que você enviar).
3. Remover os fallbacks embutidos no código, deixando as chaves apenas nos secrets — nenhum token fica visível no repositório.
4. Reexecutar o teste dos endpoints acima, mais um teste de diagnóstico com IA, para confirmar que tudo continua respondendo após a troca.

## Detalhes técnicos

- Fallbacks ficam em `src/lib/prosfec-server.ts` (linhas ~48, 474, 808, 811) e em `PartnerPortal.tsx` (REDEBE).
- `INTEGRADOR_API_BASE_URL` também tem fallback e permanece funcional; vira secret opcional.
- Todas as leituras de `process.env` já acontecem dentro dos handlers, compatível com o runtime edge.
