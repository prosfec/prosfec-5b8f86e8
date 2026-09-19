// @ts-nocheck
export interface ServiceCatalogItem {
  id: string;
  nome: string;
  valor: number;
  descricao?: string;
  /** Link de pagamento/checkout cadastrado pelo ADM */
  linkPagamento?: string;
  /** @deprecated campo legado de links de checkout antigos; lido apenas para compatibilidade */
  hublaLink?: string;
  semCustoInicial?: boolean;
  /** Texto jurídico das cláusulas específicas deste serviço (Contrato Avulso) */
  clausulas?: string;
  /** Identificador do template contratual, ex.: AVULSO_REABILITACAO */
  templateId?: string;
  /** Versão do conjunto de cláusulas; incrementa a cada alteração salva */
  templateVersao?: number;
}

/** Normaliza a descrição padronizada do serviço definida pelo ADM no catálogo */
export function normalizeServiceDescription(value: any): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 600);
}

/** Normaliza o texto das cláusulas contratuais específicas do serviço */
export function normalizeServiceClauses(value: any): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, 12000);
}

/** Gera um templateId estável a partir do nome do serviço */
export function buildServiceTemplateId(nome: any, id?: any): string {
  const base = String(nome || id || "SERVICO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .split("_")
    .filter(Boolean)
    .slice(0, 3)
    .join("_");
  return `AVULSO_${base || "SERVICO"}`;
}

/** Rótulo de versão exibido no Admin e congelado no contrato, ex.: AVULSO_RTB_V1 */
export function formatTemplateLabel(item: any): string {
  const tid = item?.templateId || buildServiceTemplateId(item?.nome, item?.id);
  const ver = Number(item?.templateVersao || 1);
  return `${tid}_V${ver > 0 ? ver : 1}`;
}

/** Bloco de cláusulas usado quando o serviço ainda não tem texto próprio no catálogo */
export const CLAUSULA_GENERICA_AVULSO = `Objeto específico: prestação do serviço ora contratado, conforme escopo técnico definido pela CONTRATADA e aceito pela CONTRATANTE.
Atividades incluídas: diagnóstico inicial, execução técnica do serviço, acompanhamento e entrega de relatório ou orientação final.
Condições específicas: a execução depende do envio, pela CONTRATANTE, de documentos e informações verídicos e completos.
Prazo: até 30 (trinta) dias úteis contados do recebimento integral da documentação.
Remuneração: valor indicado para este serviço no quadro de valores deste contrato.
Limitações: a CONTRATADA assume obrigação de meio, não de resultado, não respondendo por decisões de terceiros, instituições financeiras ou órgãos públicos.
Responsabilidades específicas: a CONTRATANTE responde pela veracidade das informações prestadas e pela adoção das providências recomendadas.`;

/** Lê o link de pagamento do item, aceitando o campo legado */
export function readPaymentLink(item: any): string {
  const v = item?.linkPagamento ?? item?.hublaLink;
  return typeof v === "string" && v.trim() ? v.trim() : "";
}


/** Cláusulas específicas V1 redigidas para os serviços padrão do catálogo */
export const DEFAULT_SERVICE_CLAUSES: Record<string, string> = {
  serv_rating_score: `Objeto específico: execução de programa técnico de melhoria e adequação de rating e score comercial e bancário da CONTRATANTE junto a bureaus de crédito e instituições financeiras.
Atividades incluídas: (i) leitura e interpretação dos indicadores cadastrais e financeiros; (ii) identificação dos fatores que rebaixam a pontuação; (iii) plano de ação de correção cadastral, fiscal e de relacionamento bancário; (iv) orientação sobre boas práticas de movimentação e endividamento; (v) reavaliação dos indicadores ao final do período.
Condições específicas: a CONTRATANTE deverá fornecer acesso às informações cadastrais solicitadas e implementar as providências indicadas no plano de ação.
Prazo: acompanhamento por até 90 (noventa) dias contados do início da execução.
Remuneração: valor indicado para este serviço no quadro de valores deste contrato, devido na contratação.
Limitações: a pontuação é atribuída por terceiros (bureaus e instituições financeiras) segundo critérios próprios e sigilosos. A CONTRATADA não garante índice, faixa ou pontuação específica, tampouco aprovação de crédito.
Responsabilidades específicas: a não implementação das recomendações pela CONTRATANTE exonera a CONTRATADA de qualquer responsabilidade quanto à evolução dos indicadores.`,

  serv_contabil: `Objeto específico: prestação de serviços contábeis destinados à regularização e adequação cadastral e fiscal do CNPJ da CONTRATANTE.
Atividades incluídas: (i) levantamento da situação cadastral e fiscal nos órgãos competentes; (ii) identificação de pendências, omissões e divergências declaratórias; (iii) elaboração e transmissão das obrigações acessórias necessárias à regularização; (iv) orientação sobre enquadramento e conformidade.
Condições específicas: depende do fornecimento integral de documentos contábeis, fiscais e societários pela CONTRATANTE, bem como de procuração eletrônica quando exigida.
Prazo: até 45 (quarenta e cinco) dias úteis contados do recebimento completo da documentação, ressalvados prazos próprios dos órgãos públicos.
Remuneração: valor indicado para este serviço no quadro de valores deste contrato. Tributos, multas, juros e taxas oficiais não estão incluídos e são de responsabilidade exclusiva da CONTRATANTE.
Limitações: não estão incluídos serviços de defesa administrativa ou judicial, perícias, nem escrituração contábil mensal continuada, que dependem de contratação própria.
Responsabilidades específicas: a CONTRATANTE responde pela veracidade e integralidade dos documentos entregues e pelo pagamento dos tributos apurados.`,

  serv_rtb: `Objeto específico: análise técnica de contratos bancários e de Cédulas de Crédito Bancário (CCB) da CONTRATANTE, com o fim de identificar tarifas, encargos e cobranças passíveis de revisão ou recuperação (RTB — Perícia CCB).
Atividades incluídas: (i) recebimento e conferência dos contratos e extratos; (ii) perícia técnica de cálculo sobre encargos, tarifas e capitalização; (iii) emissão de laudo técnico com o montante identificado; (iv) orientação sobre os caminhos administrativos de recuperação.
Condições específicas: a CONTRATANTE deverá fornecer os contratos, aditivos, extratos e planilhas de evolução da dívida.
Prazo: até 30 (trinta) dias úteis contados do recebimento integral dos documentos.
Remuneração: este serviço é prestado sem custo inicial. Havendo êxito na recuperação ou no abatimento dos valores, a CONTRATADA fará jus aos honorários de êxito ajustados no quadro de valores deste contrato.
Limitações: o serviço é de natureza técnica e pericial, não constituindo atuação advocatícia. Eventual medida judicial depende de contratação autônoma de advogado pela CONTRATANTE.
Responsabilidades específicas: a decisão sobre aceitar acordo, renegociar ou litigar é exclusiva da CONTRATANTE.`,

  serv_dossie_projeto: `Objeto específico: elaboração de dossiê bancário e de projeto estruturado de crédito da CONTRATANTE para apresentação a instituições financeiras e agentes de fomento.
Atividades incluídas: (i) coleta e organização documental; (ii) elaboração de memorial descritivo da empresa e do projeto; (iii) montagem das projeções e da capacidade de pagamento; (iv) formatação do dossiê no padrão exigido pelas instituições; (v) orientação no protocolo e acompanhamento administrativo do pleito.
Condições específicas: depende da entrega de balanços, faturamento, documentos societários e informações de garantias pela CONTRATANTE.
Prazo: até 30 (trinta) dias úteis contados do recebimento integral da documentação.
Remuneração: este serviço é prestado sem custo inicial, remunerado por honorários de êxito conforme quadro de valores deste contrato.
Limitações: a aprovação, o limite, a taxa, o prazo e as garantias são decisões soberanas e exclusivas da instituição financeira. A CONTRATADA assume obrigação de meio.
Responsabilidades específicas: a CONTRATANTE responde pela veracidade das informações e documentos que compõem o dossiê.`,

  serv_reabilitacao: `Objeto específico: execução do Programa de Reabilitação Financeira e Creditícia da CONTRATANTE, compreendendo diagnóstico, plano de regularização e acompanhamento do restabelecimento da capacidade de crédito.
Atividades incluídas: (i) diagnóstico cadastral e financeiro do CNPJ e dos sócios; (ii) mapeamento de negativações, protestos, pendências e restrições; (iii) plano de regularização com priorização por impacto; (iv) orientação e acompanhamento das tratativas de baixa e regularização; (v) reavaliação da situação ao final do programa.
Condições específicas: depende do fornecimento de documentos, do acesso às informações solicitadas e da adoção, pela CONTRATANTE, das providências indicadas.
Prazo: acompanhamento por até 120 (cento e vinte) dias contados do início da execução.
Remuneração: valor indicado para este serviço no quadro de valores deste contrato, devido na contratação.
Limitações: a baixa de apontamentos depende de credores e órgãos terceiros. A CONTRATADA não garante remoção de registros legítimos, prazo de baixa ou aprovação futura de crédito.
Responsabilidades específicas: o pagamento de dívidas, acordos, custas e emolumentos é de responsabilidade exclusiva da CONTRATANTE.`,
};


export const DEFAULT_SERVICES_CATALOG: ServiceCatalogItem[] = [
  {
    id: "serv_rating_score",
    nome: "Melhoria e Adequação de Rating e Score",
    valor: 1100,
    
    clausulas: DEFAULT_SERVICE_CLAUSES.serv_rating_score,
    templateId: "AVULSO_RATING_SCORE",
    templateVersao: 1
  },
  {
    id: "serv_contabil",
    nome: "Serviços Contábeis p/ Regularização/Adequação CNPJ",
    valor: 700,
    
    clausulas: DEFAULT_SERVICE_CLAUSES.serv_contabil,
    templateId: "AVULSO_CONTABIL",
    templateVersao: 1
  },
  {
    id: "serv_rtb",
    nome: "Recuperação de Tarifas Bancárias (RTB - Perícia CCB)",
    valor: 0,
    semCustoInicial: true,
    clausulas: DEFAULT_SERVICE_CLAUSES.serv_rtb,
    templateId: "AVULSO_RTB",
    templateVersao: 1
  },
  {
    id: "serv_dossie_projeto",
    nome: "Dossiê Bancário & Projeto Estruturado de Crédito",
    valor: 0,
    semCustoInicial: true,
    clausulas: DEFAULT_SERVICE_CLAUSES.serv_dossie_projeto,
    templateId: "AVULSO_DOSSIE_PROJETO",
    templateVersao: 1
  }
];

/**
 * Identifica se um serviço é de contabilidade ou contratado por demanda avulsa
 */
export function isDemandAccountingService(serv: any): boolean {
  if (!serv) return false;
  const id = (serv.id || "").toString().toLowerCase();
  const nome = (serv.nome || serv.titulo || serv.servico || "").toString().toLowerCase();
  const categoria = (serv.categoria || "").toString().toLowerCase();

  return (
    id === "serv_contabil" ||
    id.startsWith("contab_") ||
    categoria.includes("contab") ||
    categoria.includes("fiscal") ||
    categoria.includes("societ") ||
    categoria.includes("regularizacao") ||
    categoria.includes("regularização") ||
    categoria.includes("cnd") ||
    categoria.includes("demanda") ||
    nome.includes("contábil") ||
    nome.includes("contabil") ||
    nome.includes("contabilidade") ||
    nome.includes("por demanda") ||
    nome.includes("abertura de empresa") ||
    nome.includes("alteração contratual") ||
    nome.includes("alteracao contratual") ||
    nome.includes("desenquadramento") ||
    nome.includes("declaração de faturamento") ||
    nome.includes("declaracao de faturamento") ||
    nome.includes("defis") ||
    nome.includes("ecf") ||
    nome.includes("ecd") ||
    nome.includes("cnd federal") ||
    nome.includes("cnd estadual") ||
    nome.includes("cnd municipal") ||
    nome.includes("parcelamento receita") ||
    nome.includes("parcelamento pgfn") ||
    nome.includes("regularização e-cac") ||
    nome.includes("regularizacao e-cac")
  );
}

/**
 * Identifica se um serviço é isento de custo inicial (remunerado exclusivamente no êxito ou sob demanda sem custo avulso)
 */
export function isServiceWithoutUpfrontCost(serv: any): boolean {
  if (!serv) return false;
  
  if (serv.semCustoInicial === true) return true;
  const preco = typeof serv.preco === "number" ? serv.preco : typeof serv.valor === "number" ? serv.valor : parseFloat(serv.preco || serv.valor || 0);
  if (isNaN(preco) || preco <= 0) return true;

  // Serviços contábeis ou por demanda com valor > 0 possuem custo
  if (isDemandAccountingService(serv)) return false;

  const id = (serv.id || "").toString().toLowerCase();
  const nome = (serv.nome || serv.titulo || serv.servico || "").toString().toLowerCase();

  return (
    id === "serv_rtb" ||
    id === "serv_dossie" ||
    id === "serv_projeto" ||
    id === "serv_dossie_projeto" ||
    nome.includes("recuperação de tarifa") ||
    nome.includes("recuperacao de tarifa") ||
    nome.includes("rtb") ||
    nome.includes("perícia ccb") ||
    nome.includes("pericia ccb") ||
    nome.includes("dossiê") ||
    nome.includes("dossie") ||
    nome.includes("projeto bancário") ||
    nome.includes("projeto estruturado") ||
    nome.includes("projeto de crédito")
  );
}

/**
 * Retorna o link de pagamento cadastrado para o serviço (catálogo ou item do lead).
 * Não existe mais nenhum link padrão embutido no código.
 */
export function getPaymentLinkForService(serv: any, lead?: any, catalog?: any[]): string | null {
  if (!serv) return null;

  // Serviços sem custo inicial (RTB, Dossiê/Projeto ou valor 0) nunca geram link de pagamento
  if (isServiceWithoutUpfrontCost(serv)) {
    return null;
  }

  const own = readPaymentLink(serv);
  if (own.startsWith("http")) {
    return attachLeadParamsToPaymentUrl(own, lead);
  }

  const nome = (serv.nome || serv.titulo || serv.servico || "").toString().toLowerCase();

  if (catalog && Array.isArray(catalog)) {
    const matched = catalog.find(c =>
      c && (
        (c.id && serv.id && c.id === serv.id) ||
        (c.nome && nome && c.nome.toLowerCase().trim() === nome.trim())
      )
    );
    const matchedLink = readPaymentLink(matched);
    if (matchedLink.startsWith("http")) {
      return attachLeadParamsToPaymentUrl(matchedLink, lead);
    }
  }

  return null;
}

function attachLeadParamsToPaymentUrl(url: string, lead?: any): string {
  if (!lead) return url;
  const params = new URLSearchParams();
  if (lead.email) params.set("email", lead.email.trim());
  if (lead.razaoSocial || lead.nomeContato) params.set("name", (lead.razaoSocial || lead.nomeContato).trim());
  if (lead.cnpj || lead.cpf) {
    const docClean = (lead.cnpj || lead.cpf).trim();
    params.set("doc", docClean);
    params.set("document", docClean);
  }
  if (lead.id) {
    params.set("leadId", lead.id);
    params.set("custom_id", lead.id);
    params.set("sck", lead.id);
    params.set("metadata[leadId]", lead.id);
  }

  const queryString = params.toString();
  if (!queryString) return url;
  return url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`;
}

/**
 * Sanitiza recursivamente objetos para gravação no Firestore, eliminando valores `undefined` que travam o SDK
 */
export function cleanForFirestore<T = any>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanForFirestore(item)) as any;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        const res = cleanForFirestore(val);
        if (res !== undefined) {
          cleaned[key] = res;
        }
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Sanitiza rigorosamente a lista de serviços do catálogo para gravação no Firestore
 */
export function sanitizeServiceCatalogForFirestore(
  catalog: ServiceCatalogItem[],
  previousCatalog?: ServiceCatalogItem[]
): any[] {
  if (!Array.isArray(catalog)) return [];
  const prevList = Array.isArray(previousCatalog) ? previousCatalog : [];
  return catalog
    .filter(item => item && typeof item === "object")
    .map(item => {
      const cleaned: any = {
        id: (item.id || `serv_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`).toString().trim(),
        nome: (item.nome || "").toString().trim(),
        valor: typeof item.valor === "number" && !isNaN(item.valor) ? item.valor : (parseFloat(String(item.valor || 0)) || 0)
      };
      const desc = normalizeServiceDescription((item as any).descricao);
      cleaned.descricao = desc;
      const linkPg = readPaymentLink(item);
      if (linkPg) {
        cleaned.linkPagamento = linkPg;
      }
      if (item.semCustoInicial !== undefined && item.semCustoInicial !== null) {
        cleaned.semCustoInicial = Boolean(item.semCustoInicial);
      }

      // Cláusulas contratuais específicas (Contrato Avulso) + versionamento
      // Cláusulas: se o ADM não escreveu nada, usa o texto padrão do serviço.
      cleaned.clausulas =
        normalizeServiceClauses((item as any).clausulas) ||
        normalizeServiceClauses(DEFAULT_SERVICE_CLAUSES[cleaned.id]);
      cleaned.templateId =
        String((item as any).templateId || "").trim() || buildServiceTemplateId(cleaned.nome, cleaned.id);

      const prev = prevList.find(p => p && String(p.id) === cleaned.id);
      const prevVersao = Number(prev?.templateVersao || (item as any).templateVersao || 0);
      const prevClausulas = normalizeServiceClauses(prev?.clausulas);
      const mudou = Boolean(prev) && prevClausulas !== cleaned.clausulas;
      cleaned.templateVersao = mudou
        ? (prevVersao > 0 ? prevVersao + 1 : 2)
        : (prevVersao > 0 ? prevVersao : 1);

      return cleaned;
    });
}

export function sanitizeAndSyncServicosList(rawList: any[], catalog?: any[]): any[] {
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) return [];

  const activeCatalog = (catalog && catalog.length > 0) ? catalog : DEFAULT_SERVICES_CATALOG;

  // Catalog helpers
  const catalogReabilitacao = activeCatalog.find(
    c => (c.id && (c.id === "serv_reabilitacao" || c.id === "serv_renegociacao")) ||
         (c.nome && (c.nome.toLowerCase().includes("reabilita") || c.nome.toLowerCase().includes("renegocia")))
  );
  const targetReabilitacaoPrice = catalogReabilitacao && typeof catalogReabilitacao.valor === "number"
    ? catalogReabilitacao.valor
    : 0;
  const targetReabilitacaoName = catalogReabilitacao?.nome || "Programa de Reabilitação Financeira e Creditícia";

  const catalogRatingScore = activeCatalog.find(
    c => (c.id && c.id === "serv_rating_score") ||
         (c.nome && c.nome.toLowerCase().includes("rating") && c.nome.toLowerCase().includes("score"))
  );
  const targetRatingScorePrice = catalogRatingScore && typeof catalogRatingScore.valor === "number"
    ? catalogRatingScore.valor
    : 1100;
  const targetRatingScoreName = catalogRatingScore?.nome || "Melhoria e Adequação de Rating e Score";

  const result: any[] = [];
  let mergedReabilitacaoItem: any = null;
  let mergedRatingScoreItem: any = null;

  for (const sItem of rawList) {
    if (!sItem) continue;

    const itemName = (sItem.nome || sItem.servico || sItem.titulo || "").toString();
    const itemNameLower = itemName.toLowerCase();
    const itemId = (sItem.id || "").toString();

    // 0. Correspondência direta com o catálogo atual: serviço válido, nunca unificado
    const exactCatalogMatch = activeCatalog.find(c => {
      if (!c) return false;
      if (c.id && itemId && c.id === itemId) return true;
      const cNameLower = (c.nome || "").toString().toLowerCase().trim();
      return !!cNameLower && !!itemNameLower && cNameLower === itemNameLower.trim();
    });

    // 1. Unificar Reabilitação / Renegociação / BACEN avulso legado (somente itens sem match no catálogo)
    const isReabilitacao = !exactCatalogMatch && (
      itemId === "serv_reabilitacao" || itemId === "serv_renegociacao" ||
      itemNameLower.includes("reabilitação") || itemNameLower.includes("reabilitacao") ||
      itemNameLower.includes("renegociação") || itemNameLower.includes("renegociacao") ||
      itemNameLower.includes("limpa nome"));

    // 2. Se for BACEN avulso legado e não temos ainda o programa de reabilitação adicionado, fundir ou migrar
    const isBacenAvulso = !exactCatalogMatch && (
      itemId === "serv_bacen" || (itemNameLower.includes("bacen") && itemNameLower.includes("administrativa")));

    if (isReabilitacao || isBacenAvulso) {
      if (!mergedReabilitacaoItem) {
        // Sem item correspondente no catálogo atual, o registro do lead é preservado
        // como está (preço, link e descrição próprios) — nada é zerado nem reescrito.
        const itemPrice = typeof sItem.valor === "number" && !isNaN(sItem.valor)
          ? sItem.valor
          : (typeof sItem.preco === "number" && !isNaN(sItem.preco) ? sItem.preco : 0);
        const finalPrice = catalogReabilitacao ? targetReabilitacaoPrice : itemPrice;
        const finalName = catalogReabilitacao ? targetReabilitacaoName : (itemName || targetReabilitacaoName);
        const hLink = readPaymentLink(catalogReabilitacao) || readPaymentLink(sItem) || null;
        const finalDescricao = catalogReabilitacao
          ? normalizeServiceDescription(catalogReabilitacao?.descricao)
          : normalizeServiceDescription(sItem.descricao);
        mergedReabilitacaoItem = {
          ...sItem,
          id: "serv_reabilitacao",
          nome: finalName,
          ...(sItem.titulo ? { titulo: sItem.titulo || finalName } : {}),
          valor: finalPrice,
          preco: finalPrice,
          ...(hLink ? { linkPagamento: hLink } : {}),
          descricao: finalDescricao,
          justificativa: sItem.justificativa || "Programa unificado abrangendo Renegociação de Dívidas, Liminar Limpa Nome e Regularização/Administração SCR/Bacen",
          status: sItem.status || "pendente"
        };
        result.push(mergedReabilitacaoItem);
      }
      // Se houver múltiplos registros legados de renegociação/bacen, o primeiro unifica com R$ 2.000
    } else if (!exactCatalogMatch && (itemId === "serv_rating" || itemId === "serv_score" || itemId === "serv_rating_score" ||
      itemNameLower.includes("rating") || itemNameLower.includes("score"))) {
      if (!mergedRatingScoreItem) {
        const hLink = readPaymentLink(catalogRatingScore) || readPaymentLink(sItem) || null;
        mergedRatingScoreItem = {
          ...sItem,
          id: "serv_rating_score",
          nome: targetRatingScoreName,
          ...(sItem.titulo ? { titulo: sItem.titulo || targetRatingScoreName } : {}),
          valor: targetRatingScorePrice,
          preco: targetRatingScorePrice,
          ...(hLink ? { linkPagamento: hLink } : {}),
          descricao: normalizeServiceDescription(catalogRatingScore?.descricao),
          justificativa: sItem.justificativa || "Para elevação unificada do Rating interno bancário e Score do CPF e CNPJ nos bureaus e Banco Central",
          status: sItem.status || "pendente"
        };
        result.push(mergedRatingScoreItem);
      }
    } else {
      // Match with current catalog for other items
      const matchedCatalog = activeCatalog.find(c => {
        if (!c) return false;
        if (c.id && sItem.id && c.id === sItem.id) return true;
        const cNameLower = (c.nome || "").toLowerCase();
        if (cNameLower && itemNameLower && cNameLower.trim() === itemNameLower.trim()) return true;
        if (cNameLower.includes("contábil") && itemNameLower.includes("contábil")) return true;
        if (cNameLower.includes("tarifa") && itemNameLower.includes("tarifa")) return true;
        return false;
      });

      if (matchedCatalog && typeof matchedCatalog.valor === "number") {
        const hLink = readPaymentLink(matchedCatalog) || readPaymentLink(sItem) || null;
        result.push({
          ...sItem,
          id: matchedCatalog.id || sItem.id,
          nome: matchedCatalog.nome || sItem.nome,
          ...(sItem.titulo ? { titulo: sItem.titulo || matchedCatalog.nome } : {}),
          valor: matchedCatalog.valor,
          preco: matchedCatalog.valor,
          descricao: normalizeServiceDescription(matchedCatalog.descricao),
          ...(hLink ? { linkPagamento: hLink } : {})
        });
      } else {
        const hLink = readPaymentLink(sItem) || null;
        const finalVal = typeof sItem.valor === "number" ? sItem.valor : typeof sItem.preco === "number" ? sItem.preco : (parseFloat(sItem.valor || sItem.preco) || 0);
        result.push({
          ...sItem,
          nome: itemName,
          ...(sItem.titulo ? { titulo: sItem.titulo } : {}),
          valor: finalVal,
          preco: finalVal,
          ...(hLink ? { linkPagamento: hLink } : {})
        });
      }
    }
  }

  return cleanForFirestore(result);
}

export interface ApplicableContractTab {
  id: "contrato" | "termo" | "rating_score" | "bacen" | "rtb";
  title: string;
  label: string;
}

/**
 * Retorna dinamicamente apenas os contratos pertinentes aos serviços contratados/recomendados para o lead
 * Mantendo as métricas e minutas de termos 100% separadas e protegidas
 */
export function getApplicableContracts(lead: any): ApplicableContractTab[] {
  const tabs: ApplicableContractTab[] = [
    { id: "contrato", title: "Contrato Principal", label: "Principal" },
    { id: "termo", title: "Termo de Honorários", label: "Termo Honorários" }
  ];

  if (!lead) return tabs;

  // Obter todas as fontes de serviços do lead
  const servs: any[] = [
    ...(Array.isArray(lead.servicosRecomendados) ? lead.servicosRecomendados : []),
    ...(Array.isArray(lead.subEtapasPasso6) ? lead.subEtapasPasso6 : []),
    ...(Array.isArray(lead.pendencias) ? lead.pendencias : [])
  ];

  // Helper para verificar se um serviço específico está presente
  const hasService = (predicate: (s: any) => boolean) => {
    return servs.some(s => {
      if (!s) return false;
      return predicate(s);
    });
  };

  // 1. Rating / Score
  const hasRatingScore = hasService(s => {
    const id = (s.id || "").toString().toLowerCase();
    const nome = (s.nome || s.titulo || s.servico || "").toString().toLowerCase();
    return id === "serv_rating_score" || id === "serv_rating" || id === "serv_score" ||
      nome.includes("rating") || nome.includes("score");
  });

  if (hasRatingScore) {
    tabs.push({ id: "rating_score", title: "Contrato Rating/Score", label: "Rating/Score" });
  }

  // 2. BACEN / SCR (Aplicável quando há Programa de Reabilitação ou BACEN)
  const hasBacen = hasService(s => {
    const id = (s.id || "").toString().toLowerCase();
    const nome = (s.nome || s.titulo || s.servico || "").toString().toLowerCase();
    return id === "serv_reabilitacao" || id === "serv_bacen" || id === "serv_renegociacao" ||
      nome.includes("reabilita") || nome.includes("bacen") || nome.includes("scr") || nome.includes("banco central");
  });

  if (hasBacen) {
    tabs.push({ id: "bacen", title: "Contrato BACEN/SCR", label: "BACEN/SCR" });
  }

  // 3. RTB (Recuperação de Tarifas)
  const hasRtb = hasService(s => {
    const id = (s.id || "").toString().toLowerCase();
    const nome = (s.nome || s.titulo || s.servico || "").toString().toLowerCase();
    return id === "serv_rtb" || nome.includes("rtb") || nome.includes("tarifa") || nome.includes("tarifas");
  });

  if (hasRtb) {
    tabs.push({ id: "rtb", title: "Contrato RTB (Tarifas)", label: "RTB (Tarifas)" });
  }

  return tabs;
}

// Re-export Multilevel Commission Logic
export * from "./commissionUtils";

// ============================================================
// MENSALIDADES DA ASSESSORIA (configuráveis pelo Administrador)
// ============================================================

export interface MensalidadesAssessoria {
  essential: number;
  growth: number;
  corporate: number;
}

export const DEFAULT_MENSALIDADES: MensalidadesAssessoria = {
  essential: 497,
  growth: 797,
  corporate: 1497,
};

/** Normaliza os valores vindos do Firestore, aplicando o padrão quando ausentes/inválidos. */
export function normalizeMensalidades(raw: any): MensalidadesAssessoria {
  const pick = (v: any, fallback: number) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    essential: pick(raw?.essential, DEFAULT_MENSALIDADES.essential),
    growth: pick(raw?.growth, DEFAULT_MENSALIDADES.growth),
    corporate: pick(raw?.corporate, DEFAULT_MENSALIDADES.corporate),
  };
}

/** Mapa plano → valor mensal, usado na Etapa 4 (Definição de Contrato). */
export function buildPlanoValores(mensalidades: MensalidadesAssessoria): Record<string, number> {
  return {
    "Avulso": 0,
    "Assessoria Essential": mensalidades.essential,
    "Assessoria Growth": mensalidades.growth,
    "Assessoria Corporate": mensalidades.corporate,
  };
}

// ============================================================
// ASSINATURA MENSAL DO PARCEIRO (configurável pelo Administrador)
// ============================================================

export interface AssinaturaParceiro {
  starter: number;
  executive: number;
  master: number;
}

export const DEFAULT_ASSINATURA_PARCEIRO: AssinaturaParceiro = {
  starter: 97,
  executive: 97,
  master: 97,
};

/** Normaliza os 3 valores mensais de assinatura de parceiro vindos do Firestore. */
export function normalizeAssinaturaParceiro(raw: any): AssinaturaParceiro {
  const pick = (v: any, fallback: number) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    starter: pick(raw?.starter, DEFAULT_ASSINATURA_PARCEIRO.starter),
    executive: pick(raw?.executive, DEFAULT_ASSINATURA_PARCEIRO.executive),
    master: pick(raw?.master, DEFAULT_ASSINATURA_PARCEIRO.master),
  };
}

// ============================================================
// CONTRATOS DA ASSESSORIA (texto completo por plano, definido pelo ADM)
// ============================================================

export type PlanoAssessoriaKey = "essential" | "growth" | "corporate";

export interface ContratoAssessoriaTexto {
  texto: string;
  versao: number;
}

export type ContratosAssessoria = Record<PlanoAssessoriaKey, ContratoAssessoriaTexto>;

export const DEFAULT_CONTRATOS_ASSESSORIA: ContratosAssessoria = {
  essential: { texto: "", versao: 0 },
  growth: { texto: "", versao: 0 },
  corporate: { texto: "", versao: 0 },
};

const MAX_CONTRATO_ASSESSORIA_CHARS = 60000;

/** Normaliza os textos de contrato por plano vindos do Firestore. */
export function normalizeContratosAssessoria(raw: any): ContratosAssessoria {
  const pick = (v: any): ContratoAssessoriaTexto => {
    const texto = String(v?.texto ?? "").slice(0, MAX_CONTRATO_ASSESSORIA_CHARS);
    const versaoNum = Number(v?.versao);
    return { texto, versao: Number.isFinite(versaoNum) && versaoNum >= 0 ? Math.floor(versaoNum) : 0 };
  };
  return {
    essential: pick(raw?.essential),
    growth: pick(raw?.growth),
    corporate: pick(raw?.corporate),
  };
}

/** Descobre a chave do plano a partir do rótulo salvo no lead. */
export function planoAssessoriaKey(planoEscolhido?: string): PlanoAssessoriaKey | null {
  const p = String(planoEscolhido || "").toLowerCase();
  if (p.includes("corporate")) return "corporate";
  if (p.includes("growth")) return "growth";
  if (p.includes("essential")) return "essential";
  return null;
}

/** Texto de contrato vigente para o plano escolhido pelo lead. */
export function contratoAssessoriaPorPlano(
  planoEscolhido: string | undefined,
  contratos: ContratosAssessoria
): ContratoAssessoriaTexto {
  const key = planoAssessoriaKey(planoEscolhido);
  if (!key) return { texto: "", versao: 0 };
  return contratos[key] || { texto: "", versao: 0 };
}
