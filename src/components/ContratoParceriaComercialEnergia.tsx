import { CONTRATO_PARCERIA_COMERCIAL_LINHAS } from "@/lib/contratoParceriaComercial";

export const PLANO_REPRESENTANTE_COMERCIAL = "Representante Comercial";
export const isRepresentanteComercial = (plano?: string) =>
  !!plano && plano.toUpperCase().includes("REPRESENTANTE COMERCIAL");

export interface DadosRepresentante {
  nome?: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  whatsapp?: string;
  cidade?: string;
  chavePix?: string;
}

const TABELA_USINAS = [["Usina 25", "40%"], ["Usina 26", "40%"], ["Usina 28", "40%"], ["Usina 102", "40%"], ["Usina 114", "40%"]];
const TABELA_SERENA = [
  ["Até 3.000 kWh", "30%", "15%", "15%"],
  ["De 3.001 a 10.000 kWh", "40%", "20%", "20%"],
  ["De 10.001 a 20.000 kWh", "50%", "25%", "25%"],
  ["De 20.001 a 50.000 kWh", "60%", "30%", "30%"],
  ["Acima de 50.000 kWh", "70%", "35%", "35%"],
];

function Tabela({ cab, linhas }: { cab: string[]; linhas: string[][] }) {
  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-[11px] border border-border">
        <thead><tr>{cab.map(c => <th key={c} className="border border-border px-2 py-1 text-left font-bold text-foreground bg-muted">{c}</th>)}</tr></thead>
        <tbody>{linhas.map(l => <tr key={l[0]}>{l.map((c, i) => <td key={i} className="border border-border px-2 py-1">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const isTitulo = (l: string) =>
  /^(CLÁUSULA|ANEXO|CONDIÇÕES GERAIS|CONTRATO DE PARCERIA|TERMO DE ADESÃO|CONDIÇÕES COMERCIAIS E|POLÍTICA DE UTILIZAÇÃO|ACEITE FINAL|CONSIDERANDO)/.test(l) ||
  /^\d+\. [A-ZÀ-Ú –\-]+$/.test(l);

export function ContratoParceriaComercialEnergia({ parceiro, aceitoEm }: { parceiro: DadosRepresentante; aceitoEm?: string | null }) {
  const doc = parceiro.cnpj || parceiro.cpf || "";
  const dataLocal = aceitoEm
    ? `${parceiro.cidade || "—"}, ${new Date(aceitoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (aceite eletrônico)`
    : `${parceiro.cidade || "—"}, na data do aceite eletrônico`;
  const assinatura = aceitoEm ? "Assinado eletronicamente na plataforma PROSFEC" : "Será registrada eletronicamente no aceite";
  const preencher: Record<string, string> = {
    "Nome completo / Razão Social": parceiro.nome || "—",
    "CPF / CNPJ": doc || "—",
    "Endereço completo": parceiro.cidade || "Conforme cadastro",
    "Cidade / UF": parceiro.cidade || "—",
    "CEP": "Conforme cadastro",
    "Representante legal, se aplicável": "Não se aplica",
    "CPF do representante": "Não se aplica",
    "Telefone / WhatsApp": parceiro.whatsapp || "—",
    "E-mail": parceiro.email || "—",
    "Outra categoria autorizada": "—",
    "Outras soluções PROSFEC Energy": "Conforme habilitação",
    "Taxa de adesão": "R$ 0,00 (isento)",
    "Outro valor, conforme condições específicas": "—",
    "Forma de pagamento, se aplicável": "Não se aplica",
    "Data de pagamento, se aplicável": "Não se aplica",
    "Anexo de remuneração aplicável": "Anexo II",
    "Ciclo de apuração": "Conforme Anexo II, por solução",
    "Ciclo de pagamento": "Conforme Anexo II, por solução",
    "Base de cálculo da comissão": "Consumo em kWh registrado e atribuído",
    "Tabela comercial aceita": "Anexo II deste Contrato",
    "Conta / PIX": parceiro.chavePix || "—",
    "Titular": parceiro.nome || "—",
    "CPF / CNPJ do titular": doc || "—",
    "Local e data": dataLocal,
    "Data": dataLocal,
    "Nome": parceiro.nome || "—",
    "Nome / Razão Social": parceiro.nome || "—",
    "Nome do representante": "PROSFEC ENERGY",
    "PROSFEC ENERGY": "Aceite eletrônico registrado pela plataforma",
    "PARCEIRO COMERCIAL": parceiro.nome || "—",
    "Assinatura": assinatura,
  };
  const marcados = ["Parceiro Comercial PROSFEC Energy", "Energia Solar por Assinatura", "Locação de Placas Solares", "Isento"];

  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
      {CONTRATO_PARCERIA_COMERCIAL_LINHAS.map((linha, i) => {
        const campo = linha.match(/^(.+?):\s*(?:R\$\s*)?[_/\s]*_{3,}\s*$/) || linha.match(/^(.+?):\s*\/\/_+$/);
        if (campo && campo[1]) {
          const rotulo = campo[1].trim();
          return <p key={i}><strong className="text-foreground">{rotulo}:</strong> {preencher[rotulo] ?? "—"}</p>;
        }
        const chk = linha.match(/^\( \)\s*(.+)$/);
        if (chk && chk[1]) {
          const texto = chk[1].replace(/:\s*_+$/, "");
          return <p key={i}>({marcados.includes(texto) ? "X" : " "}) {texto}</p>;
        }
        const titulo = isTitulo(linha);
        return (
          <div key={i}>
            {titulo ? <p className="font-black text-foreground pt-2">{linha}</p> : <p>{linha}</p>}
            {linha.startsWith("Para contratos vinculados às usinas") && <Tabela cab={["Usina", "Percentual de comissão"]} linhas={TABELA_USINAS} />}
            {linha.includes("tabela escalonada:") && <Tabela cab={["Volume de kWh registrado", "Comissão total", "1ª etapa", "2ª etapa"]} linhas={TABELA_SERENA} />}
          </div>
        );
      })}
      {aceitoEm && (
        <p className="pt-3 font-semibold text-foreground">Carimbo de integridade: aceite eletrônico registrado em {new Date(aceitoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília).</p>
      )}
    </div>
  );
}
