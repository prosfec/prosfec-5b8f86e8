export const CNPJ_CONSULTA_COOLDOWN_MS = 60_000;

/**
 * Controla uma consulta externa por minuto e permite uma única tentativa
 * manual imediata quando a descoberta automática não encontra o CNPJ.
 */
export function criarControleConsultaCnpj(cooldownMs = CNPJ_CONSULTA_COOLDOWN_MS) {
  const ultimaConsulta = new Map<string, number>();
  const liberacaoManual = new Map<string, number>();

  const limparExpirados = (agora: number) => {
    if (ultimaConsulta.size > 5000) {
      for (const [chave, timestamp] of ultimaConsulta) {
        if (agora - timestamp > cooldownMs) ultimaConsulta.delete(chave);
      }
    }
    if (liberacaoManual.size > 5000) {
      for (const [chave, validade] of liberacaoManual) {
        if (validade <= agora) liberacaoManual.delete(chave);
      }
    }
  };

  return {
    reservar(chave: string, agora = Date.now(), ignorarCooldown = false): number {
      const ultima = ultimaConsulta.get(chave);
      const restante = ultima === undefined ? 0 : cooldownMs - (agora - ultima);
      if (!ignorarCooldown && restante > 0) return Math.ceil(restante / 1000);

      ultimaConsulta.set(chave, agora);
      limparExpirados(agora);
      return 0;
    },

    liberarConsultaManual(chave: string, agora = Date.now()) {
      liberacaoManual.set(chave, agora + cooldownMs);
      limparExpirados(agora);
    },

    consumirLiberacaoManual(chave: string, agora = Date.now()): boolean {
      const validade = liberacaoManual.get(chave);
      liberacaoManual.delete(chave);
      return validade !== undefined && validade > agora;
    },
  };
}
