// @ts-nocheck
import React, { useState } from "react";
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Building2, 
  Download, 
  Eye, 
  Lock, 
  Unlock, 
  Save, 
  X, 
  FileCheck, 
  Phone,
  DollarSign,
  GraduationCap,
  Users,
  Sparkles,
  ExternalLink,
  Edit3,
  Check,
  AlertTriangle,
  Send,
  HelpCircle,
  Archive,
  ArrowRight,
  Clock,
  Layers,
  Award,
  Scale
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Lead, 
  FichaRatingCredito, 
  ValidacaoItemDoc, 
  ConclusaoRatingPosServico, 
  SocioRatingCPF, 
  DadosRatingCNPJ,
  AnaliseRTB
} from "../types";
import { sanitizeFirestoreData, formatCurrencyBRL } from "../utils";
import RTBAuditoriaViewerModal from "./RTBAuditoriaViewerModal";

interface FichaRatingAdmViewerProps {
  lead: Lead;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

const MELHORIAS_DISPONIVEIS = [
  "Adequação e Saneamento Cadastral",
  "Regularização e Desvinculação BACEN (SCR)",
  "Otimização de Índices de Liquidez no Balanço/DRE",
  "Elevação de Score de Crédito e Rating Bancário",
  "Reestruturação de Endividamento de Curto Prazo",
  "Emissão de Parecer Técnico de Capacidade Financeira"
];

const NOTAS_RATING_PRESETS = [
  "AAA (Excelente)",
  "AA (Muito Bom)",
  "A1 (Ótimo)",
  "A2 (Bom)",
  "BBB (Moderado)",
  "BB (Regular)",
  "B (Em Adequação)"
];

export default function FichaRatingAdmViewer({
  lead,
  onLeadUpdated
}: FichaRatingAdmViewerProps) {
  const ratingData: FichaRatingCredito | undefined = lead.fichaRatingCredito;
  const isUnlocked = Boolean(
    lead.pagamentoConfirmado || 
    lead.pagamentoServicosConfirmado || 
    lead.liberarFichaRating || 
    lead.servicosRecomendados?.some((s: any) => s.pago || s.statusPagamento === 'pago') || 
    lead.subEtapasPasso6?.some((s: any) => s.pago || s.statusPagamento === 'pago') || 
    (lead.etapa && lead.etapa >= 6)
  );

  const [activeTab, setActiveTab] = useState<"cpf" | "cnpj" | "pos_servico">("cpf");
  const [selectedSocioIdx, setSelectedSocioIdx] = useState(0);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; isPdf?: boolean } | null>(null);
  const [showRTBModal, setShowRTBModal] = useState(false);
  
  const [status, setStatus] = useState(ratingData?.status || "pendente");
  const [observacoes, setObservacoes] = useState(ratingData?.observacoesAdm || "");
  const [isManuallyUnlocked, setIsManuallyUnlocked] = useState(Boolean(lead.liberarFichaRating || lead.pagamentoConfirmado));
  
  // Validations per document
  const [validacoes, setValidacoes] = useState<Record<string, ValidacaoItemDoc>>(
    ratingData?.validacoesDocumentos || {}
  );
  const [editingMotivoKey, setEditingMotivoKey] = useState<string | null>(null);
  const [tempMotivoText, setTempMotivoText] = useState<string>("");

  // Links sinalizados como inacessíveis pela Mesa (permissão de compartilhamento etc.)
  const [linksProblematicos, setLinksProblematicos] = useState<Record<string, { label: string; motivo: string; sinalizadoEm: string }>>(
    (ratingData as any)?.linksProblematicos || {}
  );


