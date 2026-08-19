/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LeadData {
  cnpj: string;
  razaoSocial: string;
  porte: "MEI" | "ME" | "EPP" | "EMP" | "EGP" | "";
  dataAbertura: string;
  uf: string;
  ramo: string;
  menosDe12Meses: boolean;
  capitalSocial?: number;
  mediaReceitaMensal?: number;
  seloEmpregaMulher?: boolean;
  faturamentoAnual: number; // in BRL
  
  // Step 2: Contato
  nomeCompleto: string;
  email: string;
  whatsapp: string;
  cargo: string;

  // Step 3: Fiscal
  situacaoCadastral: "Ativa" | "Inativa" | "Pendente" | "";
  possuiDeclaracaoFaturamento: boolean; // Simples Nacional ou ECF
  autorizaCompartilhamentoEcac: boolean;

  // Step 4: Financeiro
  possuiRestricaoSerasa: boolean;
  possuiDividasTributarias: boolean;
  bancoPrincipal: string;
  possuiLinhaCreditoGovernamentalAtiva?: boolean;
  linhaCreditoGovernamentalQual?: string;
  possuiPatrimonioVinculado?: "sim" | "nao" | "em_construcao" | "nao_informado" | "";

  // Step 5: Objetivo
  objetivoRecurso: "capital_giro" | "investimento" | "reorganizar_dividas" | "outros" | "";
  tempoParaCaptacao: "urgente" | "medio_prazo" | "planejamento" | "";
}

export interface SimulationResult {
  limiteEstimado: number;
  nivelPreparacao: "alto" | "medio" | "baixo";
  scoreElegibilidade?: number; // Score de 0 a 100
  scoreFatores?: {
    positivos: string[];
    atencao: string[];
  };
  principaisAlertas: string[];
  recomendações: string[];
  creditLineCode?: string;
  creditLineName?: string;
  rate?: number;
  carencia?: number;
  prazo?: number;
  parcela?: number;
  justificativa?: string;
  justificativaTecnica?: string;
  documentosNecessarios?: string[];
  resumoPerfil?: string;
  fonte?: string;
  bancoDetalhes?: {
    bancoNormalizado: string;
    categoria: "estatal" | "privado" | "cooperativa" | "fintech" | "outros";
    carenciaPadrao: number;
    carenciaMaxima: number;
    prazoTotalPadrao: number;
    prazoTotalMaximo: number;
    taxaAnualEstimada: number;
    destaqueEsteira: string;
    modalidadeAprovacao: string;
  };
  capacidadeTotal?: number;
  excedenteCapacidade?: number;
  economiaMensal?: number;
  economiaTotal?: number;
  taxaMercadoAnual?: number;
  parcelaMercado?: number;
}

export interface Pendencia {
  id: string;
  mensagem: string;
  status: "aberta" | "resolvida" | "pendente";
  dataCriacao: string;
  dataResposta?: string | null;
  resposta?: string;
  autor?: "admin" | "parceiro";
  nomeAutor?: string;
}

export interface PendenciaItem {
  id: string;
  autor: "admin" | "parceiro";
  nomeAutor?: string;
  mensagem: string;
  data: string;
  tipo?: "pendencia" | "resposta" | "resolucao";
}

export interface Lead {
  id: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  cnpj?: string;
  razaoSocial?: string;
  etapa?: number;
  status?: string;
  limiteEstimado?: number;
  limiteEstimated?: number;
  valorAprovado?: number;
  comissaoPaga?: boolean;
  pendente?: boolean;
  pendenciaDescricao?: string;
  pendencias?: Pendencia[] | {
    status?: string;
    mensagem?: string;
    resposta?: string;
    historico?: PendenciaItem[];
  };
  socios?: Array<Record<string, any>>;
  documentos?: Array<Record<string, any>>;
  dadosFiscais?: Record<string, any>;
  servicosRecomendados?: any[];
  subEtapasPasso6?: any[];
  diagnosticoPROSFEC?: any;
  diagnosticoGeracoesCount?: number;
  diagnosticoPosEstruturacao?: DiagnosticoPosEstruturacao;
  clienteSenha?: string;
  clientePrimeiroAcessoConcluido?: boolean;
  clienteUltimoAcesso?: string;
  solicitacaoResetSenha?: {
    pendente: boolean;
    dataSolicitacao: string;
    solicitanteIp?: string;
    novaSenhaGerada?: string;
    dataAtendimento?: string;
    atendidoPor?: string;
  };
  fichaRatingCredito?: FichaRatingCredito;
  pagamentoConfirmado?: boolean;
  pagamentoServicosConfirmado?: boolean;
  liberarFichaRating?: boolean;
  comissaoMultinivel?: {
    taxaConsultor: number;
    taxaMaster: number;
    taxaTotal: number;
    valorTotalServicos: number;
    valorTotalComissao: number;
    valorConsultorTotal: number;
    valorMasterTotal: number;
    valorServicosPagos: number;
    valorComissaoPaga: number;
    valorPagoConsultor: number;
    valorPagoMaster: number;
    valorServicosPendentes: number;
    valorComissaoPendente: number;
    valorPendenteConsultor: number;
    valorPendenteMaster: number;
    valorComissaoLiberadaSaque: number;
    valorLiberadoConsultor: number;
    valorLiberadoMaster: number;
    valorAguardandoCompensacao: number;
    consultorId?: string;
    consultorNome?: string;
    consultorPlano?: string;
    consultorPlanoNormalizado: string;
    masterId?: string | null;
    masterNome?: string | null;
    masterPlano?: string | null;
    masterPlanoNormalizado?: string | null;
    hasHierarchy: boolean;
    descricaoDivisao: string;
    dataCalculo: string;
  };
  parentPartnerId?: string;
  parentPartnerNome?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Partner {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string;
  interesse: string;
  status: string;
  dataCriacao: string;
  cpf?: string;
  cnpj?: string;
  dataNascimento?: string;
  chavePix?: string;
  plano?: string;
  aceitouTermos?: boolean;
  dataUltimoPagamento?: string;
  duracaoDias?: number;
  parentPartnerId?: string;
  parentPartnerNome?: string;
  isTeamMember?: boolean;
  dataUltimoAcesso?: string;
  inativoPorInatividade?: boolean;
  motivoInativacao?: string;
  dataReativacao?: string;
  hotmartLink?: string;
  hotmartCode?: string;
  hublaCodeStarter?: string;
  hublaCodeExecutive?: string;
  hublaCodeMaster?: string;
  [key: string]: any;
}

export interface ReferenciaPessoal {
  nome: string;
  telefone: string;
  parentesco: string;
}

export interface SocioRatingCPF {
  id: string;
  nome: string;
  cpf: string;
  estadoCivil: "Solteiro(a)" | "Casado(a)" | "União Estável" | "Divorciado(a)" | "Viúvo(a)" | "";
  escolaridade: "Ensino Fundamental" | "Ensino Médio" | "Superior Incompleto" | "Superior Completo" | "Pós-Graduação / Especialização" | "Mestrado / Doutorado" | "";
  rendaFamiliar: string;
  rendaBrutaIndividual: string;
  referenciasPessoais: ReferenciaPessoal[];
  // Document attachments
  fotoCnhRgFrente?: string;
  fotoCnhRgFrenteNome?: string;
  fotoCnhRgVerso?: string;
  fotoCnhRgVersoNome?: string;
  selfieComDocumento?: string;
  selfieComDocumentoNome?: string;
  fotoTituloEleitor?: string;
  fotoTituloEleitorNome?: string;
}

export interface DadosRatingCNPJ {
  // Documentos com foto e selfies de todos os sócios
  documentoFotoFrenteTodosSocios?: string;
  documentoFotoFrenteTodosSociosNome?: string;
  documentoFotoVersoTodosSocios?: string;
  documentoFotoVersoTodosSociosNome?: string;
  selfieTodosSocios?: string;
  selfieTodosSociosNome?: string;

