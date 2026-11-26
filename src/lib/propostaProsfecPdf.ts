import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface DadosPropostaProsfec {
  cliente: string; documento: string; cidadeUf: string; distribuidora: string;
  consumoKwh: number; tarifa: number; descontoPct: number; disponibilidade: number; iluminacao: number;
  assessorNome: string; assessorWhatsapp: string; validadeDias: number; numero: string; emissao: Date;
}

export function calcularPropostaProsfec(d: Pick<DadosPropostaProsfec, "consumoKwh" | "tarifa" | "descontoPct" | "disponibilidade" | "iluminacao">) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const energia = r2(d.consumoKwh * d.tarifa);
  const energiaComDesconto = r2(energia * (1 - d.descontoPct / 100));
  const fixos = r2(d.disponibilidade + d.iluminacao);
  const totalAtual = r2(energia + fixos);
  const totalNovo = r2(energiaComDesconto + fixos);
  const economiaMensal = r2(totalAtual - totalNovo);
  return { energia, energiaComDesconto, totalAtual, totalNovo, economiaMensal, economiaAnual: r2(economiaMensal * 12) };
}

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
// Cores fixas do documento (PDF não lê tokens CSS)
const C = { dark: rgb(0.024, 0.114, 0.082), dark2: rgb(0.04, 0.17, 0.125), lima: rgb(0.64, 0.9, 0.21), ground: rgb(0.973, 0.98, 0.988), white: rgb(1, 1, 1), ink: rgb(0.07, 0.13, 0.11), muted: rgb(0.39, 0.45, 0.43), line: rgb(0.886, 0.91, 0.94), onDark: rgb(0.72, 0.8, 0.76) };
const W = 960, H = 540, M = 56;

function limpar(t: string) { return t.replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2022\u201C\u201D]/g, ""); }

