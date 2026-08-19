// @ts-nocheck
export interface PartnerBankRule {
  id: string;
  bancoNormalizado: string;
  alias: string[];
  categoria: "estatal" | "privado" | "cooperativa" | "fintech" | "outros";
  linhasSuportadas: string[];
  regrasPorLinha: Record<string, {
    carenciaPadrao: number;
    carenciaMaxima: number;
    prazoTotalPadrao: number;
    prazoTotalMaximo: number;
    taxaAnualEstimada: number;
    destaqueEsteira: string;
    modalidadeAprovacao: string;
    exigeAval: boolean;
  }>;
}

export class BankRulesManager {
  private static bankCatalog: Record<string, PartnerBankRule> = {
    CAIXA: {
      id: "caixa",
      bancoNormalizado: "Caixa Econômica Federal",
      alias: ["caixa", "cef", "caixa economica", "caixa econômica federal"],
      categoria: "estatal",
      linhasSuportadas: ["PRONAMPE", "FAMPE", "FGI_PEAC", "FUNGETUR"],
      regrasPorLinha: {
        PRONAMPE: {
          carenciaPadrao: 24,
          carenciaMaxima: 24,
          prazoTotalPadrao: 96,
          prazoTotalMaximo: 96,
          taxaAnualEstimada: 15.5,
          destaqueEsteira: "A Caixa Econômica Federal opera com o teto legal estendido de até 24 meses de carência e 96 meses de contrato total no PRONAMPE, contando com alta aceitação de garantias do FGO.",
          modalidadeAprovacao: "Análise PJ Governamental + FGO Agilizado",
          exigeAval: true
        },
        FAMPE: {
          carenciaPadrao: 12,
          carenciaMaxima: 12,
          prazoTotalPadrao: 48,
          prazoTotalMaximo: 48,
          taxaAnualEstimada: 14.5,
          destaqueEsteira: "Crédito orientado com garantia de aval Sebrae e atendimento presencial ou digital nas agências Caixa.",
          modalidadeAprovacao: "FAMPE + Aval Sebrae",
          exigeAval: true
        }
      }
    },
    BB: {
      id: "bb",
      bancoNormalizado: "Banco do Brasil",
      alias: ["banco do brasil", "bb", "gerenciador financeiro bb"],
      categoria: "estatal",
      linhasSuportadas: ["PRONAMPE", "FAMPE", "FGI_PEAC", "FUNGETUR", "FINEP_INOV"],
      regrasPorLinha: {
        PRONAMPE: {
          carenciaPadrao: 24,
          carenciaMaxima: 24,
          prazoTotalPadrao: 96,
          prazoTotalMaximo: 96,
          taxaAnualEstimada: 15.8,
          destaqueEsteira: "O Banco do Brasil libera operações com prazos máximos legais de carência (até 24m) e 96m totais com contratação simplificada via Gerenciador Financeiro BB Empresas.",
          modalidadeAprovacao: "BB Giro Pronampe + e-CAC Automatizado",
          exigeAval: true
        },
        FGI_PEAC: {
          carenciaPadrao: 24,
          carenciaMaxima: 24,
          prazoTotalPadrao: 84,
          prazoTotalMaximo: 84,
          taxaAnualEstimada: 16.8,
          destaqueEsteira: "Linha FGI PEAC para médias empresas via repasse BNDES com garantia federal pública.",
          modalidadeAprovacao: "PEAC FGI BB Empresas",
          exigeAval: true
        }
      }
    },
    BNB_BASA: {
      id: "bnb_basa",
      bancoNormalizado: "Banco do Nordeste / Banco da Amazônia",
      alias: ["bnb", "banco do nordeste", "basa", "banco da amazonia", "banco da amazônia"],
      categoria: "estatal",
      linhasSuportadas: ["PRONAMPE", "FNE_FNO_FCO", "FUNGETUR"],
      regrasPorLinha: {
        PRONAMPE: {
          carenciaPadrao: 24,
          carenciaMaxima: 24,
          prazoTotalPadrao: 96,
          prazoTotalMaximo: 96,
          taxaAnualEstimada: 12.8,
          destaqueEsteira: "Oferece prazos estendidos de carência (24m) e amortização (72m) com integração a incentivos regionais e bônus de pontualidade.",
          modalidadeAprovacao: "Fomento Regional Constitucional + Bônus Pontualidade",
          exigeAval: true
        },
        FNE_FNO_FCO: {
          carenciaPadrao: 36,
          carenciaMaxima: 36,
          prazoTotalPadrao: 120,
          prazoTotalMaximo: 144,
          taxaAnualEstimada: 11.5,
          destaqueEsteira: "Taxas constitucionais de fomento regional com bonificação de adimplência e até 36 meses de carência.",
          modalidadeAprovacao: "Fundo Constitucional FNE/FNO",
          exigeAval: true
        }
      }
    },
    ITAU: {
      id: "itau",
      bancoNormalizado: "Itaú Unibanco",
      alias: ["itaú", "itau", "itau unibanco", "itaú empresas"],
      categoria: "privado",
      linhasSuportadas: ["PRONAMPE", "FGI_PEAC", "FAMPE"],
      regrasPorLinha: {
        PRONAMPE: {
          carenciaPadrao: 12,
          carenciaMaxima: 24,
          prazoTotalPadrao: 48,
          prazoTotalMaximo: 96,
          taxaAnualEstimada: 16.5,
          destaqueEsteira: "O Itaú Empresas opera esteira 100% digital via App com pré-aprovação de limite de crédito e carência padrão de 12 meses com flexibilidade até 24 meses.",
          modalidadeAprovacao: "Esteira Digital Itaú Empresas 24h",
          exigeAval: true
        },
        FGI_PEAC: {
          carenciaPadrao: 12,
          carenciaMaxima: 24,
          prazoTotalPadrao: 60,
          prazoTotalMaximo: 84,
          taxaAnualEstimada: 17.5,
          destaqueEsteira: "Garantia FGI com aprovação automatizada no canal Itaú PJ.",
          modalidadeAprovacao: "Itaú PEAC FGI Digital",
          exigeAval: true
        }
      }
    },
    BRADESCO: {
      id: "bradesco",
      bancoNormalizado: "Banco Bradesco",
      alias: ["bradesco", "bradesco net empresa", "bradesco empresas"],
      categoria: "privado",
      linhasSuportadas: ["PRONAMPE", "FGI_PEAC", "FAMPE"],
      regrasPorLinha: {
        PRONAMPE: {
          carenciaPadrao: 12,
          carenciaMaxima: 24,
          prazoTotalPadrao: 48,
          prazoTotalMaximo: 96,
          taxaAnualEstimada: 16.5,
          destaqueEsteira: "O Bradesco opera a linha PRONAMPE através do Bradesco Net Empresa com contratação direta e prazos dinâmicos ajustados ao perfil da conta.",
          modalidadeAprovacao: "Bradesco Net Empresa + FGO Digital",
          exigeAval: true
        }
      }
    },
    SANTANDER: {
      id: "santander",
      bancoNormalizado: "Banco Santander",
      alias: ["santander", "santander empresas", "santander negocios"],
      categoria: "privado",
      linhasSuportadas: ["PRONAMPE", "FGI_PEAC"],
      regrasPorLinha: {
        PRONAMPE: {
          carenciaPadrao: 12,
          carenciaMaxima: 24,
          prazoTotalPadrao: 48,
          prazoTotalMaximo: 96,
          taxaAnualEstimada: 16.5,
          destaqueEsteira: "O Santander Negócios & Empresas oferece análise agilizada com integração ao Internet Banking PJ e carência padrão inicial de 12 meses.",
          modalidadeAprovacao: "Santander PJ Direct + FGO",
          exigeAval: true
        }
      }
    },
    COOPERATIVAS: {
      id: "cooperativas",
      bancoNormalizado: "Cooperativas de Crédito (Sicoob / Sicredi / Cresol / Ailos)",
      alias: ["sicoob", "sicredi", "cresol", "ailos", "cooperativa", "uniprime", "unicred"],
      categoria: "cooperativa",
      linhasSuportadas: ["PRONAMPE", "FAMPE", "FGI_PEAC", "FUNGETUR"],
      regrasPorLinha: {
        PRONAMPE: {
          carenciaPadrao: 18,
          carenciaMaxima: 24,
          prazoTotalPadrao: 72,
          prazoTotalMaximo: 96,
          taxaAnualEstimada: 15.0,
          destaqueEsteira: "Oferece política de crédito consultiva e personalizada aos associados, permitindo negociar prazos flexíveis de carência de até 24 meses e repasse de sobras.",
          modalidadeAprovacao: "Atendimento Consultivo Cooperativo + Sobra Anual",
          exigeAval: true
        }
      }
    }
  };

