import { describe, it, expect } from "vitest";
import { dentroHorarioComercial, deveContar, diaPresenca } from "./presenca";

// Brasília = UTC-3
const br = (iso: string) => new Date(`${iso}-03:00`);

describe("presença do assessor", () => {
  it("não conta antes das 08:00", () => {
    expect(dentroHorarioComercial(br("2026-10-28T07:59:00"))).toBe(false);
  });
  it("conta às 08:00", () => {
    expect(dentroHorarioComercial(br("2026-10-28T08:00:00"))).toBe(true);
  });
  it("conta às 17:59", () => {
    expect(dentroHorarioComercial(br("2026-10-28T17:59:00"))).toBe(true);
  });
  it("para às 18:00", () => {
    expect(dentroHorarioComercial(br("2026-10-28T18:00:00"))).toBe(false);
  });
  it("pausa após 5 minutos sem interação", () => {
    const agora = br("2026-10-28T10:00:00");
    expect(deveContar(agora, agora.getTime() - 4 * 60_000, true)).toBe(true);
    expect(deveContar(agora, agora.getTime() - 5 * 60_000, true)).toBe(false);
  });
  it("pausa com aba em segundo plano", () => {
    const agora = br("2026-10-28T10:00:00");
    expect(deveContar(agora, agora.getTime(), false)).toBe(false);
  });
  it("não conta no sábado", () => {
    expect(dentroHorarioComercial(br("2026-10-24T10:00:00"))).toBe(false);
  });
  it("não conta no domingo", () => {
    expect(dentroHorarioComercial(br("2026-10-25T10:00:00"))).toBe(false);
  });
  it("conta na sexta", () => {
    expect(dentroHorarioComercial(br("2026-10-30T10:00:00"))).toBe(true);
  });
  it("dia usa horário de Brasília", () => {
    expect(diaPresenca(new Date("2026-10-29T01:00:00Z"))).toBe("2026-10-28");
  });
});

import { segundosValidos, somarComTeto, deveLiderar } from "./presenca";
describe("teto físico de horas", () => {
  it("primeiro acesso 11:00 e último 12:00 não pode ter 3h", () => {
    expect(segundosValidos({ segundosAtivos: 10800, primeiroAcesso: "2026-11-09T14:00:00Z", ultimoRegistro: "2026-11-09T15:00:00Z" })).toBe(3600);
  });
  it("soma não passa do tempo decorrido", () => {
    expect(somarComTeto(3500, 300, "2026-11-09T14:00:00Z", "2026-11-09T15:00:00Z")).toBe(3600);
    expect(somarComTeto(100, 60, "2026-11-09T14:00:00Z", "2026-11-09T15:00:00Z")).toBe(160);
  });
});
describe("aba única", () => {
  it("segunda aba não conta enquanto a líder está viva e visível", () => {
    expect(deveLiderar({ id: "a", ts: 1000, visivel: true }, "b", true, 3000)).toBe(false);
  });
  it("assume se líder sumiu ou está oculta", () => {
    expect(deveLiderar({ id: "a", ts: 1000, visivel: true }, "b", true, 7000)).toBe(true);
    expect(deveLiderar({ id: "a", ts: 1000, visivel: false }, "b", true, 2000)).toBe(true);
  });
});
