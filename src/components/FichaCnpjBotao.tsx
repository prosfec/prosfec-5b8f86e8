import { useState } from "react";
import { createPortal } from "react-dom";
import { Search, ShieldCheck, X } from "lucide-react";

/** Botão compacto + janela flutuante com a Ficha Oficial da Receita (somente leitura). */
export function FichaCnpjBotao({ details, nome, endereco }: { details: any; nome?: string; endereco?: string }) {
  const [aberto, setAberto] = useState(false);
  if (!details) return null;
  const d = details;
  const parseData = (v: string) => {
    if (!v) return null;
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    const dt = br ? new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00`) : new Date(v);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const abertura = parseData(d.dataAbertura);
  let tempo = "N/I";
  if (abertura) {
    const now = new Date();
    const meses = Math.max(0, (now.getFullYear() - abertura.getFullYear()) * 12 + now.getMonth() - abertura.getMonth());
    const a = Math.floor(meses / 12), m = meses % 12;
    tempo = a > 0 ? `${a} ano${a > 1 ? "s" : ""}${m ? ` e ${m} ${m > 1 ? "meses" : "mês"}` : ""}` : `${m} ${m === 1 ? "mês" : "meses"}`;
  }
  const simNao = (v: any) => (v === true ? "SIM" : v === false ? "NÃO" : "N/I");
  const regime = d.opcaoMei === true ? "MEI" : d.opcaoSimples === true ? "Simples Nacional" : d.opcaoSimples === false ? "Lucro Presumido / Real" : "N/I";
  const topo = [
    { l: "Situação Cadastral", v: d.situacaoCadastral || "N/I", destaque: true },
    { l: "Porte Empresarial", v: d.porte || "N/I" },
    { l: "Data de Abertura", v: d.dataAbertura || "N/I" },
    { l: "Capital Social", v: d.capitalSocial ? `R$ ${Number(d.capitalSocial).toLocaleString("pt-BR")}` : "N/I" },
  ];
  const fiscais = [
    { l: "Estabelecimento", v: d.tipoEstabelecimento || "N/I" },
    { l: "Regime Tributário", v: regime },
    { l: "Optante MEI", v: simNao(d.opcaoMei) },
    { l: "Tempo de Mercado", v: tempo },
    { l: "Natureza Jurídica", v: d.naturezaJuridica || "N/I" },
    { l: "Data da Situação", v: d.dataSituacaoCadastral || "N/I" },
  ];
  const socios: any[] = Array.isArray(d.socios) ? d.socios : [];
  const end = d.logradouro ? `${d.logradouro}, ${d.numero || "s/n"} - ${d.bairro || ""}, ${d.municipio || ""}/${d.uf || ""}` : endereco || "N/I";

  return (
    <>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[10px] space-y-1">
        <p className="text-emerald-800 font-semibold truncate"><strong>CNPJ:</strong> {d.cnpj}</p>
        {d.razaoSocial && <p className="text-emerald-800 font-semibold truncate"><strong>Razão Social:</strong> {d.razaoSocial}</p>}
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-1 w-full px-2 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
        >
          <Search className="w-3 h-3" /> Ver Ficha do CNPJ
        </button>
      </div>
      {aberto && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end md:items-center justify-center overflow-y-auto" onClick={() => setAberto(false)}>
          <div className="bg-white rounded-t-3xl md:rounded-3xl overflow-hidden max-w-2xl w-full md:my-8 text-left shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0A3D2E] p-6 flex justify-between items-start" style={{ color: "#fff" }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: "#6ee7b7" }}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Ficha Oficial Receita Federal
                </span>
                <h3 className="font-black text-xl leading-tight mt-0.5" style={{ color: "#fff" }}>{d.razaoSocial || nome}</h3>
                <p className="text-xs font-mono mt-1" style={{ color: "#a7f3d0" }}>CNPJ: {d.cnpj}</p>
              </div>
              <button aria-label="Fechar" onClick={() => setAberto(false)} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer" style={{ color: "#fff" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {topo.map((it) => (
                  <div key={it.l} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] uppercase font-black text-slate-400 block">{it.l}</span>
                    <span className={`text-xs font-black block mt-0.5 ${it.destaque ? "text-emerald-700" : "text-slate-800"}`}>{it.v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div><span className="text-[10px] text-slate-400 font-bold uppercase block">Nome Fantasia</span><span className="font-extrabold text-slate-800">{d.nomeFantasia || nome || "N/I"}</span></div>
                <div><span className="text-[10px] text-slate-400 font-bold uppercase block">Atividade Principal (CNAE)</span><span className="font-extrabold text-slate-800">{d.cnaePrincipalDescricao || d.cnaePrincipal || "Não informado"}</span></div>
                <div><span className="text-[10px] text-slate-400 font-bold uppercase block">Endereço Fiscal</span><span className="font-medium text-slate-700">{end}</span></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fiscais.map((it) => (
                  <div key={it.l} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] uppercase font-black text-slate-400 block">{it.l}</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">{it.v}</span>
                  </div>
                ))}
              </div>
              {socios.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">Quadro Societário (QSA)</span>
                  <ul className="space-y-1.5 text-xs">
                    {socios.map((s: any, i: number) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="font-extrabold text-slate-800">{s?.nome || String(s)}</span>
                        {s?.qualificacao && <span className="text-slate-500 font-medium text-right">{s.qualificacao}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setAberto(false)} className="py-2.5 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer">Fechar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
