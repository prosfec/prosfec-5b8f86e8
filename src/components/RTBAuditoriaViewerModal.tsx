// @ts-nocheck
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  X, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Printer, 
  Download, 
  Scale, 
  Building2, 
  Calendar, 
  ExternalLink,
  ShieldAlert,
  FileCheck2,
  Info
} from "lucide-react";
import { AnaliseRTB, IrregularidadeRTB } from "../types";

interface RTBAuditoriaViewerModalProps {
  analiseRTB: AnaliseRTB;
  razaoSocial?: string;
  cnpj?: string;
  ccbPdfUrl?: string;
  onClose: () => void;
}

export default function RTBAuditoriaViewerModal({
  analiseRTB,
  razaoSocial,
  cnpj,
  ccbPdfUrl,
  onClose
}: RTBAuditoriaViewerModalProps) {
  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Modal Header */}
        <div className="bg-linear-to-r from-[#0A3D2E] via-[#0e4e3b] to-[#125844] text-white p-5 sm:p-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Laudo Pericial RTB
                </span>
                <span className="text-xs text-emerald-200/80 font-mono">
                  {analiseRTB.protocoloLaudo || "RTB-PROSFEC-IA"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Recuperação de Tarifas Bancárias (RTB)
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Auditoria Pericial Contratual de CCB &amp; Diagnóstico de Restituição
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Imprimir Laudo"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-linear-to-br from-emerald-600 to-teal-800 text-white p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-100 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
                Potencial de Restituição
              </span>
              <p className="text-2xl font-black text-white">
                {formatCurrency(analiseRTB.potencialRecuperacaoTotal)}
              </p>
              <p className="text-[10px] text-emerald-200/90 font-medium">
                Tarifas e encargos indevidos apurados
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                Repetição em Dobro (CDC)
              </span>
              <p className="text-xl font-black text-slate-900">
                {formatCurrency(analiseRTB.potencialRepeticaoIndebito || analiseRTB.potencialRecuperacaoTotal * 2)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Art. 42, Parágrafo Único do CDC
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                Irregularidades
              </span>
              <p className="text-xl font-black text-rose-600">
                {analiseRTB.irregularidadesEncontradas?.length || 0} Apontamentos
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Súmulas STJ &amp; Resoluções BACEN
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Sugestão de Ação
              </span>
              <p className="text-xs font-black text-slate-900 truncate" title={analiseRTB.sugestaoAcao}>
                {analiseRTB.sugestaoAcao || "Acordo Extrajudicial"}
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold">
                Via Notificatória Ágil
              </p>
            </div>
          </div>

          {/* Operation & Contract Details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0A3D2E]" />
              Dados da Cédula de Crédito Bancário Auditada
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Banco Emissor</span>
                <span className="font-extrabold text-slate-800 text-sm">{analiseRTB.bancoIdentificado || "Banco Comercial"}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Nº do Contrato / CCB</span>
                <span className="font-extrabold text-slate-800 text-sm truncate block" title={analiseRTB.numeroContratoOuCCB}>
                  {analiseRTB.numeroContratoOuCCB || "Identificado no Documento"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor da Operação</span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  {formatCurrency(analiseRTB.valorOperacao)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">CET Declarado</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {analiseRTB.cetInformado || analiseRTB.taxaJurosAnual || "Conforme CCB"}
                </span>
              </div>
            </div>

            {analiseRTB.arquivoNome && (
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-emerald-950 truncate">
                    Arquivo analisado: {analiseRTB.arquivoNome}
                  </span>
                </div>
                {ccbPdfUrl && (
                  <a
                    href={ccbPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir CCB
                  </a>
                )}
              </div>
            )}
          </div>

          {/* List of Detected Irregularities */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Tarifas e Cobranças Ilícitas Identificadas para Ressarcimento
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {analiseRTB.irregularidadesEncontradas?.length || 0} itens
              </span>
            </div>

            <div className="space-y-3">
              {analiseRTB.irregularidadesEncontradas?.map((item: IrregularidadeRTB, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-900">
                        {item.tipo}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                        {formatCurrency(item.valorEstimado)}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        item.probabilidadeExito === "Alta" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        Êxito {item.probabilidadeExito}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {item.descricao}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-200/60">
                    <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Fundamentação: {item.fundamentacaoLegal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Summary & Legal Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                Resumo Executivo do Laudo
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {analiseRTB.resumoExecutivo}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Scale className="w-4 h-4 text-amber-600" />
                Tese e Estratégia Recomendada
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {analiseRTB.teseJuridicaRecomendada}
              </p>
            </div>
          </div>

          {/* Legal Note Footer */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              Este laudo pericial preliminar foi emitido pela <strong>{analiseRTB.analistaIa || "PROSFEC IA"}</strong> com base nas resoluções vigentes do Banco Central do Brasil e jurisprudência consolidada do STJ (Temas Repetitivos 958 e 972 / Súmulas 286, 566 e 539).
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap print:hidden">
          <span className="text-xs text-slate-400 font-medium">
            Data da Perícia: {analiseRTB.dataAnalise ? new Date(analiseRTB.dataAnalise).toLocaleDateString("pt-BR") : "Recente"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Laudo
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Fechar Laudo
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
