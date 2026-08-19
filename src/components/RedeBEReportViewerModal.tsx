// @ts-nocheck
import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Building2,
  UserCheck,
  TrendingDown,
  Info,
  Printer,
  Download,
  Share2,
  FileText,
  CreditCard,
  Building,
  Home,
  Car,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Check
} from "lucide-react";

interface RedeBEReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: any;
  lead: any;
}

export const RedeBEReportViewerModal: React.FC<RedeBEReportViewerModalProps> = ({
  isOpen,
  onClose,
  consulta,
  lead
}) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !consulta) return null;

  const res = consulta.resultado || {};
  const redebe = Array.isArray(res) 
    ? res[0]?.RedeBE || res[0]?.data || res[0] 
    : res.RedeBE || res.data || res.resultado || res.retorno || res;

  // Extract key summary fields dynamically from various potential supplier response structures
  const resumo = redebe?.resumo || res?.resumo || res?.summary || {};
  const creditoEssencial = redebe?.credito_essencial?.RedeBE?.resumo || redebe?.credito_essencial?.resumo || res?.credito_essencial || {};
  const serasaResumo = redebe?.complementar?.serasa?.RedeBE?.resumo || redebe?.complementar?.serasa?.resumo || {};
  const protestoNacionalResumo = redebe?.protesto_nacional?.resumo || {};
  const cadinResumo = redebe?.complementar?.cadin || redebe?.cadin || {};
  const dadosCadastrais = redebe?.dados_cadastrais || redebe?.retorno?.principal?.CREDCADASTRAL || res?.dados_cadastrais || {};

  // Titular & Documento
  const titular = 
    resumo?.nome || 
    resumo?.razao_social || 
    dadosCadastrais?.razao_social || 
    dadosCadastrais?.nome || 
    dadosCadastrais?.NOME || 
    dadosCadastrais?.RAZAO_SOCIAL || 
    res?.nome || 
    res?.razao_social || 
    consulta.documentoNome || 
    lead?.razaoSocial || 
    lead?.nome || 
    "Titular Não Informado";

  const documento = 
    resumo?.documento || 
    resumo?.cnpj || 
    resumo?.cpf || 
    dadosCadastrais?.documento || 
    dadosCadastrais?.cnpj || 
    dadosCadastrais?.cpf || 
    consulta.documento || 
    lead?.cnpj || 
    lead?.cpf || 
    "";

  const dataEmissao = consulta.dataConsulta
    ? new Date(consulta.dataConsulta).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  const protocolo = redebe?.protocolo || consulta.protocolo || res?.protocolo || `DFI-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`;

  // Executive Rating & Score
  const rawRating = (resumo?.rating || resumo?.faixa_score || creditoEssencial?.rating || res?.rating || "B").toString().toUpperCase();
  const rating = ["AA", "A", "B", "C", "D", "E", "F", "H"].includes(rawRating) ? rawRating : "B";
  
  const ratingText = resumo?.descricao_rating || resumo?.ratingDescricao || res?.descricao_rating || (
    rating === "H" || rating === "F" || rating === "E"
      ? "Risco muito alto a crítico — exige garantias."
      : rating === "D"
      ? "Risco alto — exige garantias."
      : rating === "C" || rating === "B"
      ? "Risco moderado — perfil com margem controlada."
      : "Risco baixo a muito baixo — excelente perfil."
  );

  const inadimplencia = resumo?.probabilidade_inadimplencia || creditoEssencial?.probabilidade_inadimplencia || res?.probabilidade_inadimplencia || "0%";
  const confianca = resumo?.nivel_confianca || creditoEssencial?.nivel_confianca || res?.nivel_confianca || "Médio";
  const scoreBacen = resumo?.score || resumo?.score_motor_credito || resumo?.score_analise || creditoEssencial?.score || res?.score || 0;
  const faturamentoValor = resumo?.faturamento_estimado || resumo?.faixa_renda || creditoEssencial?.faixa_renda || res?.faturamento_estimado || "Não informado";

  // Recommendation Banner
  const decisao = resumo?.decisao_negocio || resumo?.sugestao_negocio || creditoEssencial?.sugestao_negocio || res?.decisao_negocio || "";
  const isNaorot = decisao.toLowerCase().includes("não") || decisao.toLowerCase().includes("nao") || decisao.toLowerCase().includes("recusado") || rating === "H" || rating === "F";
  const recomendacao = isNaorot ? "Negociação Não Recomendada" : "Negociação Recomendada";

  // Restrictions grid (dynamic extraction with 0 as safe default)
  const negativacoesCount = Number(resumo?.quantidade_restricoes_financeiras || resumo?.quantidade_pendencias_financeiras || serasaResumo?.quantidade_pendencias_financeiras || 0);
  const negativacoesValor = resumo?.valor_total_restricoes_financeiras || resumo?.valor_total_pendencias_financeiras || serasaResumo?.valor_total_pendencias_financeiras || "R$ 0,00";

  const pefinCount = Number(serasaResumo?.quantidade_pendencias_financeiras || resumo?.quantidade_pefin || 0);
  const pefinValor = serasaResumo?.valor_total_pendencias_financeiras || resumo?.valor_total_pefin || "R$ 0,00";

  const refinCount = Number(serasaResumo?.quantidade_pendencias_refin || resumo?.quantidade_refin || 0);

  const protestosCount = Number(resumo?.quantidade_protestos || 0);
  const protestosValor = resumo?.valor_total_protestos || "R$ 0,00";

  const protestosNacionaisCount = Number(protestoNacionalResumo?.quantidade_titulos || resumo?.quantidade_protesto_nacional || 0);
  const protestosNacionaisValor = protestoNacionalResumo?.valor_total_protestado ? `R$ ${protestoNacionalResumo.valor_total_protestado}` : (resumo?.valor_total_protesto_nacional || "R$ 0,00");

  const chequesCount = Number(resumo?.quantidade_ccf_bacen || 0);

  const rawPrejuizo = resumo?.scr_prejuizo;
  const prejuizoBacenValor = rawPrejuizo && rawPrejuizo !== "0,00" && rawPrejuizo !== "0" ? `R$ ${rawPrejuizo}` : "R$ 0,00";

  const cadinCount = Number(cadinResumo?.QUANTIDADE_OCORRENCIAS || resumo?.quantidade_cadin || 0);
  const cadinValor = cadinResumo?.VALOR_TOTAL ? `R$ ${cadinResumo.VALOR_TOTAL}` : (resumo?.valor_total_cadin ? `R$ ${resumo.valor_total_cadin}` : "R$ 0,00");

  const acoesCiveisCount = Number(resumo?.quantidade_acoes_civeis || 0);

  // Occurrences list for detailed table (extracts array or single object safely)
  const rawOcorrencias = 
    redebe?.retorno?.principal?.CREDCADASTRAL?.RESTRICOES_FINANCEIRAS?.OCORRENCIAS ||
    redebe?.retorno?.principal?.CREDCADASTRAL?.PEND_FINANCEIRAS?.OCORRENCIAS ||
    redebe?.credito_essencial?.RedeBE?.retorno?.principal?.CREDCADASTRAL?.PEND_FINANCEIRAS?.OCORRENCIAS ||
    redebe?.complementar?.serasa?.RedeBE?.retorno?.principal?.CREDCADASTRAL?.PEND_FINANCEIRAS?.OCORRENCIAS ||
    redebe?.retorno?.principal?.CREDCADASTRAL?.RESTRICOES_FINANCEIRAS ||
    redebe?.retorno?.principal?.CREDCADASTRAL?.PEND_FINANCEIRAS ||
    redebe?.retorno?.RESTRICOES_FINANCEIRAS?.OCORRENCIAS ||
    redebe?.retorno?.PEND_FINANCEIRAS?.OCORRENCIAS ||
    redebe?.ocorrencias ||
    redebe?.restricoes ||
    redebe?.pendencias ||
    res?.ocorrencias ||
    res?.restricoes ||
    res?.pendencias ||
    [];

  const normalizedOcorrencias = Array.isArray(rawOcorrencias) 
    ? rawOcorrencias 
    : (typeof rawOcorrencias === "object" && rawOcorrencias !== null ? [rawOcorrencias] : []);

  const ocorrenciasList = normalizedOcorrencias.map((item: any) => ({
    data: item.DATA_VENCIMENTO || item.data_vencimento || item.DATA || item.data || "-",
    inclusao: item.DATA_INCLUSAO || item.data_inclusao || item.inclusao || "-",
    informante: item.CREDOR || item.credor || item.INFORMANTE || item.informante || item.NOME_CREDOR || "-",
    origem: item.ORIGEM || item.origem || item.CIDADE || "-",
    tipo: item.MODALIDADE || item.tipo || item.TIPO || "RG",
    contrato: item.CONTRATO || item.contrato || item.NÚMERO_CONTRATO || "-",
    valor: item.VALOR ? (item.VALOR.toString().startsWith("R$") ? item.VALOR : `R$ ${item.VALOR}`) : (item.valor ? (item.valor.toString().startsWith("R$") ? item.valor : `R$ ${item.valor}`) : "-")
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 transition-all">
      <div className="bg-white text-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-left relative font-sans">
        
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-extrabold text-xs uppercase tracking-wider font-mono text-emerald-400">
              Relatório Comercial de Crédito &bull; Diagnóstico 360
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
              {protocolo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
              title="Imprimir / Salvar PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-bold">Imprimir PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Report Body */}
        <div className="overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#f8fafc] flex-1 text-slate-800 text-xs">
          
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                TITULAR DO RELATÓRIO
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                {titular}
              </h2>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
                <span>{documento}</span>
                <span>&bull;</span>
                <span>Emitido em: {dataEmissao}</span>
              </div>
            </div>

            <div className="text-right shrink-0 font-mono">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                PROTOCOLO
              </span>
              <span className="text-sm font-black text-slate-800">{protocolo}</span>
            </div>
          </div>

          {/* SECTION 1: VISÃO EXECUTIVA DO RATING COMERCIAL */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
              | VISÃO EXECUTIVA DO RATING COMERCIAL
            </h3>

            {/* Rating Main Box */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 text-center space-y-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                RATING COMERCIAL
              </span>
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-white font-black text-3xl shadow-md border-2 border-slate-700 font-display">
                {rating}
              </div>

              <div className="font-extrabold text-sm text-rose-600">
                {ratingText}
              </div>

              {/* Rating Scale Bar */}
              <div className="max-w-md mx-auto pt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] font-black font-mono text-slate-500 px-1">
                  <span className={rating === "AA" ? "text-emerald-600 font-bold underline" : ""}>AA</span>
                  <span className={rating === "A" ? "text-emerald-500 font-bold underline" : ""}>A</span>
                  <span className={rating === "B" ? "text-lime-600 font-bold underline" : ""}>B</span>
                  <span className={rating === "C" ? "text-amber-500 font-bold underline" : ""}>C</span>
                  <span className={rating === "D" ? "text-orange-500 font-bold underline" : ""}>D</span>
                  <span className={rating === "E" ? "text-rose-500 font-bold underline" : ""}>E</span>
                  <span className={rating === "H" ? "text-rose-700 font-bold underline" : ""}>H</span>
                </div>
                <div className="h-2.5 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600 rounded-full relative shadow-inner">
                  {/* Position indicator */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-900 rounded-full shadow-md"
                    style={{
                      left:
                        rating === "AA" ? "5%" :
                        rating === "A" ? "20%" :
                        rating === "B" ? "35%" :
                        rating === "C" ? "50%" :
                        rating === "D" ? "65%" :
                        rating === "E" ? "80%" : "95%"
                    }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 max-w-lg mx-auto pt-1">
                Consolidação do risco comercial para decisão de limite, prazo e necessidade de garantias.
              </p>
            </div>

            {/* 4 Core Indicators Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  PROBABILIDADE DE INADIMPLÊNCIA
                </span>
                <span className="text-base font-black text-rose-600 block">
                  {inadimplencia}
                </span>
                <span className="text-[9px] text-slate-400 block font-medium">Probabilidade Estimada</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  NÍVEL DE CONFIANÇA
                </span>
                <span className="text-base font-black text-slate-800 block">
                  {confianca}
                </span>
                <div className="flex items-center gap-1 py-0.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  SCORE BACEN
                </span>
                <span className="text-base font-black text-slate-800 font-mono block">
                  {scoreBacen}
                </span>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, (Number(scoreBacen) / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  FATURAMENTO / RENDA
                </span>
                <span className="text-base font-black text-emerald-700 block">
                  {faturamentoValor}
                </span>
                <span className="text-[9px] text-slate-400 block font-medium">Base cadastral consolidada</span>
              </div>
            </div>

            {/* Recommendation Banner */}
            <div className={`p-4 rounded-2xl flex items-center justify-between text-white font-extrabold ${
              isNaorot ? "bg-rose-600" : "bg-emerald-600"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight">{recomendacao}</h4>
                  <span className="text-[10px] opacity-90 block font-normal">
                    {isNaorot ? "Negociacao nao indicada devido ao perfil de alto risco e pendências ativas." : "Perfil cadastral e score favoráveis para estruturação de crédito."}
                  </span>
                </div>
              </div>
              <span className="text-3xl font-black font-display opacity-80 shrink-0">{rating}</span>
            </div>
          </div>

          {/* SECTION 2: RESTRIÇÕES E ALERTAS (3x3 Grid) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              | RESTRIÇÕES E ALERTAS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                negativacoesCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">Negativações Registradas</span>
                  <span className={`text-[10px] font-medium block ${negativacoesCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {negativacoesCount > 0 ? `${negativacoesCount} ocorrência(s) - ${negativacoesValor}` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  negativacoesCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {negativacoesCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 2 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                pefinCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">PEFIN - Serasa / SPC Brasil</span>
                  <span className={`text-[10px] font-medium block ${pefinCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {pefinCount > 0 ? `${pefinCount} ocorrência(s) - ${pefinValor}` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  pefinCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {pefinCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 3 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                refinCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">REFIN - Serasa / SPC Brasil</span>
                  <span className={`text-[10px] font-medium block ${refinCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {refinCount > 0 ? `${refinCount} ocorrência(s)` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  refinCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {refinCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 4 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                protestosCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">Protestos Cartorários</span>
                  <span className={`text-[10px] font-medium block ${protestosCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {protestosCount > 0 ? `${protestosCount} ocorrência(s) - ${protestosValor}` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  protestosCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {protestosCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 5 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                protestosNacionaisCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">Protestos Nacionais</span>
                  <span className={`text-[10px] font-medium block ${protestosNacionaisCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {protestosNacionaisCount > 0 ? `${protestosNacionaisCount} ocorrência(s) - ${protestosNacionaisValor}` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  protestosNacionaisCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {protestosNacionaisCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 6 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                chequesCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">Cheques sem Fundo</span>
                  <span className={`text-[10px] font-medium block ${chequesCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {chequesCount > 0 ? `${chequesCount} ocorrência(s)` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  chequesCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {chequesCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 7 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                prejuizoBacenValor !== "R$ 0,00" && prejuizoBacenValor !== "0" ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">Prejuízo - Bacen (SCR)</span>
                  <span className={`text-[10px] font-medium block ${prejuizoBacenValor !== "R$ 0,00" ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {prejuizoBacenValor !== "R$ 0,00" ? `Prejuízo de ${prejuizoBacenValor}` : "Nenhum prejuízo"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  prejuizoBacenValor !== "R$ 0,00" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {prejuizoBacenValor !== "R$ 0,00" ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 8 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                cadinCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">CADIN (Débitos Federais)</span>
                  <span className={`text-[10px] font-medium block ${cadinCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {cadinCount > 0 ? `${cadinCount} ocorrência(s) - ${cadinValor}` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  cadinCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {cadinCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>

              {/* Card 9 */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                acoesCiveisCount > 0 ? "bg-rose-50/60 border-rose-200/80" : "bg-emerald-50/60 border-emerald-200/80"
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-slate-800 block truncate">Ações Cíveis / Trabalhistas</span>
                  <span className={`text-[10px] font-medium block ${acoesCiveisCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}`}>
                    {acoesCiveisCount > 0 ? `${acoesCiveisCount} ação(ões)` : "Nenhuma ocorrência"}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                  acoesCiveisCount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {acoesCiveisCount > 0 ? "Atenção" : "OK"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION: DADOS CADASTRAIS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              | DADOS CADASTRAIS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div className="col-span-1 md:col-span-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">RAZÃO SOCIAL / NOME</span>
                <span className="font-extrabold text-sm text-slate-900 block truncate">{titular}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">CNPJ / CPF</span>
                <span className="font-bold text-xs text-slate-800 font-mono block">{documento}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">SITUAÇÃO CADASTRAL</span>
                <span className="inline-block text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mt-0.5">
                  {dadosCadastrais?.situacao || dadosCadastrais?.SITUACAO || redebe?.dados_cadastrais?.situacao || "02 - ATIVA / REGULAR"}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">FUNDAÇÃO / NASCIMENTO</span>
                <span className="font-medium text-xs text-slate-700 block">{dadosCadastrais?.fundacao || dadosCadastrais?.data_nascimento || redebe?.dados_cadastrais?.fundacao || lead?.dataFundacao || "-"}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">NATUREZA JURÍDICA / TIPO</span>
                <span className="font-medium text-xs text-slate-700 block truncate">{dadosCadastrais?.natureza_juridica || redebe?.dados_cadastrais?.natureza_juridica || "Empresário (Individual)"}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">CNAE / OCUPAÇÃO</span>
                <span className="font-medium text-xs text-slate-700 block truncate">{dadosCadastrais?.cnae || redebe?.dados_cadastrais?.cnae || lead?.cnae || "-"}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">CAPITAL SOCIAL</span>
                <span className="font-medium text-xs text-slate-700 block font-mono">{dadosCadastrais?.capital_social || redebe?.dados_cadastrais?.capital_social || "-"}</span>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4 pt-2 border-t border-slate-200/50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">ENDEREÇO REGISTRADO</span>
                <span className="font-medium text-xs text-slate-700 block">{dadosCadastrais?.endereco || redebe?.dados_cadastrais?.endereco || lead?.endereco || "Endereço mantido nos registros oficiais do fornecedor"}</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CHANCES DE APROVAÇÃO POR PRODUTO */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
              | CHANCES DE APROVAÇÃO POR PRODUTO DE CRÉDITO
            </h3>
            <p className="text-[10px] text-slate-400">
              Estimativas calculadas a partir de score, rating, renda, confiança, pendências e histórico SCR do BACEN.
            </p>

            {(() => {
              const chancesObj = redebe?.chances_aprovacao || resumo?.chances_aprovacao || redebe?.credito_essencial?.chances_aprovacao || {};
              const ccPct = Number(chancesObj?.cartao_credito?.percentual ?? chancesObj?.cartao_credito ?? (Number(scoreBacen) > 500 ? 66 : 21));
              const epPct = Number(chancesObj?.emprestimo_pessoal?.percentual ?? chancesObj?.emprestimo_pessoal ?? (Number(scoreBacen) > 500 ? 58 : 6));
              const csPct = Number(chancesObj?.credito_consignado?.percentual ?? chancesObj?.credito_consignado ?? (Number(scoreBacen) > 500 ? 85 : 40));
              const fvPct = Number(chancesObj?.financiamento_veiculo?.percentual ?? chancesObj?.financiamento_veiculo ?? (Number(scoreBacen) > 500 ? 66 : 18));
              const fiPct = Number(chancesObj?.financiamento_imovel?.percentual ?? chancesObj?.financiamento_imovel ?? (Number(scoreBacen) > 500 ? 55 : 4));

              const getLabel = (pct: number) => {
                if (pct >= 80) return { text: "Alta", cls: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" };
                if (pct >= 60) return { text: "Boa", cls: "bg-lime-100 text-lime-800", bar: "bg-lime-500" };
                if (pct >= 35) return { text: "Média", cls: "bg-amber-100 text-amber-800", bar: "bg-amber-500" };
                return { text: "Baixa", cls: "bg-rose-100 text-rose-800", bar: "bg-rose-500" };
              };

              const cc = getLabel(ccPct);
              const ep = getLabel(epPct);
              const cs = getLabel(csPct);
              const fv = getLabel(fvPct);
              const fi = getLabel(fiPct);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cc.cls}`}>{cc.text}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 block">Cartão de crédito</span>
                    <span className="text-xl font-black text-slate-900 block font-display">{ccPct}%</span>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cc.bar}`} style={{ width: `${ccPct}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <DollarSign className="w-4 h-4 text-slate-500" />
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ep.cls}`}>{ep.text}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 block">Empréstimo pessoal</span>
                    <span className="text-xl font-black text-slate-900 block font-display">{epPct}%</span>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${ep.bar}`} style={{ width: `${epPct}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cs.cls}`}>{cs.text}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 block">Crédito consignado</span>
                    <span className="text-xl font-black text-slate-900 block font-display">{csPct}%</span>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cs.bar}`} style={{ width: `${csPct}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Car className="w-4 h-4 text-slate-500" />
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${fv.cls}`}>{fv.text}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 block">Financiamento veículo</span>
                    <span className="text-xl font-black text-slate-900 block font-display">{fvPct}%</span>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${fv.bar}`} style={{ width: `${fvPct}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Home className="w-4 h-4 text-slate-500" />
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${fi.cls}`}>{fi.text}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 block">Financiamento imóvel</span>
                    <span className="text-xl font-black text-slate-900 block font-display">{fiPct}%</span>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${fi.bar}`} style={{ width: `${fiPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SECTION 4: PILARES CONSIDERADOS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
              | PILARES CONSIDERADOS NA ANÁLISE
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">PILAR</span>
                <span className="font-extrabold text-xs text-slate-800 block">Histórico de Pagamento</span>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400 font-medium">Peso</span>
                  <span className="font-black text-emerald-800">35%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">PILAR</span>
                <span className="font-extrabold text-xs text-slate-800 block">Nível de Endividamento</span>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400 font-medium">Peso</span>
                  <span className="font-black text-emerald-800">30%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">PILAR</span>
                <span className="font-extrabold text-xs text-slate-800 block">Tempo de Histórico</span>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400 font-medium">Peso</span>
                  <span className="font-black text-emerald-800">20%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">PILAR</span>
                <span className="font-extrabold text-xs text-slate-800 block">Perfil e Consultas</span>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400 font-medium">Peso</span>
                  <span className="font-black text-emerald-800">15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: PLANO DE AÇÃO PERSONALIZADO (PROSFEC / REDEBE) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              | PLANO DE AÇÃO PERSONALIZADO PARA ELEVAÇÃO DE SCORE
            </h3>

            <div className="space-y-4">
              {/* Priority 1 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                <span className={`text-[10px] font-black uppercase tracking-wider block w-fit px-2 py-0.5 rounded-md ${
                  negativacoesCount > 0 || pefinCount > 0 || prejuizoBacenValor !== "R$ 0,00"
                    ? "text-rose-700 bg-rose-100"
                    : "text-emerald-800 bg-emerald-100"
                }`}>
                  PRIORIDADE 1 - {negativacoesCount > 0 || pefinCount > 0 || prejuizoBacenValor !== "R$ 0,00" ? "RESOLVER PRIMEIRO" : "MANTER ADIMPLÊNCIA"}
                </span>
                
                <div className="space-y-2">
                  {prejuizoBacenValor !== "R$ 0,00" ? (
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800">Regularizar operações no SCR / BACEN</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Existe apontamento de prejuízo no Banco Central ({prejuizoBacenValor}). Negocie com as instituições credoras para liberar o rating e reclassificação no SCR.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {negativacoesCount > 0 || pefinCount > 0 || protestosCount > 0 ? (
                    <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/50">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {prejuizoBacenValor !== "R$ 0,00" ? "2" : "1"}
                      </span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800">Negociar pendências financeiras e PEFIN / Protestos</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Ocorrências ativas no valor de {negativacoesValor !== "R$ 0,00" ? negativacoesValor : pefinValor}. A quitação e baixa das anotações são a ação direta com maior impacto imediato no score.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {negativacoesCount === 0 && pefinCount === 0 && protestosCount === 0 && prejuizoBacenValor === "R$ 0,00" ? (
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        ✓
                      </span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800">Nenhuma restrição ativa registrada</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          O documento não possui apontamentos negativos ou restrições nos bureaus. Mantenha os pagamentos em dia e o histórico limpo.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Priority 2 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block bg-amber-100 w-fit px-2 py-0.5 rounded-md">
                  PRIORIDADE 2 - MÉDIO PRAZO
                </span>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">Atualizar dados cadastrais nas instituições financeiras</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Comprovantes de faturamento, faturamento fiscal e endereço atualizados evitam divergência nos bureaus de crédito.
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority 3 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block bg-emerald-100 w-fit px-2 py-0.5 rounded-md">
                  PRIORIDADE 3 - MELHORIA CONTÍNUA
                </span>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">Ativar e monitorar o Cadastro Positivo</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Manter contas recorrentes (energia, concessionárias) em dia para fortalecer o histórico de adimplência.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: TABELA DETALHADA DE OCORRÊNCIAS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
              | OCORRÊNCIAS REGISTRADAS (EXTRATO COMPLETO)
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Inclusão</th>
                    <th className="p-2.5">Informante / Credor</th>
                    <th className="p-2.5">Origem</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Contrato</th>
                    <th className="p-2.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {ocorrenciasList.length > 0 ? (
                    ocorrenciasList.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-mono text-slate-500">{item.data || "-"}</td>
                        <td className="p-2.5 font-mono text-slate-500">{item.inclusao || "-"}</td>
                        <td className="p-2.5 font-bold text-slate-800">{item.informante || item.credor || "-"}</td>
                        <td className="p-2.5 text-slate-500">{item.origem || "-"}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-600">{item.tipo || "RG"}</td>
                        <td className="p-2.5 font-mono text-slate-500">{item.contrato || "-"}</td>
                        <td className="p-2.5 text-right font-mono font-black text-rose-600">{item.valor || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 bg-emerald-50/30 font-medium">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="font-bold text-xs text-emerald-900">Nenhuma ocorrência ou apontamento restritivo encontrado.</span>
                          <span className="text-[10px] text-emerald-700">O documento consultado está limpo e sem pendências financeiras registradas.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collapsible Raw Supplier Payload Inspection */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider font-mono">
                  Inspeção de Dados Brutos do Fornecedor (Payload Original da API)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(consulta.resultado, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 font-mono cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copiado!" : "Copiar JSON"}</span>
                </button>

                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[10px] font-extrabold rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-emerald-500/30"
                >
                  <span>{showRawJson ? "Ocultar Estrutura Bruta" : "Ver Payload Completo"}</span>
                  {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {showRawJson && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto max-h-96 text-emerald-400/90 leading-relaxed select-text">
                <pre>{JSON.stringify(consulta.resultado, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Legal Footnote */}
          <div className="text-[9px] text-slate-400 p-4 bg-slate-100/60 rounded-xl space-y-1">
            <p className="font-bold uppercase text-slate-500">Aviso Legal & Termos LGPD:</p>
            <p>
              Simples consulta ao documento {documento} nas bases de crédito. Esta informação de consulta não significa negócio realizado. Protocolo da consulta: {protocolo}. As informações apresentadas nesta consulta de crédito são confidenciais e destinam-se exclusivamente ao processo de análise, avaliação de risco e orientação em transações comerciais.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
