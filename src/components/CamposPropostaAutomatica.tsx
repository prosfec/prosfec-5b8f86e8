import type { CamposPropostaSolar } from "../lib/dadosSimulacaoProsfec";

export default function CamposPropostaAutomatica({ campos, onChange }: { campos: CamposPropostaSolar; onChange: (campos: CamposPropostaSolar) => void }) {
  const campo = (key: keyof CamposPropostaSolar, label: string, numeric = false) => <label key={key}>{label}<input value={campos[key]} maxLength={200} inputMode={numeric ? "decimal" : "text"} onChange={e => onChange({ ...campos, [key]: e.target.value })} /></label>;
  return <div className="simulacao-full simulacao-campos">
    <h3 className="simulacao-full">Dados da Proposta PROSFEC</h3>
    {campo("cliente", "Cliente / Razão social")}{campo("documento", "CPF / CNPJ")}
    {campo("cidadeUf", "Cidade / UF")}{campo("distribuidora", "Distribuidora")}
    {campo("consumo", "Consumo médio (kWh/mês)", true)}{campo("tarifa", "Tarifa (R$/kWh)", true)}
    {campo("disponibilidade", "Disponibilidade (R$)", true)}{campo("iluminacao", "Iluminação pública (R$)", true)}
    {campo("assessorNome", "Responsável pelo atendimento")}{campo("assessorWhatsapp", "WhatsApp do responsável")}
    {campo("validade", "Validade da proposta (dias)", true)}
  </div>;
}