  // Post-service Conclusion State
  const [notaRating, setNotaRating] = useState<string>(ratingData?.conclusaoRating?.notaFinalRating || "AA (Muito Bom)");
  const [classificacaoRisco, setClassificacaoRisco] = useState<any>(ratingData?.conclusaoRating?.classificacaoRisco || "Risco Mínimo (AAA/AA)");
  const [capacidadeTomada, setCapacidadeTomada] = useState<string>(
    ratingData?.conclusaoRating?.capacidadeTomadaSugerida || (lead.limiteEstimado ? `R$ ${lead.limiteEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 250.000,00")
  );
  const [melhoriasSelecionadas, setMelhoriasSelecionadas] = useState<string[]>(
    ratingData?.conclusaoRating?.melhoriasAplicadas || [
      "Adequação e Saneamento Cadastral",
      "Regularização e Desvinculação BACEN (SCR)",
      "Elevação de Score de Crédito e Rating Bancário"
    ]
  );
  const [parecerTecnico, setParecerTecnico] = useState<string>(
    ratingData?.conclusaoRating?.parecerFinalTecnico || 
    "Após aplicação dos serviços de adequação de perfil de crédito e saneamento de apontamentos cadastrais, a empresa apresenta capacidade financeira robusta para captação de recursos junto aos agentes financeiros com taxa otimizada."
  );
  const [analistaResponsavel, setAnalistaResponsavel] = useState<string>(
    ratingData?.conclusaoRating?.analistaResponsavel || "Mesa de Operações e Rating PROSFEC"
  );

  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [downloadBatchProgress, setDownloadBatchProgress] = useState<string | null>(null);

  // Toggle unlock for client portal
  const handleToggleUnlock = async () => {
    const newState = !isManuallyUnlocked;
    setIsManuallyUnlocked(newState);
    setSaving(true);
    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, {
        liberarFichaRating: newState,
        pagamentoConfirmado: newState
      });
      const updated = {
        ...lead,
        liberarFichaRating: newState,
        pagamentoConfirmado: newState
      };
      if (onLeadUpdated) onLeadUpdated(updated);
      setSaveFeedback(newState ? "Ficha de Rating LIBERADA para o cliente com sucesso!" : "Ficha de Rating BLOQUEADA para o cliente.");
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err) {
      console.error("Erro ao atualizar status de liberação:", err);
      setSaveFeedback("Erro ao atualizar no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  // Update validation status for a single doc
  const handleSetDocValidation = async (docKey: string, statusVal: "aprovado" | "rejeitado" | "pendente", motivo?: string) => {
    const updatedValidacoes: Record<string, ValidacaoItemDoc> = {
      ...validacoes,
      [docKey]: {
        status: statusVal,
        motivo: motivo || (statusVal === "rejeitado" ? "Documento ilegível ou incorreto. Favor reenviar." : ""),
        dataValidacao: new Date().toISOString()
      }
    };
    setValidacoes(updatedValidacoes);
    setEditingMotivoKey(null);
    setTempMotivoText("");

    // Auto save in Firestore
    try {
      const docRef = doc(db, "leads", lead.id);
      const updatedFicha: FichaRatingCredito = {
        status: ratingData?.status || "em_analise",
        sociosCPF: ratingData?.sociosCPF || [],
        dadosCNPJ: ratingData?.dadosCNPJ || {},
        ...(ratingData || {}),
        validacoesDocumentos: updatedValidacoes,
        dataAtualizacao: new Date().toISOString()
      };
      await updateDoc(docRef, {
        fichaRatingCredito: sanitizeFirestoreData(updatedFicha)
      });
      if (onLeadUpdated) {
        onLeadUpdated({
          ...lead,
          fichaRatingCredito: updatedFicha
        });
      }
    } catch (e) {
      console.error("Erro ao salvar validação de doc:", e);
    }
  };

  // Sinalizar / remover sinalização de link inacessível
  const handleToggleLinkProblema = async (docKey: string, label: string) => {
    const jaSinalizado = Boolean(linksProblematicos[docKey]);
    const updated = { ...linksProblematicos };
    if (jaSinalizado) {
      delete updated[docKey];
    } else {
      updated[docKey] = {
        label,
        motivo: "Não foi possível acessar o link. Revise a permissão de compartilhamento e reenvie.",
        sinalizadoEm: new Date().toISOString()
      };
    }
    setLinksProblematicos(updated);

    try {
      const docRef = doc(db, "leads", lead.id);
      const updatedFicha: any = {
        status: ratingData?.status || "em_analise",
        sociosCPF: ratingData?.sociosCPF || [],
        dadosCNPJ: ratingData?.dadosCNPJ || {},
        ...(ratingData || {}),
        linksProblematicos: updated,
        dataAtualizacao: new Date().toISOString()
      };
      await updateDoc(docRef, {
        fichaRatingCredito: sanitizeFirestoreData(updatedFicha)
      });
      if (onLeadUpdated) onLeadUpdated({ ...lead, fichaRatingCredito: updatedFicha });
      setSaveFeedback(jaSinalizado ? "Sinalização de link removida." : "Link sinalizado como inacessível. O cliente verá o aviso de reenvio.");
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (e) {
      console.error("Erro ao sinalizar link inacessível:", e);
      setSaveFeedback("Erro ao salvar sinalização do link.");
    }
  };


  // Toggle Improvement Tag in Post-Service
  const handleToggleMelhoria = (m: string) => {
    if (melhoriasSelecionadas.includes(m)) {
      setMelhoriasSelecionadas(melhoriasSelecionadas.filter(item => item !== m));
    } else {
      setMelhoriasSelecionadas([...melhoriasSelecionadas, m]);
    }
  };

  // Calculate list of all documents with their status
  const getAllDocumentsList = () => {
    const list: Array<{
      key: string;
      label: string;
      category: "CPF" | "CNPJ";
      fileUrl?: string;
      fileName?: string;
      isPdf?: boolean;
      validation?: ValidacaoItemDoc;
    }> = [];

    // CPF socios docs
    if (ratingData?.sociosCPF) {
      ratingData.sociosCPF.forEach((s, idx) => {
        const socioName = s.nome ? s.nome.split(" ")[0] : `Sócio ${idx + 1}`;
        list.push({
          key: `cnh_frente_${idx}`,
          label: `CNH/RG (Frente) - ${socioName}`,
          category: "CPF",
          fileUrl: s.fotoCnhRgFrente,
          fileName: s.fotoCnhRgFrenteNome || `cnh_frente_${socioName}.png`,
          validation: validacoes[`cnh_frente_${idx}`]
        });
        list.push({
          key: `cnh_verso_${idx}`,
          label: `CNH/RG (Verso) - ${socioName}`,
          category: "CPF",
          fileUrl: s.fotoCnhRgVerso,
          fileName: s.fotoCnhRgVersoNome || `cnh_verso_${socioName}.png`,
          validation: validacoes[`cnh_verso_${idx}`]
        });
        list.push({
          key: `selfie_${idx}`,
          label: `Selfie com Documento - ${socioName}`,
          category: "CPF",
          fileUrl: s.selfieComDocumento,
          fileName: s.selfieComDocumentoNome || `selfie_${socioName}.png`,
          validation: validacoes[`selfie_${idx}`]
        });
        list.push({
          key: `titulo_${idx}`,
          label: `Título de Eleitor - ${socioName}`,
          category: "CPF",
          fileUrl: s.fotoTituloEleitor,
          fileName: s.fotoTituloEleitorNome || `titulo_${socioName}.png`,
          validation: validacoes[`titulo_${idx}`]
        });
      });
    }

    // CNPJ docs
    const cnpj = ratingData?.dadosCNPJ;
    list.push({
      key: "cnpj_foto_frente",
      label: "Foto Frente (Todos os Sócios)",
      category: "CNPJ",
      fileUrl: cnpj?.documentoFotoFrenteTodosSocios,
      fileName: cnpj?.documentoFotoFrenteTodosSociosNome || "foto_frente_socios.png",
      validation: validacoes["cnpj_foto_frente"]
    });
    list.push({
      key: "cnpj_foto_verso",
      label: "Foto Verso (Todos os Sócios)",
      category: "CNPJ",
      fileUrl: cnpj?.documentoFotoVersoTodosSocios,
      fileName: cnpj?.documentoFotoVersoTodosSociosNome || "foto_verso_socios.png",
      validation: validacoes["cnpj_foto_verso"]
    });
    list.push({
      key: "cnpj_selfie",
      label: "Selfie de Todos os Sócios",
      category: "CNPJ",
      fileUrl: cnpj?.selfieTodosSocios,
      fileName: cnpj?.selfieTodosSociosNome || "selfie_socios.png",
      validation: validacoes["cnpj_selfie"]
    });
    list.push({
      key: "cnpj_cartao_cnpj",
      label: "Cartão CNPJ (PDF)",
      category: "CNPJ",
      fileUrl: cnpj?.cartaoCnpjPdf,
      fileName: cnpj?.cartaoCnpjPdfNome || "cartao_cnpj.pdf",
      isPdf: true,
      validation: validacoes["cnpj_cartao_cnpj"]
    });
    list.push({
      key: "cnpj_contrato_social",
      label: "Contrato Social / Última Alteração (PDF)",
      category: "CNPJ",
      fileUrl: cnpj?.contratoSocialPdf,
      fileName: cnpj?.contratoSocialPdfNome || "contrato_social.pdf",
      isPdf: true,
      validation: validacoes["cnpj_contrato_social"]
    });
    list.push({
      key: "cnpj_comprovante_residencia",
      label: "Comprovante de Endereço (PDF)",
      category: "CNPJ",
      fileUrl: cnpj?.comprovanteResidenciaPdf,
      fileName: cnpj?.comprovanteResidenciaPdfNome || "comprovante_endereco.pdf",
      isPdf: true,
      validation: validacoes["cnpj_comprovante_residencia"]
    });
    list.push({
      key: "cnpj_faturamento_12m",
      label: "Faturamento 12 Meses (PDF)",
      category: "CNPJ",
      fileUrl: cnpj?.faturamento12MesesPdf,
      fileName: cnpj?.faturamento12MesesPdfNome || "faturamento_12m.pdf",
      isPdf: true,
      validation: validacoes["cnpj_faturamento_12m"]
    });
    list.push({
      key: "cnpj_dre",
      label: "DRE - Demonstração de Resultado (PDF)",
      category: "CNPJ",
      fileUrl: cnpj?.drePdf,
      fileName: cnpj?.drePdfNome || "dre.pdf",
      isPdf: true,
      validation: validacoes["cnpj_dre"]
    });
    list.push({
      key: "cnpj_balanco_patrimonial",
      label: "Balanço Patrimonial (PDF)",
      category: "CNPJ",
      fileUrl: cnpj?.balancoPatrimonialPdf,
      fileName: cnpj?.balancoPatrimonialPdfNome || "balanco_patrimonial.pdf",
      isPdf: true,
      validation: validacoes["cnpj_balanco_patrimonial"]
    });
    list.push({
      key: "cnpj_ccb_pdf",
      label: "Cédula de Crédito Bancário - CCB (PDF)",
      category: "CNPJ",
      fileUrl: cnpj?.ccbContratoPdf,
      fileName: cnpj?.ccbContratoPdfNome || "ccb_contrato.pdf",
      isPdf: true,
      validation: validacoes["cnpj_ccb_pdf"]
    });

    return list;
  };

  const allDocs = getAllDocumentsList();
  const uploadedDocs = allDocs.filter(d => Boolean(d.fileUrl));
  const rejectedDocs = allDocs.filter(d => d.validation?.status === "rejeitado");
  const approvedDocs = allDocs.filter(d => d.validation?.status === "aprovado");
  const pendingDocs = allDocs.filter(d => !d.fileUrl || d.validation?.status === "pendente");

  // 100% Automatic phase determination
  const getAutomaticFase = (): "aguardando_documentos" | "documentos_recebidos" | "em_aplicacao" | "concluido" => {
    if (ratingData?.conclusaoRating?.notaFinalRating || ratingData?.status === "aprovado" || ratingData?.faseRating === "concluido") {
      return "concluido";
    }
    if (uploadedDocs.length === 0 && !ratingData?.dataEnvio) {
      return "aguardando_documentos";
    }
    if (ratingData?.faseRating === "em_aplicacao" || (approvedDocs.length > 0 && approvedDocs.length >= uploadedDocs.length)) {
      return "em_aplicacao";
    }
    return "documentos_recebidos";
  };

  const currentFase = getAutomaticFase();

  // Save General Rating Assessment (automatically synchronizes with current phase)
  const handleSaveAdmReview = async () => {
    setSaving(true);
    setSaveFeedback(null);
    const now = new Date().toISOString();

    const updatedRating: FichaRatingCredito = {
      sociosCPF: ratingData?.sociosCPF || [],
      dadosCNPJ: ratingData?.dadosCNPJ || {},
      status: currentFase === "concluido" ? "aprovado" : (status as any),
      faseRating: currentFase,
      dataEnvio: ratingData?.dataEnvio || "",
      dataAtualizacao: now,
      observacoesAdm: observacoes,
      progressoPercentual: ratingData?.progressoPercentual || 0,
      validacoesDocumentos: validacoes,
      conclusaoRating: ratingData?.conclusaoRating
    };

    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, {
        fichaRatingCredito: sanitizeFirestoreData(updatedRating)
      });

      const updated = {
        ...lead,
        fichaRatingCredito: updatedRating
      };
      if (onLeadUpdated) onLeadUpdated(updated);

      setSaveFeedback("Dossiê de Rating salvo e atualizado com sucesso!");
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err: any) {
      console.error("Erro ao salvar avaliação de rating:", err);
      setSaveFeedback("Erro ao salvar no Firestore: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  // Save Post-Service Conclusion & Issue Final Rating (Sets Phase to Concluído)
  const handleConcluirRating = async () => {
    setSaving(true);
    setSaveFeedback(null);
    const now = new Date().toISOString();

    const conclusaoObj: ConclusaoRatingPosServico = {
      notaFinalRating: notaRating,
      classificacaoRisco: classificacaoRisco,
      capacidadeTomadaSugerida: capacidadeTomada,
      melhoriasAplicadas: melhoriasSelecionadas,
      parecerFinalTecnico: parecerTecnico,
      dataConclusao: now,
      analistaResponsavel: analistaResponsavel
    };

    const updatedRating: FichaRatingCredito = {
      sociosCPF: ratingData?.sociosCPF || [],
      dadosCNPJ: ratingData?.dadosCNPJ || {},
      status: "aprovado",
      faseRating: "concluido",
      dataEnvio: ratingData?.dataEnvio || "",
      dataAtualizacao: now,
      observacoesAdm: observacoes,
      progressoPercentual: 100,
      validacoesDocumentos: validacoes,
      conclusaoRating: conclusaoObj
    };

    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, {
        fichaRatingCredito: sanitizeFirestoreData(updatedRating)
      });

      const updated = {
        ...lead,
        fichaRatingCredito: updatedRating
      };
      if (onLeadUpdated) onLeadUpdated(updated);

      setSaveFeedback("Parecer Técnico e Nota de Rating emitidos com sucesso!");
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err: any) {
      console.error("Erro ao emitir parecer de rating:", err);
      setSaveFeedback("Erro ao salvar no Firestore: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Message Generator for Pendencies & Rejections
  const handleGenerateWhatsAppPendencias = () => {
    const clientPhone = (lead.whatsapp || "").replace(/\D/g, "");
    if (!clientPhone) {
      alert("Este lead não possui número de WhatsApp cadastrado.");
      return;
    }

    const companyName = lead.razaoSocial || lead.nome || "Cliente";
    let message = `Olá, *${companyName}*! Aqui é da Mesa de Operações e Crédito da *PROSFEC*.\n\n`;
    message += `Estamos revisando a documentação da sua empresa para a estruturação do seu *Dossiê de Rating Comercial*.\n\n`;

    if (rejectedDocs.length > 0) {
      message += `❌ *DOCUMENTOS QUE PRECISAM DE CORREÇÃO / REENVIO:*\n`;
      rejectedDocs.forEach((d) => {
        message += `• *${d.label}*: ${d.validation?.motivo || "Documento ilegível ou desatualizado"}\n`;
      });
      message += `\n`;
    }

    const missingDocs = allDocs.filter(d => !d.fileUrl);
    if (missingDocs.length > 0) {
      message += `⏳ *DOCUMENTOS PENDENTES DE ENVIO:*\n`;
      missingDocs.forEach((d) => {
        message += `• ${d.label}\n`;
      });
      message += `\n`;
    }

    message += `👉 *Como regularizar:* Acesse o seu Portal de Acompanhamento no link abaixo e faça o upload dos arquivos atualizados na aba *Ficha de Rating*:\n`;
    message += `https://prosfec.com.br/?acompanhamento=${lead.id}\n\n`;
    message += `Qualquer dúvida estamos à inteira disposição para auxiliá-lo!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${clientPhone}&text=${encoded}`, "_blank");
  };