  // Anexos OBRIGATORIAMENTE em PDF
  cartaoCnpjPdf?: string;
  cartaoCnpjPdfNome?: string;
  contratoSocialPdf?: string;
  contratoSocialPdfNome?: string;
  comprovanteResidenciaPdf?: string;
  comprovanteResidenciaPdfNome?: string;
  faturamento12MesesPdf?: string;
  faturamento12MesesPdfNome?: string;
  drePdf?: string;
  drePdfNome?: string;
  balancoPatrimonialPdf?: string;
  balancoPatrimonialPdfNome?: string;
}

export interface ValidacaoItemDoc {
  status: "aprovado" | "rejeitado" | "pendente";
  motivo?: string;
  dataValidacao?: string;
}

export interface ConclusaoRatingPosServico {
  notaFinalRating?: string;
  classificacaoRisco?: "Risco Mínimo (AAA/AA)" | "Risco Baixo (A1/A2)" | "Risco Moderado (B1/B2)" | "Capacidade Expandida";
  capacidadeTomadaSugerida?: string;
  melhoriasAplicadas?: string[];
  parecerFinalTecnico?: string;
  dataConclusao?: string;
  analistaResponsavel?: string;
}

export interface FichaRatingCredito {
  sociosCPF: SocioRatingCPF[];
  dadosCNPJ: DadosRatingCNPJ;
  status: "pendente" | "em_analise" | "aprovado" | "ajuste_solicitado";
  faseRating?: "aguardando_documentos" | "documentos_recebidos" | "em_aplicacao" | "concluido";
  dataEnvio?: string;
  dataAtualizacao?: string;
  observacoesAdm?: string;
  progressoPercentual?: number;
  validacoesDocumentos?: Record<string, ValidacaoItemDoc>;
  conclusaoRating?: ConclusaoRatingPosServico;
}
export interface SolicitacaoComissao {
  id: string;
  partnerId: string;
  partnerNome: string;
  partnerEmail: string;
  partnerWhatsapp?: string;
  partnerPlano?: string;
  chavePix: string;
  valor: number;
  dataSolicitacao: string;
  status: "pendente" | "pago" | "recusado";
  dataPagamento?: string;
  comprovante?: string;
  comprovantePixUrl?: string;
  motivoRecusa?: string;
  observacoes?: string;
  detalhes?: {
    saldoDisponivelMomento?: number;
    comissaoLiberada?: number;
    comissaoTotalLiberada?: number;
    comissaoTotalPaga?: number;
    comissaoAguardandoCompensacao?: number;
    comissaoServicos?: number;
    comissaoCredito?: number;
    comissaoEquipe?: number;
    leadsEnvolvidos?: string[];
  };
}

export interface DiagnosticoPosEstruturacao {
  dataEmissao: string;
  protocolo?: string;
  metrics?: {
    scoreAnterior?: number;
    scoreAtual?: number;
    evolucaoScore?: number;
    restricoesAnteriores?: number;
    restricoesAtuais?: number;
    statusSaneamento?: string;
    limiteAnterior?: number;
    limiteAtual?: number;
    ratingBancario?: string;
    nivelRisco?: string;
    statusAptidao?: string;
    esteirasAptas?: string[];
    protocoloHomologacao?: string;
    [key: string]: any;
  };
  parecerTecnico?: string;
  esteirasAptas?: string[];
  [key: string]: any;
}