  /**
   * Mapeia um nome de banco e código de linha de crédito para as regras específicas
   */
  public static getBankRules(bancoInput: string, creditLineCode: string = "PRONAMPE") {
    const b = String(bancoInput || "").toLowerCase().trim();
    const line = String(creditLineCode || "PRONAMPE").toUpperCase();

    // Procura no catálogo por alias
    let matchedBank: PartnerBankRule | null = null;

    for (const key of Object.keys(this.bankCatalog)) {
      const bank = this.bankCatalog[key];
      if (bank.alias.some(alias => b.includes(alias))) {
        matchedBank = bank;
        break;
      }
    }

    if (matchedBank) {
      const rule = matchedBank.regrasPorLinha[line] || matchedBank.regrasPorLinha["PRONAMPE"];
      if (rule) {
        return {
          bancoNormalizado: matchedBank.bancoNormalizado,
          categoria: matchedBank.categoria,
          carenciaPadrao: rule.carenciaPadrao,
          carenciaMaxima: rule.carenciaMaxima,
          prazoTotalPadrao: rule.prazoTotalPadrao,
          prazoTotalMaximo: rule.prazoTotalMaximo,
          taxaAnualEstimada: rule.taxaAnualEstimada,
          destaqueEsteira: rule.destaqueEsteira,
          modalidadeAprovacao: rule.modalidadeAprovacao,
          exigeAval: rule.exigeAval
        };
      }
    }

    // Default Fallback se banco não cadastrado explicitamente
    const isPronampe = line === "PRONAMPE";
    return {
      bancoNormalizado: bancoInput && bancoInput.trim() ? bancoInput.trim() : "Banco de Relacionamento",
      categoria: "outros" as const,
      carenciaPadrao: isPronampe ? 24 : 12,
      carenciaMaxima: isPronampe ? 24 : 24,
      prazoTotalPadrao: isPronampe ? 96 : 48,
      prazoTotalMaximo: isPronampe ? 96 : 84,
      taxaAnualEstimada: 16.5,
      destaqueEsteira: "Análise enquadrada conforme as condições do banco selecionado para a linha solicitada.",
      modalidadeAprovacao: "Esteira Comercial FGO/FGI",
      exigeAval: true
    };
  }

  /**
   * Retorna todas as instituições parceiras pré-mapeadas no sistema
   */
  public static getAllSupportedBanks() {
    return Object.values(this.bankCatalog).map(b => ({
      id: b.id,
      bancoNormalizado: b.bancoNormalizado,
      categoria: b.categoria,
      linhasSuportadas: b.linhasSuportadas
    }));
  }
}
