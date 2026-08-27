// @ts-nocheck
// Gravação do Portal do Cliente.
// O cliente entra por protocolo/CNPJ e não possui sessão no Firebase, então as
// regras do Firestore bloqueiam a escrita direta. Toda alteração feita pelo
// portal passa por esta rota, que grava com a identidade de serviço e só aceita
// os campos da allowlist definida no servidor.
export async function salvarLeadPortal(leadId: string, dados: Record<string, any>) {
  const resp = await fetch("/api/portal/salvar-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId, dados }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.success) {
    throw new Error(data?.error || `Falha ao salvar (HTTP ${resp.status}).`);
  }
  return data;
}
