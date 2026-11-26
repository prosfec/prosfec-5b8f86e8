import { doc, runTransaction, arrayUnion, type Transaction } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import { prepararPropostaSolar, economiaPropostaSolar, type CamposPropostaSolar } from "./dadosSimulacaoProsfec";
import { pendenciasFichaSolar, pendenciasSolicitacaoSolar, validarOfertasEnergia, validarPdfSimulacao, type OfertaEnergia, type LeadSolar } from "./validacaoFichaSolar";

async function verificarSessao(adm: boolean) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Entre novamente para continuar.");
  const token = await user.getIdTokenResult();
  const staff = user.uid === "Nso5FBoBVHXNY60RDw6NNKeaCC23" || user.email?.toLowerCase() === "prosfec.tesouraria@gmail.com" || token.claims['admin'] === true;
  if (adm && !staff) throw new Error("Somente a Mesa pode enviar simulações.");
  return { uid: user.uid, email: user.email?.toLowerCase() || "", staff };
}

async function verificarDono(tx: Transaction, lead: LeadSolar, sessao: Awaited<ReturnType<typeof verificarSessao>>) {
  if (sessao.staff) return;
  const parceiroId = lead['parceiroId'];
  if (typeof parceiroId !== "string" || !parceiroId) throw new Error("Lead sem assessor responsável.");
  if (parceiroId === sessao.uid) return;
  const snap = await tx.get(doc(db, "parceiros", parceiroId));
  const parceiro = snap.exists() ? snap.data() : {};
  if (parceiro['authUid'] !== sessao.uid && (!sessao.email || parceiro['email']?.toLowerCase() !== sessao.email)) throw new Error("Você não tem acesso a este lead.");
}

export interface OfertaDraft { id: string; tipo: "gd" | "alugsol"; empresa: string; desconto: string; economia: string; locacao: string; regras: string; arquivo: File | null; proposta?: CamposPropostaSolar }
export async function publicarSimulacoes(leadId: string, pacoteId: string, drafts: OfertaDraft[]) {
  await verificarSessao(true);
  const anterior = await runTransaction(db, async tx => {
    const snap = await tx.get(doc(db, "leads_energia", leadId));
    if (!snap.exists()) throw new Error("Lead não encontrado.");
    const lead = snap.data();
    if (Object.values(lead['ofertasEnergia'] || {}).some((o: any) => o?.pacoteId === pacoteId)) return lead;
    if (["concluido", "arquivado", "cancelado"].includes(lead['status'])) throw new Error("Este lead não está aberto para simulações.");
    if (lead['propostaEnergiaEscolhida']) throw new Error("Este lead já tem uma proposta selecionada.");
    return null;
  });
  if (anterior) return anterior;
  if (!drafts.length) throw new Error("Adicione pelo menos uma oferta.");
  for (const d of drafts) {
    if (!d.empresa.trim() || !d.regras.trim()) throw new Error("Preencha empresa e regras de todas as ofertas.");
    if (d.empresa.length > 200 || d.regras.length > 10000 || !["gd", "alugsol"].includes(d.tipo)) throw new Error("Revise empresa, tipo e regras das ofertas.");
    if (d.arquivo) {
      const erro = validarPdfSimulacao(d.arquivo);
      if (erro) throw new Error(erro);
    } else if (!d.proposta) throw new Error("Preencha os dados da proposta automática.");
  }
  const agora = new Date().toISOString();
  // Validate every automatic proposal before generating files or performing any upload.
  const snapshots = drafts.map(d => !d.arquivo && d.proposta ? prepararPropostaSolar(d.proposta, d, agora) : null);
  const ofertas: OfertaEnergia[] = [];
  const uploads: ReturnType<typeof ref>[] = [];
  let iniciouGravacao = false;
  try {
    for (const [index, d] of drafts.entries()) {
      const snapshot = snapshots[index];
      let arquivo = d.arquivo;
      if (!arquivo && snapshot) {
        const { gerarPropostaProsfecPdf } = await import("./propostaProsfecPdf");
        const bytes = await gerarPropostaProsfecPdf({ ...snapshot, emissao: new Date(snapshot.emissao) });
        arquivo = new File([bytes as BlobPart], `Proposta_PROSFEC_${snapshot.cliente.replace(/[^\p{L}\d]+/gu, "_").slice(0, 60)}_${d.id}.pdf`, { type: "application/pdf" });
      }
      if (!arquivo) throw new Error("Não foi possível preparar o PDF da proposta.");
      const r = ref(storage, `documentos_energia/${leadId}/simulacao_${pacoteId}_${d.id}_${crypto.randomUUID()}.pdf`);
      await uploadBytes(r, arquivo, { contentType: "application/pdf" });
      uploads.push(r);
      ofertas.push({ id: d.id, pacoteId, tipo: d.tipo, empresa: d.empresa.trim(), desconto: d.desconto.trim(), economia: snapshot ? economiaPropostaSolar(snapshot) : d.economia.trim(), locacao: d.locacao.trim(), regras: d.regras.trim(), pdfUrl: await getDownloadURL(r), pdfNome: arquivo.name, criadaEm: agora, ...(snapshot ? { propostaProsfec: snapshot } : {}) });
    }
    const erro = validarOfertasEnergia(ofertas);
    if (erro) throw new Error(erro);
    iniciouGravacao = true;
    return await runTransaction(db, async tx => {
      const r = doc(db, "leads_energia", leadId);
      const snap = await tx.get(r);
      if (!snap.exists()) throw new Error("Lead não encontrado.");
      const lead = snap.data();
      if (["concluido", "arquivado", "cancelado"].includes(lead['status'])) throw new Error("Este lead não está aberto para simulações.");
      if (lead['propostaEnergiaEscolhida']) throw new Error("Este lead já tem uma proposta selecionada.");
      const atuais = lead['ofertasEnergia'] || {};
      if (Object.values(atuais).some((o: any) => o?.pacoteId === pacoteId)) return lead;
      const ofertasEnergia = { ...atuais, ...Object.fromEntries(ofertas.map(o => [o.id, o])) };
      // Limite físico do documento do Firestore, não um limite comercial de ofertas.
      if (new TextEncoder().encode(JSON.stringify({ ...lead, ofertasEnergia })).length > 700000) throw new Error("O histórico deste lead está muito grande para outro pacote.");
      const nota = { id: pacoteId, tipo: "simulacao", ofertaIds: ofertas.map(o => o.id), texto: "Pacote de simulações enviado pela Mesa", autor: "Mesa PROSFEC", papel: "adm", data: agora };
      const updates = { ofertasEnergia, cotacaoEnergiaStatus: "respondida", atualizadoEm: agora, ultimaMovimentacaoMesaEm: agora, ultimaMovimentacaoMesaTexto: nota.texto };
      tx.update(r, { ...updates, anotacoes: arrayUnion(nota) });
      return { ...lead, ...updates, anotacoes: [...(Array.isArray(lead['anotacoes']) ? lead['anotacoes'] : []), nota] };
    });
  } catch (error) {
    // Após iniciar a gravação não apagar arquivos: uma resposta perdida pode ter sido confirmada no servidor.
    if (!iniciouGravacao) await Promise.allSettled(uploads.map(r => deleteObject(r)));
    throw error;
  }
}