  // Batch Download of all uploaded documents
  const handleDownloadAllDocuments = () => {
    if (uploadedDocs.length === 0) {
      alert("Nenhum documento foi anexado pelo cliente ainda.");
      return;
    }

    setDownloadBatchProgress(`Iniciando download de ${uploadedDocs.length} documentos...`);

    uploadedDocs.forEach((docItem, idx) => {
      setTimeout(() => {
        if (!docItem.fileUrl) return;
        const link = document.createElement("a");
        link.href = docItem.fileUrl;
        const sanitizedCnpj = (lead.cnpj || "CNPJ").replace(/\D/g, "");
        link.download = `${sanitizedCnpj}_${docItem.fileName || `doc_${idx + 1}`}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (idx === uploadedDocs.length - 1) {
          setDownloadBatchProgress(null);
          setSaveFeedback(`Download de ${uploadedDocs.length} documentos concluído com sucesso!`);
          setTimeout(() => setSaveFeedback(null), 4000);
        }
      }, idx * 400);
    });
  };

  // Render individual document card with validation control
  const renderDocCard = (
    docKey: string,
    title: string,
    fileUrl?: string,
    fileName?: string,
    isPdf?: boolean
  ) => {
    const val = validacoes[docKey];
    const isApproved = val?.status === "aprovado";
    const isRejected = val?.status === "rejeitado";
    const isEditingMotivo = editingMotivoKey === docKey;
    const linkProblema = linksProblematicos[docKey];

    return (
      <div 
        key={docKey}
        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
          isApproved
            ? "bg-emerald-50/60 border-emerald-300 shadow-xs ring-1 ring-emerald-500/10"
            : isRejected
            ? "bg-rose-50/70 border-rose-300 shadow-xs ring-1 ring-rose-500/10"
            : fileUrl
            ? "bg-white border-slate-200 hover:border-slate-300"
            : "bg-slate-50 border-dashed border-slate-200 opacity-80"
        }`}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-800 line-clamp-1" title={title}>
              {title}
            </span>
            {fileName && (
              <span className="text-[10px] text-slate-400 font-mono block truncate" title={fileName}>
                {fileName}
              </span>
            )}
          </div>

          {/* Status Badge */}
          {isApproved ? (
            <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" /> Aprovado
            </span>
          ) : isRejected ? (
            <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 animate-pulse">
              <X className="w-3 h-3" /> Rejeitado
            </span>
          ) : fileUrl ? (
            <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
              Recebido
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
              Pendente
            </span>
          )}
        </div>

        {/* Link inacessível badge */}
        {linkProblema && (
          <div className="p-2 bg-rose-600 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Link inacessível — solicitar reenvio</span>
          </div>
        )}


        {/* Rejection Motive Display */}
        {isRejected && val?.motivo && (
          <div className="p-2 bg-rose-100/70 border border-rose-200 rounded-xl text-[11px] text-rose-900 font-medium">
            <span className="font-bold block text-[10px] uppercase text-rose-700 font-mono">Motivo da Recusa:</span>
            {val.motivo}
          </div>
        )}

        {/* Inline Rejection Input */}
        {isEditingMotivo && (
          <div className="space-y-1.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
            <label className="block text-[10px] font-black text-rose-800 uppercase font-mono">
              Motivo da Recusa / Ajuste Necessário:
            </label>
            <input
              type="text"
              value={tempMotivoText}
              onChange={(e) => setTempMotivoText(e.target.value)}
              placeholder="Ex: Foto cortada, DRE sem assinatura, ilegível..."
              className="w-full text-xs p-2 bg-white border border-rose-300 rounded-lg outline-none focus:ring-1 focus:ring-rose-500"
              autoFocus
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => { setEditingMotivoKey(null); setTempMotivoText(""); }}
                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-md cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSetDocValidation(docKey, "rejeitado", tempMotivoText)}
                className="px-2.5 py-1 text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer shadow-xs"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        )}

        {/* View & Download buttons */}
        {fileUrl ? (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
            {String(fileUrl).startsWith("data:") ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewFile({ name: fileName || title, url: fileUrl, isPdf })}
                  className="flex-1 py-1.5 bg-[#0A3D2E] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visualizar</span>
                </button>
                <a
                  href={fileUrl}
                  download={fileName || "documento"}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 bg-[#0A3D2E] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
                title="Abrir link do documento em nova aba"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Abrir link</span>
              </a>
            )}


            {/* Validation Toggle Buttons */}
            <button
              type="button"
              onClick={() => handleSetDocValidation(docKey, "aprovado")}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isApproved 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700"
              }`}
              title="Aprovar Documento"
            >
              <Check className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingMotivoKey(docKey);
                setTempMotivoText(val?.motivo || "Documento ilegível ou cortado. Favor reenviar.");
              }}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isRejected 
                  ? "bg-rose-600 text-white shadow-xs" 
                  : "bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700"
              }`}
              title="Rejeitar Documento e Informar Motivo"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleToggleLinkProblema(docKey, title)}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                linkProblema
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700"
              }`}
              title={linkProblema ? "Remover sinalização de link inacessível" : "Sinalizar link inacessível"}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
          </div>

        ) : (
          <div className="pt-1 text-[11px] text-slate-400 italic">
            Aguardando anexo do cliente no portal
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* TOP HEADER: Rating Workflow Phase Lifecycle Stepper */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#0A3D2E] text-white p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Mesa de Operações & Rating
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                {uploadedDocs.length} de {allDocs.length} docs anexados ({Math.round((uploadedDocs.length / Math.max(1, allDocs.length)) * 100)}%)
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-white flex items-center gap-2">
              <span>Dossiê & Ficha de Rating de Crédito</span>
              <span className="text-xs font-normal text-emerald-300">({lead.razaoSocial || lead.nome})</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleUnlock}
              disabled={saving}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-97 ${
                isUnlocked
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
              }`}
            >
              {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isUnlocked ? "Ficha Liberada" : "Liberar Ficha no Portal"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAllDocuments}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700 transition-colors"
              title="Baixar todos os documentos anexados"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Baixar Dossiê Completo</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateWhatsAppPendencias}
              className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-97"
              title="Cobrar pendências e documentos rejeitados via WhatsApp"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span>Cobrar Pendências WhatsApp</span>
            </button>
          </div>
        </div>

        {/* 4-Step Rating Pipeline 100% Automatic Display */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Esteira de Rating (Fluxo 100% Automático):
            </span>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              Avança automaticamente conforme envio de documentos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { 
                id: "aguardando_documentos", 
                num: 1, 
                title: "1. Aguardando Documentos", 
                desc: uploadedDocs.length === 0 ? "Aguardando envio no Portal" : `${uploadedDocs.length} anexado(s)` 
              },
              { 
                id: "documentos_recebidos", 
                num: 2, 
                title: "2. Documentos Recebidos", 
                desc: `${uploadedDocs.length} de ${allDocs.length} arquivos recebidos` 
              },
              { 
                id: "em_aplicacao", 
                num: 3, 
                title: "3. Aplicação do Serviço", 
                desc: "Adequação de perfil & SCR" 
              },
              { 
                id: "concluido", 
                num: 4, 
                title: "4. Rating Concluído", 
                desc: "Parecer & nota emitidos" 
              }
            ].map((step, idx) => {
              const phases = ["aguardando_documentos", "documentos_recebidos", "em_aplicacao", "concluido"];
              const currentIdx = phases.indexOf(currentFase);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isCurrent
                      ? "bg-emerald-600/90 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30 font-bold"
                      : isPast
                      ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/60"
                      : "bg-slate-800/40 text-slate-400 border-slate-700/40 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black font-mono ${
                        isCurrent 
                          ? "bg-white text-emerald-900" 
                          : isPast 
                          ? "bg-emerald-500 text-slate-950" 
                          : "bg-slate-700 text-slate-400"
                      }`}>
                        {isPast ? "✓" : step.num}
                      </span>
                      <span className="text-xs font-black truncate">{step.title}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-[8px] uppercase tracking-wider font-mono font-black bg-white/20 text-white px-1.5 py-0.5 rounded-sm">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] opacity-80 line-clamp-1">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {downloadBatchProgress && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-2xl flex items-center gap-2 animate-pulse">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{downloadBatchProgress}</span>
        </div>
      )}

      {saveFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 text-xs font-bold rounded-2xl flex items-center gap-2 ${
            saveFeedback.toLowerCase().includes("erro")
              ? "bg-rose-50 border border-rose-200 text-rose-900"
              : "bg-emerald-50 border border-emerald-200 text-emerald-900"
          }`}
        >
          {saveFeedback.toLowerCase().includes("erro") ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{saveFeedback}</span>
        </motion.div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("cpf")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "cpf"
              ? "bg-[#0A3D2E] text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <User className="w-4 h-4" />
          <span>1. Documentos Sócios (CPF)</span>
          <span className="text-[10px] bg-slate-900/20 px-1.5 py-0.2 rounded-full">
            {ratingData?.sociosCPF?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cnpj")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "cnpj"
              ? "bg-[#0A3D2E] text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Documentos Empresa (CNPJ & PDFs)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pos_servico")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === "pos_servico"
              ? "bg-amber-600 text-white shadow-md"
              : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>3. Parecer Técnico & Nota Pós-Serviço</span>
          {(currentFase === "em_aplicacao" || currentFase === "concluido") && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          )}
        </button>
      </div>

      {/* TAB 1: CPF SÓCIOS */}
      {activeTab === "cpf" && (
        <div className="space-y-5">
          {(!ratingData?.sociosCPF || ratingData.sociosCPF.length === 0) ? (
            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
              <User className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Nenhum dado de sócio preenchido ainda pelo cliente.</p>
              <p className="text-xs text-slate-400 mt-1">Assim que o cliente salvar ou enviar a ficha pelo portal, os dados aparecerão aqui em tempo real.</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Partner selector tabs */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                {ratingData.sociosCPF.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => setSelectedSocioIdx(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSocioIdx === idx
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Sócio {idx + 1}: {s.nome || "Não informado"}
                  </button>
                ))}
              </div>

              {/* Selected partner card */}
              {ratingData.sociosCPF[selectedSocioIdx] && (() => {
                const s = ratingData.sociosCPF[selectedSocioIdx];
                return (
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
                    
                    {/* Basic partner info grid */}
                    <div>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono block mb-3">
                        Informações Cadastrais e Renda do Sócio
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Nome Completo</span>
                          <span className="text-xs font-bold text-slate-800">{s.nome || "Não informado"}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">CPF</span>
                          <span className="text-xs font-bold font-mono text-slate-800">{s.cpf || "Não informado"}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Estado Civil</span>
                          <span className="text-xs font-bold text-slate-800">{s.estadoCivil || "Não informado"}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Grau de Escolaridade</span>
                          <span className="text-xs font-bold text-slate-800">{s.escolaridade || "Não informado"}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Renda Familiar</span>
                          <span className="text-xs font-black font-mono text-emerald-800">{s.rendaFamiliar || "Não informado"}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Renda Bruta Individual</span>
                          <span className="text-xs font-black font-mono text-emerald-800">{s.rendaBrutaIndividual || "Não informado"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Referências Pessoais */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono block mb-3">
                        Referências Pessoais
                      </span>
                      {(!s.referenciasPessoais || s.referenciasPessoais.length === 0) ? (
                        <p className="text-xs text-slate-400 italic">Nenhuma referência informada.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {s.referenciasPessoais.map((ref, rIdx) => (
                            <div key={rIdx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Referência {rIdx + 1}</span>
                              <div className="text-xs font-bold text-slate-800">{ref.nome || "Nome não informado"}</div>
                              <div className="text-xs font-medium text-slate-600">{ref.telefone || "Telefone não informado"}</div>
                              <div className="text-[11px] text-slate-500 italic">{ref.parentesco || "Grau de parentesco não informado"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Anexos de documentos do sócio com checklist de validação */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
                          Validação de Documentos do Sócio
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Use os botões de aprovar/rejeitar para cada anexo
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {renderDocCard(
                          `cnh_frente_${selectedSocioIdx}`,
                          "CNH/RG (Frente)",
                          s.fotoCnhRgFrente,
                          s.fotoCnhRgFrenteNome
                        )}
                        {renderDocCard(
                          `cnh_verso_${selectedSocioIdx}`,
                          "CNH/RG (Verso)",
                          s.fotoCnhRgVerso,
                          s.fotoCnhRgVersoNome
                        )}
                        {renderDocCard(
                          `selfie_${selectedSocioIdx}`,
                          "Selfie com Documento",
                          s.selfieComDocumento,
                          s.selfieComDocumentoNome
                        )}
                        {renderDocCard(
                          `titulo_${selectedSocioIdx}`,
                          "Título de Eleitor",
                          s.fotoTituloEleitor,
                          s.fotoTituloEleitorNome
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>
          )}
        </div>
      )}

      {/* TAB 2: CNPJ EMPRESA & PDFS OBRIGATÓRIOS */}
      {activeTab === "cnpj" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
          
          {/* General Partner Photos */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
                Documentos com Foto dos Sócios da Empresa
              </span>
              <span className="text-[10px] text-slate-400">Conferência dos documentos de identidade</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {renderDocCard(
                "cnpj_foto_frente",
                "Foto Frente (Todos os Sócios)",
                ratingData?.dadosCNPJ?.documentoFotoFrenteTodosSocios,
                ratingData?.dadosCNPJ?.documentoFotoFrenteTodosSociosNome
              )}
              {renderDocCard(
                "cnpj_foto_verso",
                "Foto Verso (Todos os Sócios)",
                ratingData?.dadosCNPJ?.documentoFotoVersoTodosSocios,
                ratingData?.dadosCNPJ?.documentoFotoVersoTodosSociosNome
              )}
              {renderDocCard(
                "cnpj_selfie",
                "Selfie de Todos os Sócios",
                ratingData?.dadosCNPJ?.selfieTodosSocios,
                ratingData?.dadosCNPJ?.selfieTodosSociosNome
              )}
            </div>
          </div>

          {/* Obligatory Financial / Fiscal PDFs */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
                Documentos Fiscais e Contábeis (Obrigatoriamente em PDF)
              </span>
              <span className="text-[10px] text-slate-400">Base para elaboração do parecer financeiro</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderDocCard(
                "cnpj_cartao_cnpj",
                "Cartão CNPJ Atualizado (PDF)",
                ratingData?.dadosCNPJ?.cartaoCnpjPdf,
                ratingData?.dadosCNPJ?.cartaoCnpjPdfNome,
                true
              )}
              {renderDocCard(
                "cnpj_contrato_social",
                "Contrato Social / Consolidação (PDF)",
                ratingData?.dadosCNPJ?.contratoSocialPdf,
                ratingData?.dadosCNPJ?.contratoSocialPdfNome,
                true
              )}
              {renderDocCard(
                "cnpj_comprovante_residencia",
                "Comprovante de Endereço (PDF)",
                ratingData?.dadosCNPJ?.comprovanteResidenciaPdf,
                ratingData?.dadosCNPJ?.comprovanteResidenciaPdfNome,
                true
              )}
              {renderDocCard(
                "cnpj_faturamento_12m",
                "Faturamento 12 Meses (PDF)",
                ratingData?.dadosCNPJ?.faturamento12MesesPdf,
                ratingData?.dadosCNPJ?.faturamento12MesesPdfNome,
                true
              )}
              {renderDocCard(
                "cnpj_dre",
                "DRE - Demonstração de Resultado (PDF)",
                ratingData?.dadosCNPJ?.drePdf,
                ratingData?.dadosCNPJ?.drePdfNome,
                true
              )}
              {renderDocCard(
                "cnpj_balanco_patrimonial",
                "Balanço Patrimonial (PDF)",
                ratingData?.dadosCNPJ?.balancoPatrimonialPdf,
                ratingData?.dadosCNPJ?.balancoPatrimonialPdfNome,
                true
              )}
              {renderDocCard(
                "cnpj_ccb_pdf",
                "Cédula de Crédito Bancário (CCB)",
                ratingData?.dadosCNPJ?.ccbContratoPdf,
                ratingData?.dadosCNPJ?.ccbContratoPdfNome,
                true
              )}
            </div>
          </div>

          {/* RTB Laudo Card (Recuperação de Tarifa Bancária) */}
          {lead.analiseRTB && (
            <div className="p-4 bg-linear-to-r from-emerald-950/20 via-teal-950/10 to-slate-900/40 rounded-2xl border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-black text-white">
                      Auditoria Pericial RTB (Recuperação de Tarifas Bancárias)
                    </h4>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      Protocolo: {lead.analiseRTB.protocoloLaudo}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  PROSFEC IA
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Potencial de Restituição</span>
                  <span className="text-sm font-black text-emerald-400">
                    {formatCurrencyBRL(lead.analiseRTB.potencialRecuperacaoTotal)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Repetição em Dobro (CDC)</span>
                  <span className="text-sm font-black text-amber-400">
                    {formatCurrencyBRL(lead.analiseRTB.potencialRepeticaoIndebito || lead.analiseRTB.potencialRecuperacaoTotal * 2)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Irregularidades</span>
                    <span className="text-xs font-black text-rose-400">
                      {lead.analiseRTB.irregularidadesEncontradas?.length || 0} Apontadas
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRTBModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver Laudo
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 3: MÓDULO DE CONCLUSÃO & PARECER TÉCNICO PÓS-SERVIÇO */}
      {activeTab === "pos_servico" && (
        <div className="space-y-6">
          
          {/* Phase Guard Banner if no docs uploaded yet */}
          {uploadedDocs.length === 0 && !ratingData?.dataEnvio ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                <span>Aguardando Documentação do Cliente</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                O cliente ainda não anexou os documentos no portal de acompanhamento. Assim que o cliente fizer o envio dos arquivos, a esteira avançará <strong>automaticamente</strong> para a fase de conferência e liberação do Parecer Técnico Oficial.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider font-mono block">
                    Parecer Técnico & Nota de Rating Pós-Aplicação de Serviços
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Preencha o veredito final da consultoria após a implementação das melhorias cadastrais e contábeis.
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                  Fase: {currentFase === "concluido" ? "Rating Concluído" : "Em Aplicação / Análise"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Nota de Rating Final */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Nota de Rating Atribuída
                  </label>
                  <select
                    value={notaRating}
                    onChange={(e) => setNotaRating(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-black text-[#0A3D2E] outline-none"
                  >
                    {NOTAS_RATING_PRESETS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Classificação de Risco */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Classificação de Risco
                  </label>
                  <select
                    value={classificacaoRisco}
                    onChange={(e) => setClassificacaoRisco(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="Risco Mínimo (AAA/AA)">Risco Mínimo (AAA/AA)</option>
                    <option value="Risco Baixo (A1/A2)">Risco Baixo (A1/A2)</option>
                    <option value="Risco Moderado (B1/B2)">Risco Moderado (B1/B2)</option>
                    <option value="Capacidade Expandida">Capacidade Expandida</option>
                  </select>
                </div>

                {/* Capacidade de Tomada Sugerida */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Capacidade de Tomada Sugerida (R$)
                  </label>
                  <input
                    type="text"
                    value={capacidadeTomada}
                    onChange={(e) => setCapacidadeTomada(e.target.value)}
                    placeholder="Ex: R$ 350.000,00"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-black font-mono text-emerald-800 outline-none"
                  />
                </div>

              </div>

              {/* Checklist de Melhorias Aplicadas */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Melhorias e Intervenções Aplicadas no Perfil da Empresa
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {MELHORIAS_DISPONIVEIS.map((melhoria) => {
                    const isChecked = melhoriasSelecionadas.includes(melhoria);
                    return (
                      <button
                        key={melhoria}
                        type="button"
                        onClick={() => handleToggleMelhoria(melhoria)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          isChecked
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                          isChecked ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white"
                        }`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{melhoria}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parecer Técnico Escrito */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Síntese e Parecer Técnico Oficial do Analista
                </label>
                <textarea
                  rows={4}
                  value={parecerTecnico}
                  onChange={(e) => setParecerTecnico(e.target.value)}
                  placeholder="Descreva detalhadamente o parecer de crédito, a avaliação contábil e a recomendação de linhas bancárias..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl p-3 text-xs font-medium text-slate-800 outline-none leading-relaxed"
                />
              </div>

              {/* Operador & Finalização */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Analista Técnico Responsável
                  </label>
                  <input
                    type="text"
                    value={analistaResponsavel}
                    onChange={(e) => setAnalistaResponsavel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div className="flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAdmReview}
                    disabled={saving}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Salvar Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={handleConcluirRating}
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Concluir Rating & Emitir Parecer</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ADM Assessment & Quick Status Box */}
      <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono block">
          Status Administrativo Geral do Lead
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Status do Dossiê de Rating
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="pendente">Pendente de Envio pelo Cliente</option>
              <option value="em_analise">Em Análise Técnica / Estruturação</option>
              <option value="ajuste_solicitado">Ajuste Solicitado (Documento rejeitado)</option>
              <option value="aprovado">Aprovado / Dossiê Concluído</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Observações e Orientações Técnicas (Interno / Feedback ao Cliente)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Documentos recebidos. Validando DRE e Balanço com a contabilidade..."
              className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => handleSaveAdmReview()}
            disabled={saving}
            className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Informações do Rating</span>
          </button>
        </div>
      </div>

      {/* Modal Preview File */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-5 max-w-3xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
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

              <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-50 rounded-2xl border border-slate-100 min-h-[350px]">
                {previewFile.isPdf || previewFile.url.startsWith("data:application/pdf") ? (
                  <iframe
                    src={previewFile.url}
                    title={previewFile.name}
                    className="w-full h-[500px] rounded-xl border-0"
                  />
                ) : (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-h-[500px] w-auto object-contain rounded-xl shadow-xs"
                  />
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="px-4 py-2 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Laudo Pericial RTB */}
      <AnimatePresence>
        {showRTBModal && lead.analiseRTB && (
          <RTBAuditoriaViewerModal
            analiseRTB={lead.analiseRTB}
            razaoSocial={lead.razaoSocial || lead.nome}
            cnpj={lead.cnpj}
            ccbPdfUrl={ratingData?.dadosCNPJ?.ccbContratoPdf}
            onClose={() => setShowRTBModal(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
