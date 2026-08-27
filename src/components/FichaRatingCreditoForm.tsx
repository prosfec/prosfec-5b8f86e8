// @ts-nocheck
import React, { useState, useEffect } from "react";
import { 
  FileText, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Building2, 
  Plus, 
  Trash2, 
  Lock, 
  Eye, 
  Save, 
  Send, 
  X, 
  FileCheck, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  HelpCircle,
  Award,
  Sparkles,
  TrendingUp,
  Clock,
  Scale,
  DollarSign,
  ShieldAlert,
  RotateCw,
  Link2,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Lead, FichaRatingCredito, SocioRatingCPF, DadosRatingCNPJ, ReferenciaPessoal, AnaliseRTB } from "../types";
import { formatCurrencyBRL, sanitizeFirestoreData, validateUploadedFile } from "../utils";
import RTBAuditoriaViewerModal from "./RTBAuditoriaViewerModal";

/**
 * Campo de link de documento em nuvem (Google Drive, OneDrive, Dropbox...).
 * Substitui o antigo upload em base64 — grava apenas a URL no mesmo campo do Firestore.
 */
const DocLinkInput = ({
  label,
  value,
  onChange,
  required = false,
  hint
}: {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  required?: boolean;
  hint?: string;
}) => {
  const current = value || "";
  const isLegacyBase64 = current.startsWith("data:");
  const isInvalid = !!current && !isLegacyBase64 && !/^https?:\/\//i.test(current.trim());

  return (
    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 truncate">
            {label}{required ? " *" : ""}
          </span>
        </div>
        {current ? (
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
            Link salvo
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium shrink-0">Pendente</span>
        )}
      </div>

      {isLegacyBase64 ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 font-medium">
          Arquivo antigo anexado. Limpe e cole o link do documento na nuvem.
        </p>
      ) : (
        <input
          type="url"
          inputMode="url"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cole aqui o link do Google Drive..."
          aria-label={`Link do documento: ${label}`}
          className={`w-full bg-white border text-slate-800 text-[11px] rounded-xl px-2.5 py-2 focus:outline-hidden font-medium ${
            isInvalid ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-emerald-600"
          }`}
        />
      )}

      {isInvalid && (
        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          O link deve começar com https://
        </p>
      )}

      {hint && !isInvalid && (
        <p className="text-[10px] text-slate-500 leading-snug">{hint}</p>
      )}

      {current && (
        <div className="flex items-center gap-1.5">
          {!isInvalid && !isLegacyBase64 && (
            <a
              href={current}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir link
            </a>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
            title="Remover link"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
};


interface FichaRatingCreditoFormProps {
  lead: Lead;
  isUnlocked: boolean;
  onUpdateLead?: (updatedLead: Lead) => void;
  partnerWhatsapp?: string | null;
}

const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "União Estável",
  "Divorciado(a)",
  "Viúvo(a)"
];

const GRAUS_ESCOLARIDADE = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Superior Incompleto",
  "Superior Completo",
  "Pós-Graduação / Especialização",
  "Mestrado / Doutorado"
];

export default function FichaRatingCreditoForm({
  lead,
  isUnlocked,
  onUpdateLead,
  partnerWhatsapp
}: FichaRatingCreditoFormProps) {
  // Initialize state with existing lead data or defaults
  const initialSocios: SocioRatingCPF[] = lead.fichaRatingCredito?.sociosCPF?.length
    ? lead.fichaRatingCredito.sociosCPF
    : [
        {
          id: "socio_1",
          nome: lead.nome || "",
          cpf: (lead.socios && lead.socios[0]?.cpf) || "",
          estadoCivil: "",
          escolaridade: "",
          rendaFamiliar: "",
          rendaBrutaIndividual: "",
          referenciasPessoais: [
            { nome: "", telefone: "", parentesco: "" }
          ]
        }
      ];

  const initialCNPJ: DadosRatingCNPJ = lead.fichaRatingCredito?.dadosCNPJ || {};

  const [socios, setSocios] = useState<SocioRatingCPF[]>(initialSocios);
  const [dadosCNPJ, setDadosCNPJ] = useState<DadosRatingCNPJ>(initialCNPJ);
  const [openSection, setOpenSection] = useState<"cpf" | "cnpj" | "both">("both");
  const [activeSocioTab, setActiveSocioTab] = useState<number>(0);
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; isPdf?: boolean } | null>(null);

  // RTB (Recuperação de Tarifa Bancária) State
  const [analiseRTB, setAnaliseRTB] = useState<AnaliseRTB | null>(lead.analiseRTB || null);
  const [analisandoRTB, setAnalisandoRTB] = useState(false);
  const [showRTBModal, setShowRTBModal] = useState(false);
  const [rtbError, setRtbError] = useState<string | null>(null);

  // Sync state if lead prop changes
  useEffect(() => {
    if (lead.fichaRatingCredito) {
      if (lead.fichaRatingCredito.sociosCPF?.length) {
        setSocios(lead.fichaRatingCredito.sociosCPF);
      }
      if (lead.fichaRatingCredito.dadosCNPJ) {
        setDadosCNPJ(lead.fichaRatingCredito.dadosCNPJ);
      }
    }
    if (lead.analiseRTB) {
      setAnaliseRTB(lead.analiseRTB);
    }
  }, [lead.id, lead.analiseRTB]);

  // Handler to trigger PROSFEC IA RTB Audit
  const handleAnalisarCCBComIA = async () => {
    if (!dadosCNPJ.ccbContratoPdf) {
      setSaveError("Por favor, selecione e anexe primeiro o arquivo em PDF da CCB (Cédula de Crédito Bancário).");
      return;
    }

    setAnalisandoRTB(true);
    setRtbError(null);
    setSaveError(null);

    try {
      const response = await fetch("/api/credit/analise-rtb-ccb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          ccbBase64: dadosCNPJ.ccbContratoPdf,
          nomeArquivo: dadosCNPJ.ccbContratoPdfNome || "CCB_Contrato_Bancario.pdf",
          bancoInformado: dadosCNPJ.ccbBancoEmissor || lead.bancoPrincipal,
          valorInformado: dadosCNPJ.ccbValorContrato || lead.limiteEstimado
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Falha na análise pericial da CCB pela PROSFEC IA.");
      }

      setAnaliseRTB(resData.analiseRTB);
      setSaveSuccess("Perícia pericial da CCB concluída com sucesso pela PROSFEC IA!");
      setShowRTBModal(true);

      if (onUpdateLead) {
        onUpdateLead({
          ...lead,
          analiseRTB: resData.analiseRTB
        });
      }
    } catch (err: any) {
      console.error("Erro na análise RTB:", err);
      setRtbError(err.message || "Erro ao conectar com a PROSFEC IA para auditoria da CCB.");
    } finally {
      setAnalisandoRTB(false);
    }
  };

  // Format currency R$ input
  const handleCurrencyChange = (val: string, setter: (formatted: string) => void) => {
    const numbers = val.replace(/\D/g, "");
    if (!numbers) {
      setter("");
      return;
    }
    const num = Number(numbers) / 100;
    setter(num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  };

  // Convert File to Base64
  const readFileAsBase64 = (file: File): Promise<{ base64: string; name: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          base64: reader.result as string,
          name: file.name
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Grava o LINK do documento do sócio (mesmo campo do Firestore, agora com URL)
  const handleSocioLinkChange = (
    socioIndex: number,
    fieldName: keyof SocioRatingCPF,
    url: string,
    label: string
  ) => {
    setSaveError(null);
    const value = (url || "").trim();
    setSocios(prev =>
      prev.map((s, i) =>
        i !== socioIndex
          ? s
          : {
              ...s,
              [fieldName]: value,
              [`${String(fieldName)}Nome`]: value ? `${label} (link externo)` : ""
            }
      )
    );
  };

  // Grava o LINK dos documentos do CNPJ
  const handleCNPJLinkChange = (
    fieldName: keyof DadosRatingCNPJ,
    url: string,
    label: string
  ) => {
    setSaveError(null);
    const value = (url || "").trim();
    setDadosCNPJ(prev => ({
      ...prev,
      [fieldName]: value,
      [`${String(fieldName)}Nome`]: value ? `${label} (link externo)` : ""
    }));
  };


  // Upload handler for CNPJ documents (strictly validating PDF if field is a PDF field)
  const handleCNPJFileUpload = async (
    fieldName: keyof DadosRatingCNPJ,
    file: File | null,
    isStrictPdf: boolean = false
  ) => {
    if (!file) return;
    setSaveError(null);

    const validation = await validateUploadedFile(file, isStrictPdf ? ["pdf"] : ["pdf", "image"], 15);
    if (!validation.valid) {
      setSaveError(validation.error || "Arquivo inválido para este campo.");
      return;
    }

    try {
      const { base64, name } = await readFileAsBase64(file);
      setDadosCNPJ(prev => ({
        ...prev,
        [fieldName]: base64,
        [`${String(fieldName)}Nome`]: name
      }));
    } catch (err) {
      console.error("Erro ao processar arquivo CNPJ:", err);
      setSaveError("Erro ao processar o arquivo. Tente novamente.");
    }
  };

  // Add a new Socio
  const handleAddSocio = () => {
    const nextNum = socios.length + 1;
    setSocios(prev => [
      ...prev,
      {
        id: `socio_${Date.now()}`,
        nome: "",
        cpf: "",
        estadoCivil: "",
        escolaridade: "",
        rendaFamiliar: "",
        rendaBrutaIndividual: "",
        referenciasPessoais: [{ nome: "", telefone: "", parentesco: "" }]
      }
    ]);
    setActiveSocioTab(nextNum - 1);
  };

  // Remove a Socio
  const handleRemoveSocio = (index: number) => {
    if (socios.length <= 1) return;
    setSocios(prev => prev.filter((_, i) => i !== index));
    if (activeSocioTab >= index && activeSocioTab > 0) {
      setActiveSocioTab(activeSocioTab - 1);
    }
  };

  // Add Reference for Socio
  const handleAddReferencia = (socioIndex: number) => {
    const updated = [...socios];
    updated[socioIndex].referenciasPessoais = [
      ...(updated[socioIndex].referenciasPessoais || []),
      { nome: "", telefone: "", parentesco: "" }
    ];
    setSocios(updated);
  };

  // Remove Reference
  const handleRemoveReferencia = (socioIndex: number, refIndex: number) => {
    const updated = [...socios];
    updated[socioIndex].referenciasPessoais = updated[socioIndex].referenciasPessoais.filter((_, i) => i !== refIndex);
    setSocios(updated);
  };

  // Calculate percentage of completeness
  const calculateProgress = (): number => {
    let totalItems = 0;
    let filledItems = 0;

    // Per Socio metrics
    socios.forEach(s => {
      totalItems += 8; // nome, cpf, estadoCivil, escolaridade, rendaFamiliar, rendaBruta, ref, at least 2 docs
      if (s.nome) filledItems++;
      if (s.cpf) filledItems++;
      if (s.estadoCivil) filledItems++;
      if (s.escolaridade) filledItems++;
      if (s.rendaFamiliar) filledItems++;
      if (s.rendaBrutaIndividual) filledItems++;
      if (s.referenciasPessoais?.[0]?.nome && s.referenciasPessoais?.[0]?.telefone) filledItems++;
      if (s.fotoCnhRgFrente || s.fotoCnhRgVerso || s.selfieComDocumento) filledItems++;
    });

    // CNPJ required PDFs metrics
    const cnpjFields: (keyof DadosRatingCNPJ)[] = [
      "cartaoCnpjPdf",
      "contratoSocialPdf",
      "comprovanteResidenciaPdf",
      "faturamento12MesesPdf",
      "drePdf",
      "balancoPatrimonialPdf"
    ];
    cnpjFields.forEach(f => {
      totalItems++;
      if (dadosCNPJ[f]) filledItems++;
    });

    if (totalItems === 0) return 0;
    return Math.min(100, Math.round((filledItems / totalItems) * 100));
  };

  const progress = calculateProgress();

  // Save to Firestore
  const handleSaveData = async (isFinalSubmission = false) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const now = new Date().toISOString();
    const currentRating: FichaRatingCredito = {
      ...(lead.fichaRatingCredito || {}),
      sociosCPF: socios,
      dadosCNPJ: dadosCNPJ,
      status: isFinalSubmission ? "em_analise" : (lead.fichaRatingCredito?.status || "pendente"),
      faseRating: isFinalSubmission ? "documentos_recebidos" : (lead.fichaRatingCredito?.faseRating || "aguardando_documentos"),
      dataEnvio: isFinalSubmission ? now : (lead.fichaRatingCredito?.dataEnvio || ""),
      dataAtualizacao: now,
      progressoPercentual: progress
    };

    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, {
        fichaRatingCredito: sanitizeFirestoreData(currentRating)
      });

      const updatedLead = {
        ...lead,
        fichaRatingCredito: currentRating
      };

      if (onUpdateLead) {
        onUpdateLead(updatedLead);
      }

      setSaveSuccess(
        isFinalSubmission
          ? "Ficha enviada com sucesso para a Central de Análise e Estruturação de Rating!"
          : "Rascunho salvo com sucesso no portal."
      );

      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err) {
      console.error("Erro ao salvar ficha de rating:", err);
      setSaveError("Erro ao salvar os dados no sistema. Verifique a conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Locked State View
  if (!isUnlocked) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-lg space-y-5 text-left relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider font-mono block">
              Módulo Bloqueado
            </span>
            <h2 className="text-base font-black text-slate-900 font-display">
              Ficha de Cadastro de Rating Comercial
            </h2>
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-950">
                Aguardando confirmação de pagamento dos serviços de melhoria
              </p>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                O envio dos dados e anexos para estruturação do <strong>Rating Comercial de Crédito (CPF dos Sócios e CNPJ da Empresa)</strong> é liberado automaticamente após a identificação do pagamento dos serviços contratados pela Central PROSFEC.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">
            O que é coletado nesta etapa?
          </span>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span><strong>CPF dos Sócios:</strong> Documentos de identificação (CNH/RG), Selfie, Título, Estado Civil, Renda e Referências.</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span><strong>CNPJ da Empresa:</strong> Cartão CNPJ, Contrato Social, Comprovante de Endereço, Faturamento 12M, DRE e Balanço (PDFs).</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <a
            href={
              partnerWhatsapp 
                ? `https://wa.me/55${partnerWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Gostaria de confirmar o pagamento dos serviços de melhoria de crédito da empresa ${lead.razaoSocial || lead.nome} (CNPJ: ${lead.cnpj || ""}) para liberação da Ficha de Rating.`)}`
                : "https://wa.me/5511999999999"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar Comprovante / Falar com a Central</span>
          </a>
        </div>
      </div>
    );
  }

  // Unlocked Active Form View
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xl space-y-6 text-left relative">
      
      {/* Top Header */}
      <div className="space-y-3 border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider font-mono block">
                Etapa de Estruturação
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                Ficha de Cadastro de Rating
              </h2>
            </div>
          </div>

          <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full font-mono ${
            lead.fichaRatingCredito?.status === "aprovado"
              ? "bg-emerald-100 text-emerald-800"
              : lead.fichaRatingCredito?.status === "em_analise"
              ? "bg-blue-100 text-blue-800"
              : lead.fichaRatingCredito?.status === "ajuste_solicitado"
              ? "bg-rose-100 text-rose-800"
              : "bg-amber-100 text-amber-800"
          }`}>
            {lead.fichaRatingCredito?.status === "aprovado" ? "Aprovado" : lead.fichaRatingCredito?.status === "em_analise" ? "Em Análise" : lead.fichaRatingCredito?.status === "ajuste_solicitado" ? "Ajuste Solicitado" : "Pendente"}
          </span>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1 font-bold text-slate-600">
            <span>Progresso de Preenchimento</span>
            <span className="font-mono text-emerald-700">{progress}% concluído</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </motion.div>
        )}

        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-bold"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </motion.div>
        )}

        {/* Visual Workflow Phase Indicator */}
        {(() => {
          const currentFase = lead.fichaRatingCredito?.faseRating || (
            lead.fichaRatingCredito?.conclusaoRating?.notaFinalRating ? "concluido" :
            (lead.fichaRatingCredito?.progressoPercentual || 0) > 40 ? "documentos_recebidos" : "aguardando_documentos"
          );

          const phases = [
            { key: "aguardando_documentos", label: "1. Recolhimento", desc: "Envio de Documentos" },
            { key: "documentos_recebidos", label: "2. Validação", desc: "Triagem Mesa PROSFEC" },
            { key: "em_aplicacao", label: "3. Aplicação", desc: "Melhoria de Rating" },
            { key: "concluido", label: "4. Conclusão", desc: "Parecer & Nota Emitidos" }
          ];

          const phaseIndex = phases.findIndex(p => p.key === currentFase);
          const activeIndex = phaseIndex >= 0 ? phaseIndex : 0;

          return (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700">
                <span className="flex items-center gap-1.5 font-mono text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-[#00A86B]" />
                  Fase Atual da Esteira de Rating:
                </span>
                <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-full font-mono font-black uppercase text-[10px]">
                  {phases[activeIndex]?.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {phases.map((p, idx) => {
                  const isDone = idx < activeIndex;
                  const isCurrent = idx === activeIndex;
                  return (
                    <div 
                      key={p.key}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isDone 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : isCurrent 
                          ? "bg-white border-emerald-500 text-slate-900 shadow-xs ring-2 ring-emerald-500/20" 
                          : "bg-slate-100/50 border-slate-200 text-slate-400 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-center mb-1">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isCurrent ? (
                          <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <span className="text-[10px] font-extrabold block truncate leading-tight">{p.label}</span>
                      <span className="text-[8px] hidden sm:block truncate text-slate-500 font-medium">{p.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Post-Service Technical Conclusion & Final Rating Card */}
        {(lead.fichaRatingCredito?.conclusaoRating?.notaFinalRating || lead.fichaRatingCredito?.faseRating === "concluido") && (
          <div className="bg-gradient-to-br from-[#0A3D2E] via-[#0d4f3b] to-[#0A3D2E] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-500/40 relative overflow-hidden space-y-4">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
              <Award className="w-48 h-48 text-white" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/30 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-emerald-300 flex items-center justify-center font-bold border border-emerald-400/30 shadow-inner">
                  <Award className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Resultado Oficial Pós-Aplicação de Serviço
                  </span>
                  <h3 className="text-lg font-black text-white font-display">
                    Parecer Técnico &amp; Rating Concluído
                  </h3>
                </div>
              </div>

              {lead.fichaRatingCredito?.conclusaoRating?.dataConclusao && (
                <div className="text-right">
                  <span className="text-[9px] text-emerald-200/70 uppercase block font-mono">Data da Emissão</span>
                  <span className="text-xs font-mono font-extrabold text-white">
                    {new Date(lead.fichaRatingCredito.conclusaoRating.dataConclusao).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[9px] uppercase font-mono text-emerald-200/80 block">Nota de Rating</span>
                <span className="text-2xl font-black text-white block mt-0.5 tracking-tight">
                  {lead.fichaRatingCredito?.conclusaoRating?.notaFinalRating || "Aprovado"}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[9px] uppercase font-mono text-emerald-200/80 block">Classificação de Risco</span>
                <span className="text-sm font-extrabold text-emerald-200 block mt-1 capitalize">
                  {lead.fichaRatingCredito?.conclusaoRating?.classificacaoRisco || "Baixo Risco"}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[9px] uppercase font-mono text-emerald-200/80 block">Potencial de Crédito</span>
                <span className="text-sm font-black text-emerald-300 block mt-1">
                  {lead.fichaRatingCredito?.conclusaoRating?.capacidadeTomadaSugerida 
                    ? lead.fichaRatingCredito.conclusaoRating.capacidadeTomadaSugerida
                    : (lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Alto")}
                </span>
              </div>
            </div>

            {lead.fichaRatingCredito?.conclusaoRating?.parecerFinalTecnico && (
              <div className="bg-black/20 rounded-2xl p-4 border border-white/10 relative z-10 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider font-mono block">
                  Síntese do Parecer do Analista:
                </span>
                <p className="text-xs text-emerald-50/90 leading-relaxed italic whitespace-pre-wrap font-sans">
                  "{lead.fichaRatingCredito.conclusaoRating.parecerFinalTecnico}"
                </p>
                {lead.fichaRatingCredito?.conclusaoRating?.analistaResponsavel && (
                  <p className="text-[10px] text-right text-emerald-300/80 font-mono mt-2">
                    Responsável: {lead.fichaRatingCredito.conclusaoRating.analistaResponsavel}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Document Pendency / Rejection Notices from Mesa de Operações */}
        {(() => {
          const valDocs = lead.fichaRatingCredito?.validacoesDocumentos || {};
          const rejectedItems = Object.entries(valDocs).filter(([_, item]: any) => item?.status === "rejeitado" || item?.status === "reprovado");

          if (rejectedItems.length === 0) return null;

          return (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl space-y-2.5 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Ajuste Solicitado pela Mesa Técnica de Rating
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Alguns documentos necessitam de reenvio para prosseguimento da estruturação. Veja os itens abaixo:
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pl-2 border-l-2 border-amber-400">
                {rejectedItems.map(([docKey, val]: any) => (
                  <div key={docKey} className="text-xs bg-white/70 p-2 rounded-xl border border-amber-200">
                    <div className="font-extrabold text-amber-900 capitalize">
                      • {docKey.replace(/([A-Z])/g, " $1")}
                    </div>
                    {(val?.motivo || val?.motivoRecusa) && (
                      <p className="text-[11px] text-amber-800 italic mt-0.5">
                        Motivo: {val.motivo || val.motivoRecusa}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* SECTION 1: Dados para estruturação de Rating Comercial de Crédito CPF(Sócios) */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection(prev => prev === "cpf" ? "cnpj" : "cpf")}
          className="w-full p-4 bg-slate-50/80 hover:bg-slate-100 flex items-center justify-between text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-800">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-display">
                Dados para estruturação de Rating Comercial de Crédito CPF(Sócios)
              </h3>
              <span className="text-[11px] text-slate-500">
                {socios.length} sócio(s) cadastrado(s)
              </span>
            </div>
          </div>
          {openSection === "cpf" || openSection === "both" ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {(openSection === "cpf" || openSection === "both") && (
          <div className="p-4 sm:p-5 space-y-6 bg-white border-t border-slate-100">
            
            {/* Multi-Sócio Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {socios.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => setActiveSocioTab(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeSocioTab === idx
                        ? "bg-[#0A3D2E] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Sócio {idx + 1} {s.nome ? `(${s.nome.split(" ")[0]})` : ""}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddSocio}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Sócio</span>
              </button>
            </div>

            {/* Active Sócio Form */}
            {socios[activeSocioTab] && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
                    Identificação do Sócio {activeSocioTab + 1}
                  </span>
                  {socios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSocio(activeSocioTab)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Sócio</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Nome Completo do Sócio *
                    </label>
                    <input
                      type="text"
                      value={socios[activeSocioTab].nome || ""}
                      onChange={(e) => {
                        const updated = [...socios];
                        updated[activeSocioTab].nome = e.target.value;
                        setSocios(updated);
                      }}
                      placeholder="Nome completo..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      CPF do Sócio *
                    </label>
                    <input
                      type="text"
                      value={socios[activeSocioTab].cpf || ""}
                      onChange={(e) => {
                        const updated = [...socios];
                        updated[activeSocioTab].cpf = e.target.value;
                        setSocios(updated);
                      }}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Estado Civil (Caixa de seleção) *
                    </label>
                    <select
                      value={socios[activeSocioTab].estadoCivil || ""}
                      onChange={(e) => {
                        const updated = [...socios];
                        updated[activeSocioTab].estadoCivil = e.target.value as any;
                        setSocios(updated);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="">Selecione o Estado Civil...</option>
                      {ESTADOS_CIVIS.map(ec => (
                        <option key={ec} value={ec}>{ec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Grau de escolaridade (Caixa de seleção) *
                    </label>
                    <select
                      value={socios[activeSocioTab].escolaridade || ""}
                      onChange={(e) => {
                        const updated = [...socios];
                        updated[activeSocioTab].escolaridade = e.target.value as any;
                        setSocios(updated);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="">Selecione a Escolaridade...</option>
                      {GRAUS_ESCOLARIDADE.map(ge => (
                        <option key={ge} value={ge}>{ge}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Renda Familiar (Escrito em valores R$) *
                    </label>
                    <input
                      type="text"
                      value={socios[activeSocioTab].rendaFamiliar || ""}
                      onChange={(e) => {
                        handleCurrencyChange(e.target.value, (formatted) => {
                          const updated = [...socios];
                          updated[activeSocioTab].rendaFamiliar = formatted;
                          setSocios(updated);
                        });
                      }}
                      placeholder="R$ 0,00"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Renda Bruta individual (Escrito em valores R$) *
                    </label>
                    <input
                      type="text"
                      value={socios[activeSocioTab].rendaBrutaIndividual || ""}
                      onChange={(e) => {
                        handleCurrencyChange(e.target.value, (formatted) => {
                          const updated = [...socios];
                          updated[activeSocioTab].rendaBrutaIndividual = formatted;
                          setSocios(updated);
                        });
                      }}
                      placeholder="R$ 0,00"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {/* Referências Pessoais */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
                      Referências Pessoais do Sócio
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddReferencia(activeSocioTab)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Referência</span>
                    </button>
                  </div>

                  {socios[activeSocioTab].referenciasPessoais?.map((ref, rIdx) => (
                    <div key={rIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">
                          Referência {rIdx + 1}
                        </span>
                        {socios[activeSocioTab].referenciasPessoais.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReferencia(activeSocioTab, rIdx)}
                            className="text-[11px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                          >
                            Excluir
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={ref.nome || ""}
                          onChange={(e) => {
                            const updated = [...socios];
                            updated[activeSocioTab].referenciasPessoais[rIdx].nome = e.target.value;
                            setSocios(updated);
                          }}
                          placeholder="Nome da Referência..."
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                        <input
                          type="text"
                          value={ref.telefone || ""}
                          onChange={(e) => {
                            const updated = [...socios];
                            updated[activeSocioTab].referenciasPessoais[rIdx].telefone = e.target.value;
                            setSocios(updated);
                          }}
                          placeholder="Telefone / WhatsApp..."
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                        <input
                          type="text"
                          value={ref.parentesco || ""}
                          onChange={(e) => {
                            const updated = [...socios];
                            updated[activeSocioTab].referenciasPessoais[rIdx].parentesco = e.target.value;
                            setSocios(updated);
                          }}
                          placeholder="Grau de parentesco (ex: Irmão, Amigo)..."
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Anexos de documento do Sócio */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono block">
                    Anexos de Documento do Sócio {activeSocioTab + 1}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Foto CNH ou RG (Frente) */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Foto CNH ou RG (Frente)</span>
                        {socios[activeSocioTab].fotoCnhRgFrente && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Anexado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition-all truncate">
                          <Upload className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{socios[activeSocioTab].fotoCnhRgFrenteNome || "Escolher Foto Frente"}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => handleSocioFileUpload(activeSocioTab, "fotoCnhRgFrente", e.target.files?.[0] || null)}
                          />
                        </label>
                        {socios[activeSocioTab].fotoCnhRgFrente && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile({
                              name: socios[activeSocioTab].fotoCnhRgFrenteNome || "CNH/RG Frente",
                              url: socios[activeSocioTab].fotoCnhRgFrente!
                            })}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                            title="Visualizar anexo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Foto CNH ou RG (Verso) */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Foto CNH ou RG (Verso)</span>
                        {socios[activeSocioTab].fotoCnhRgVerso && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Anexado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition-all truncate">
                          <Upload className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{socios[activeSocioTab].fotoCnhRgVersoNome || "Escolher Foto Verso"}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => handleSocioFileUpload(activeSocioTab, "fotoCnhRgVerso", e.target.files?.[0] || null)}
                          />
                        </label>
                        {socios[activeSocioTab].fotoCnhRgVerso && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile({
                              name: socios[activeSocioTab].fotoCnhRgVersoNome || "CNH/RG Verso",
                              url: socios[activeSocioTab].fotoCnhRgVerso!
                            })}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                            title="Visualizar anexo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Selfie segurando o mesmo documento */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Selfie segurando o documento</span>
                        {socios[activeSocioTab].selfieComDocumento && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Anexado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition-all truncate">
                          <Upload className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{socios[activeSocioTab].selfieComDocumentoNome || "Escolher Selfie"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleSocioFileUpload(activeSocioTab, "selfieComDocumento", e.target.files?.[0] || null)}
                          />
                        </label>
                        {socios[activeSocioTab].selfieComDocumento && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile({
                              name: socios[activeSocioTab].selfieComDocumentoNome || "Selfie com documento",
                              url: socios[activeSocioTab].selfieComDocumento!
                            })}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                            title="Visualizar anexo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Foto de Título de Eleitor */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Foto de Título de Eleitor</span>
                        {socios[activeSocioTab].fotoTituloEleitor && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Anexado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition-all truncate">
                          <Upload className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{socios[activeSocioTab].fotoTituloEleitorNome || "Escolher Título"}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => handleSocioFileUpload(activeSocioTab, "fotoTituloEleitor", e.target.files?.[0] || null)}
                          />
                        </label>
                        {socios[activeSocioTab].fotoTituloEleitor && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile({
                              name: socios[activeSocioTab].fotoTituloEleitorNome || "Título de Eleitor",
                              url: socios[activeSocioTab].fotoTituloEleitor!
                            })}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                            title="Visualizar anexo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </div>

      {/* SECTION 2: Dados para estruturação de Rating Comercial de Crédito CNPJ(Empresa) */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection(prev => prev === "cnpj" ? "cpf" : "cnpj")}
          className="w-full p-4 bg-slate-50/80 hover:bg-slate-100 flex items-center justify-between text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-100/70 text-teal-800">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-display">
                Dados para estruturação de Rating Comercial de Crédito CNPJ(Empresa)
              </h3>
              <span className="text-[11px] text-slate-500">
                Anexos fiscais, contábeis e societários (PDFs)
              </span>
            </div>
          </div>
          {openSection === "cnpj" || openSection === "both" ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {(openSection === "cnpj" || openSection === "both") && (
          <div className="p-4 sm:p-5 space-y-6 bg-white border-t border-slate-100">
            
            {/* General partner photos for company file */}
            <div className="space-y-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono block">
                Documentos com Foto dos Sócios (Todos os Sócios)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DocLinkInput
                  label="Doc Foto (Frente)"
                  value={dadosCNPJ.documentoFotoFrenteTodosSocios}
                  onChange={(url) => handleCNPJLinkChange("documentoFotoFrenteTodosSocios", url, "Doc Foto Frente")}
                />

                <DocLinkInput
                  label="Doc Foto (Verso)"
                  value={dadosCNPJ.documentoFotoVersoTodosSocios}
                  onChange={(url) => handleCNPJLinkChange("documentoFotoVersoTodosSocios", url, "Doc Foto Verso")}
                />

                <DocLinkInput
                  label="Selfie dos Sócios"
                  value={dadosCNPJ.selfieTodosSocios}
                  onChange={(url) => handleCNPJLinkChange("selfieTodosSocios", url, "Selfie dos Sócios")}
                />

              </div>
            </div>

            {/* MANDATORY PDF SECTION */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
                  Anexos Obrigatórios da Empresa (Apenas formato PDF)
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                  .PDF Obrigatório
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                <DocLinkInput
                  label="Cartão CNPJ (PDF)"
                  required
                  value={dadosCNPJ.cartaoCnpjPdf}
                  onChange={(url) => handleCNPJLinkChange("cartaoCnpjPdf", url, "Cartão CNPJ")}
                />

                <DocLinkInput
                  label="Contrato Social (PDF)"
                  required
                  value={dadosCNPJ.contratoSocialPdf}
                  onChange={(url) => handleCNPJLinkChange("contratoSocialPdf", url, "Contrato Social")}
                />

                <DocLinkInput
                  label="Comprovante de Residência (PDF)"
                  required
                  value={dadosCNPJ.comprovanteResidenciaPdf}
                  onChange={(url) => handleCNPJLinkChange("comprovanteResidenciaPdf", url, "Comprovante de Residência")}
                />

                <DocLinkInput
                  label="Faturamento 12 Meses (PDF)"
                  required
                  value={dadosCNPJ.faturamento12MesesPdf}
                  onChange={(url) => handleCNPJLinkChange("faturamento12MesesPdf", url, "Faturamento 12 Meses")}
                />

                <DocLinkInput
                  label="DRE (PDF)"
                  required
                  value={dadosCNPJ.drePdf}
                  onChange={(url) => handleCNPJLinkChange("drePdf", url, "DRE")}
                />

                <DocLinkInput
                  label="Balanço Patrimonial (PDF)"
                  required
                  value={dadosCNPJ.balancoPatrimonialPdf}
                  onChange={(url) => handleCNPJLinkChange("balancoPatrimonialPdf", url, "Balanço Patrimonial")}
                />


                {/* RTB - Recuperação de Tarifa Bancária (Cédula de Crédito Bancário - CCB) */}
                <div className="p-4 bg-linear-to-br from-emerald-900/10 via-teal-900/5 to-slate-50 rounded-2xl border-2 border-emerald-600/30 space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-xs font-black text-slate-900">
                          CCB - Cédula de Crédito Bancário (PDF)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Serviço RTB: Auditoria pericial de tarifas abusivas e TAC/TEC com a PROSFEC IA
                      </p>
                    </div>
                    {dadosCNPJ.ccbContratoPdf ? (
                      <span className="text-[10px] bg-emerald-700 text-white font-extrabold px-2.5 py-0.5 rounded-full shrink-0 shadow-xs">
                        CCB Anexada
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full shrink-0">
                        Opcional p/ RTB
                      </span>
                    )}
                  </div>

                  {/* Informações Complementares Opcionais */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Banco Emissor (ex: Santander, BB...)"
                      value={dadosCNPJ.ccbBancoEmissor || ""}
                      onChange={(e) => setDadosCNPJ(prev => ({ ...prev, ccbBancoEmissor: e.target.value }))}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-emerald-600 font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Valor CCB (ex: R$ 150.000)"
                      value={dadosCNPJ.ccbValorContrato ? `R$ ${Number(dadosCNPJ.ccbValorContrato).toLocaleString('pt-BR')}` : ""}
                      onChange={(e) => {
                        const num = Number(e.target.value.replace(/\D/g, ''));
                        setDadosCNPJ(prev => ({ ...prev, ccbValorContrato: num || undefined }));
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-emerald-600 font-medium"
                    />
                  </div>

                  {/* File Upload Selector */}
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-emerald-300 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl cursor-pointer transition-all truncate shadow-xs">
                      <Upload className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="truncate">{dadosCNPJ.ccbContratoPdfNome || "Selecionar PDF da CCB / Contrato"}</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => handleCNPJFileUpload("ccbContratoPdf", e.target.files?.[0] || null, true)}
                      />
                    </label>
                    {dadosCNPJ.ccbContratoPdf && (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({
                          name: dadosCNPJ.ccbContratoPdfNome || "CCB Contrato Bancário",
                          url: dadosCNPJ.ccbContratoPdf!,
                          isPdf: true
                        })}
                        className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer"
                        title="Visualizar PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Trigger Button: Analisar CCB com PROSFEC IA */}
                  {dadosCNPJ.ccbContratoPdf && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleAnalisarCCBComIA}
                        disabled={analisandoRTB}
                        className="w-full py-2.5 px-4 bg-linear-to-r from-[#0A3D2E] via-teal-800 to-emerald-700 hover:from-[#082f23] hover:to-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                      >
                        {analisandoRTB ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-emerald-300" />
                            <span>PROSFEC IA Analisando Cláusulas da CCB...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-emerald-300" />
                            <span>{analiseRTB ? "Reanalisar CCB com PROSFEC IA" : "Analisar CCB com PROSFEC IA"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* RTB Result Card Banner */}
                  {analiseRTB && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Laudo RTB Disponível
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {analiseRTB.protocoloLaudo}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">Potencial de Restituição:</span>
                          <span className="text-base font-black text-emerald-700">
                            {formatCurrencyBRL(analiseRTB.potencialRecuperacaoTotal)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRTBModal(true)}
                          className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Laudo Completo
                        </button>
                      </div>
                    </div>
                  )}

                  {rtbError && (
                    <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {rtbError}
                    </p>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* Action Buttons: Salvar Rascunho / Enviar para Análise */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 flex-wrap">
        <button
          type="button"
          onClick={() => handleSaveData(false)}
          disabled={saving}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Salvar Rascunho</span>
        </button>

        <button
          type="button"
          onClick={() => handleSaveData(true)}
          disabled={saving}
          className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {saving ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Salvar &amp; Enviar para Análise</span>
            </>
          )}
        </button>
      </div>

      {/* Modal Preview File */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-5 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {previewFile.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-50 rounded-2xl border border-slate-100 min-h-[300px]">
                {previewFile.isPdf || previewFile.url.startsWith("data:application/pdf") ? (
                  <iframe
                    src={previewFile.url}
                    title={previewFile.name}
                    className="w-full h-[450px] rounded-xl border-0"
                  />
                ) : (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-h-[450px] w-auto object-contain rounded-xl shadow-xs"
                  />
                )}
              </div>

              <div className="pt-3 flex justify-end">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="px-4 py-2 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  Baixar Arquivo
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Laudo Pericial RTB */}
      <AnimatePresence>
        {showRTBModal && analiseRTB && (
          <RTBAuditoriaViewerModal
            analiseRTB={analiseRTB}
            razaoSocial={lead.razaoSocial || lead.nome}
            cnpj={lead.cnpj}
            ccbPdfUrl={dadosCNPJ.ccbContratoPdf}
            onClose={() => setShowRTBModal(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