export async function solicitarCotacaoEnergia(leadId: string, autor: string) {
  const sessao = await verificarSessao(false);
  return runTransaction(db, async tx => {
    const r = doc(db, "leads_energia", leadId);
    const snap = await tx.get(r);
    if (!snap.exists()) throw new Error("Lead não encontrado.");
    const lead = snap.data();
    await verificarDono(tx, lead, sessao);
    const pendencias = pendenciasSolicitacaoSolar(lead);
    if (pendencias.length) throw new Error(`Pendente: ${pendencias.join(", ")}.`);
    if (["concluido", "arquivado", "cancelado"].includes(lead['status'])) throw new Error("Este lead não está aberto para cotação.");
    if (lead['cotacaoEnergiaStatus'] === "solicitada") return lead;
    const agora = new Date().toISOString();
    const nota = { texto: "Simulação solicitada à Mesa. Dados básicos e conta de luz disponíveis na ficha.", autor, papel: "parceiro", data: agora };
    const updates = { cotacaoEnergiaStatus: "solicitada", atualizadoEm: agora, ultimaMovimentacaoParceiroEm: agora };
    tx.update(r, { ...updates, anotacoes: arrayUnion(nota) });
    return { ...lead, ...updates, anotacoes: [...(Array.isArray(lead['anotacoes']) ? lead['anotacoes'] : []), nota] };
  });
}

export async function escolherPropostaEnergia(leadId: string, ofertaId: string, autor: string) {
  const sessao = await verificarSessao(false);
  return runTransaction(db, async tx => {
    const r = doc(db, "leads_energia", leadId);
    const snap = await tx.get(r);
    if (!snap.exists()) throw new Error("Lead não encontrado.");
    const lead = snap.data();
    await verificarDono(tx, lead, sessao);
    if (lead['propostaEnergiaEscolhida']?.ofertaId === ofertaId) return lead;
    if (lead['propostaEnergiaEscolhida']) throw new Error("Outra proposta já foi selecionada. Confirme com a Mesa.");
    if (["concluido", "arquivado", "cancelado"].includes(lead['status'])) throw new Error("Este lead não está aberto para seleção.");
    const pendencias = pendenciasFichaSolar(lead);
    if (pendencias.length) throw new Error(`Pendente: ${pendencias.join(", ")}.`);
    const oferta: OfertaEnergia | undefined = lead['ofertasEnergia']?.[ofertaId];
    if (!oferta || validarOfertasEnergia([oferta])) throw new Error("Proposta não encontrada ou inválida.");
    const agora = new Date().toISOString();
    const propostaEnergiaEscolhida = { ofertaId, empresa: oferta.empresa, tipo: oferta.tipo, selecionadaEm: agora, selecionadaPor: auth.currentUser?.uid || "" };
    const nota = { texto: `Proposta selecionada: ${oferta.empresa}. Ficha preenchida e documentos obrigatórios anexados; aguardando conferência da Mesa.`, autor, papel: "parceiro", data: agora };
    const updates = { propostaEnergiaEscolhida, atualizadoEm: agora, ultimaMovimentacaoParceiroEm: agora };
    tx.update(r, { ...updates, anotacoes: arrayUnion(nota) });
    return { ...lead, ...updates, anotacoes: [...(Array.isArray(lead['anotacoes']) ? lead['anotacoes'] : []), nota] };
  });
}