export async function gerarPropostaProsfecPdf(d: DadosPropostaProsfec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Proposta PROSFEC Energy — ${limpar(d.cliente)}`); pdf.setAuthor("PROSFEC Energy"); pdf.setCreator("Mesa de Operações PROSFEC");
  const f = await pdf.embedFont(StandardFonts.Helvetica), b = await pdf.embedFont(StandardFonts.HelveticaBold);
  const calc = calcularPropostaProsfec(d);
  const txt = (p: PDFPage, s: string, x: number, y: number, size: number, font: PDFFont = f, color = C.ink) => p.drawText(limpar(s), { x, y, size, font, color });
  const right = (p: PDFPage, s: string, xr: number, y: number, size: number, font: PDFFont = f, color = C.ink) => txt(p, s, xr - font.widthOfTextAtSize(limpar(s), size), y, size, font, color);
  const wrap = (s: string, font: PDFFont, size: number, max: number) => { const out: string[] = []; let line = ""; for (const w of limpar(s).split(" ")) { const t = line ? line + " " + w : w; if (font.widthOfTextAtSize(t, size) > max && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
  const para = (p: PDFPage, s: string, x: number, y: number, size: number, max: number, color = C.muted, font: PDFFont = f, lh = 1.45) => { const ls = wrap(s, font, size, max); ls.forEach((l, i) => txt(p, l, x, y - i * size * lh, size, font, color)); return y - ls.length * size * lh; };
  const box = (p: PDFPage, x: number, y: number, w: number, h: number, color = C.white, border = C.line) => p.drawRectangle({ x, y, width: w, height: h, color, borderColor: border, borderWidth: 0.8 });
  const logo = (p: PDFPage, dark: boolean) => { p.drawRectangle({ x: M, y: H - 52, width: 4, height: 22, color: C.lima }); txt(p, "PROSFEC", M + 12, H - 44, 15, b, dark ? C.white : C.ink); txt(p, "Energy", M + 12 + b.widthOfTextAtSize("PROSFEC ", 15), H - 44, 15, f, dark ? C.lima : C.dark2); txt(p, "INTELIGÊNCIA ENERGÉTICA", M + 12, H - 56, 6.5, b, dark ? C.onDark : C.muted); };
  const header = (p: PDFPage, n: string, eyebrow: string, title: string) => { p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.ground }); logo(p, false); right(p, `${n} / 04`, W - M, H - 44, 9, b, C.muted); txt(p, eyebrow, M, H - 100, 9, b, C.dark2); txt(p, title, M, H - 128, 24, b, C.ink); p.drawRectangle({ x: M, y: H - 142, width: 40, height: 3, color: C.lima }); };
  const footer = (p: PDFPage) => { p.drawLine({ start: { x: M, y: 38 }, end: { x: W - M, y: 38 }, thickness: 0.6, color: C.line }); txt(p, "PROSFEC Energy — Inteligência em Gestão e Economia de Energia", M, 22, 7.5, f, C.muted); right(p, `Estudo nº ${d.numero} · prosfec.com.br/energiasolar`, W - M, 22, 7.5, f, C.muted); };
  const validade = new Date(d.emissao.getTime() + d.validadeDias * 86400000);

  // 1 — Capa
  let p = pdf.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.dark });
  p.drawRectangle({ x: W - 300, y: 0, width: 300, height: H, color: C.dark2 });
  p.drawCircle({ x: W - 90, y: H - 120, size: 180, borderColor: C.lima, borderWidth: 0.6, opacity: 0, borderOpacity: 0.25 });
  logo(p, true);
  right(p, `ESTUDO EXECUTIVO Nº ${d.numero}`, W - M, H - 44, 8.5, b, C.lima);
  right(p, `Emissão ${d.emissao.toLocaleDateString("pt-BR")} · Validade ${validade.toLocaleDateString("pt-BR")}`, W - M, H - 58, 8, f, C.onDark);
  txt(p, "PROPOSTA COMERCIAL", M, H - 170, 10, b, C.lima);
  txt(p, "Estudo de Eficiência Energética", M, H - 210, 34, b, C.white);
  txt(p, "e Redução de Custos", M, H - 250, 34, b, C.white);
  txt(p, "Geração compartilhada em conformidade com a Lei Federal nº 14.300/2022 e as regras da ANEEL.", M, H - 280, 11, f, C.onDark);
  p.drawRectangle({ x: M, y: 150, width: W - 2 * M, height: 78, color: C.dark2, borderColor: C.lima, borderWidth: 0.6, borderOpacity: 0.4 });
  const campos: [string, string][] = [["CLIENTE", d.cliente], ["DOCUMENTO", d.documento || "—"], ["CIDADE / UF", d.cidadeUf || "—"], ["DISTRIBUIDORA", d.distribuidora || "—"]];
  const cw = (W - 2 * M - 40) / 4;
  campos.forEach(([k, v], i) => { const x = M + 20 + i * cw; txt(p, k, x, 200, 7.5, b, C.lima); wrap(v, b, 11, cw - 14).slice(0, 2).forEach((l, j) => txt(p, l, x, 182 - j * 14, 11, b, C.white)); });
  p.drawLine({ start: { x: M, y: 110 }, end: { x: W - M, y: 110 }, thickness: 0.5, color: C.onDark, opacity: 0.3 });
  txt(p, "ATENDIMENTO DEDICADO", M, 88, 7.5, b, C.lima);
  txt(p, d.assessorNome || "Mesa de Operações PROSFEC Energy", M, 70, 13, b, C.white);
  txt(p, [d.assessorWhatsapp && `WhatsApp ${d.assessorWhatsapp}`, "Mesa de Operações PROSFEC Energy"].filter(Boolean).join("  ·  "), M, 54, 9, f, C.onDark);

  // 2 — Raio-X financeiro
  p = pdf.addPage([W, H]);
  header(p, "02", "DIAGNÓSTICO TARIFÁRIO", "Comparativo de custo mensal e anual");
  const kp: [string, string][] = [["CONSUMO MÉDIO MENSAL", `${num(d.consumoKwh)} kWh/mês`], ["TARIFA ESTIMADA", `${brl(d.tarifa).replace("R$ ", "R$ ")} / kWh`], ["DESCONTO APLICADO", `${num(d.descontoPct)}% sobre a energia`]];
  const kw = (W - 2 * M - 24) / 3;
  kp.forEach(([k, v], i) => { const x = M + i * (kw + 12); box(p, x, 326, kw, 50); txt(p, k, x + 16, 356, 7.5, b, C.muted); txt(p, v, x + 16, 336, 14, b, C.ink); });
  const cardW = (W - 2 * M - 16) / 2;
  const cen = (x: number, titulo: string, linhas: [string, number][], total: [string, number], destaque: boolean) => {
    box(p, x, 134, cardW, 178, C.white, destaque ? C.dark2 : C.line);
    if (destaque) p.drawRectangle({ x, y: 308, width: cardW, height: 4, color: C.lima });
    txt(p, titulo, x + 18, 286, 9, b, destaque ? C.dark2 : C.muted);
    linhas.forEach(([k, v], i) => { const y = 258 - i * 24; txt(p, k, x + 18, y, 10, f, C.ink); right(p, brl(v), x + cardW - 18, y, 10, f, C.ink); p.drawLine({ start: { x: x + 18, y: y - 8 }, end: { x: x + cardW - 18, y: y - 8 }, thickness: 0.4, color: C.line }); });
    txt(p, total[0], x + 18, 152, 10, b, C.ink); right(p, brl(total[1]), x + cardW - 18, 150, 15, b, destaque ? C.dark2 : C.ink);
  };
  cen(M, "CENÁRIO ATUAL · SEM A PROSFEC", [["Consumo de energia", calc.energia], ["Custo de disponibilidade", d.disponibilidade], ["Iluminação pública", d.iluminacao]], ["TOTAL ATUAL", calc.totalAtual], false);
  cen(M + cardW + 16, "CENÁRIO OTIMIZADO · COM PROSFEC ENERGY", [[`Energia com desconto (${num(d.descontoPct)}%)`, calc.energiaComDesconto], ["Custo de disponibilidade", d.disponibilidade], ["Iluminação pública", d.iluminacao]], ["NOVO TOTAL MENSAL", calc.totalNovo], true);
  p.drawRectangle({ x: M, y: 52, width: W - 2 * M, height: 70, color: C.dark });
  p.drawRectangle({ x: M, y: 52, width: 5, height: 70, color: C.lima });
  txt(p, "SUA ECONOMIA ESTIMADA", M + 24, 100, 8, b, C.lima);
  txt(p, `${brl(calc.economiaMensal)} por mês`, M + 24, 72, 22, b, C.white);
  right(p, `${brl(calc.economiaAnual)}`, W - M - 24, 80, 22, b, C.lima);
  right(p, "economia acumulada em 12 meses", W - M - 24, 64, 8.5, f, C.onDark);
  footer(p);
  txt(p, "Valores estimados com base nos dados informados; tributos podem variar conforme a fatura da distribuidora.", M, 42, 6.5, f, C.muted);

  // 3 — Ecossistema
  p = pdf.addPage([W, H]);
  header(p, "03", "ALÉM DA ENERGIA", "Vantagens exclusivas para clientes PROSFEC");
  para(p, "A PROSFEC conecta sua empresa a um ecossistema completo de eficiência de custos e inteligência bancária.", M, H - 172, 11, 600);
  const pil = (x: number, n: string, t: string, itens: string[]) => {
    box(p, x, 110, cardW, 230);
    p.drawRectangle({ x, y: 110, width: 4, height: 230, color: C.lima });
    txt(p, n, x + 24, 306, 22, b, C.lima); txt(p, t, x + 24, 280, 15, b, C.ink);
    itens.forEach((it, i) => { const y = 248 - i * 44; p.drawCircle({ x: x + 28, y: y + 3, size: 2.5, color: C.dark2 }); para(p, it, x + 40, y, 10.5, cardW - 70, C.ink); });
  };
  pil(M, "01", "Clube de Benefícios Juros Baixos", ["Acesso prioritário a linhas de crédito com taxas reduzidas.", "Portabilidade inteligente de financiamentos e dívidas ativas.", "Condições negociadas para pessoa física e sócios da empresa."]);
  pil(M + cardW + 16, "02", "PROSFEC Assessoria Financeira", ["Diagnóstico de estrutura de capital e passivos bancários.", "Apoio em projetos de investimento e captação de recursos (ex.: BNDES).", "Otimização do fluxo de caixa e capital de giro para empresas."]);
  txt(p, "Nossos clientes têm canal direto com a mesa financeira para reduzir os custos globais da operação.", M, 72, 10, f, C.muted);
  footer(p);

  // 4 — Próximos passos
  p = pdf.addPage([W, H]);
  header(p, "04", "COMO CONCLUIR SUA ADESÃO", "Trâmite simples e 100% digital");
  const passos: [string, string][] = [["Confirmação da proposta", "Valide com seu assessor os dados do estudo e o percentual de desconto acordado."], ["Envio da documentação básica", "Foto legível do documento de identificação (RG ou CNH) do titular da conta de energia. Se a titularidade for Pessoa Jurídica, envie também o Contrato Social."], ["Assinatura eletrônica", "Você recebe o link do termo de adesão no WhatsApp ou e-mail para assinatura digital com validade jurídica, sem cartório."]];
  const pw = (W - 2 * M - 32) / 3;
  passos.forEach(([t, dd], i) => { const x = M + i * (pw + 16); txt(p, `0${i + 1}`, x, 322, 30, b, C.dark2); p.drawLine({ start: { x: x + 52, y: 332 }, end: { x: x + pw, y: 332 }, thickness: 0.6, color: C.line }); txt(p, t, x, 290, 13, b, C.ink); para(p, dd, x, 268, 10, pw - 8, C.muted); });
  box(p, M, 70, W - 2 * M, 84, C.white);
  txt(p, "AVISOS REGULATÓRIOS", M + 20, 132, 7.5, b, C.dark2);
  para(p, "Não há corte nem interrupção no fornecimento: a distribuidora continua responsável pela entrega física da energia e pela manutenção da rede.", M + 20, 114, 9.5, W - 2 * M - 40, C.ink);
  para(p, "A ativação e a alocação dos créditos na fatura ocorrem dentro dos ciclos regulamentados pela ANEEL.", M + 20, 88, 9.5, W - 2 * M - 40, C.ink);
  footer(p);
  return pdf.save();
}
