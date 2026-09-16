// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Recibos (somente leitura) dos contratos avulsos e termos aditivos já
 * assinados pelo cliente. Nenhuma seleção de serviço ou cláusula aqui —
 * o documento é montado automaticamente a partir do Passo 3.
 */

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { ShieldCheck } from "lucide-react";

const brl = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const maskCpf = (raw: any) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length !== 11) return "";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

export default function ContratosAssinadosResumo({ lead }: { lead: any }) {
  const [itens, setItens] = useState<any[]>([]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "contratos"), where("leadId", "==", lead.id)));
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((c: any) => c.status === "assinado")
          .sort((a: any, b: any) =>
            String(a.assinaturaData || "").localeCompare(String(b.assinaturaData || ""))
          );
        if (ativo) setItens(rows);
      } catch {
        if (ativo) setItens([]);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [lead.id]);

  if (itens.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        Documentos avulsos assinados pelo cliente
      </h4>
      {itens.map((c) => (
        <div
          key={c.id}
          className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-[11px] text-emerald-900 space-y-0.5"
        >
          <p className="font-extrabold">
            {c.tipo === "aditivo" ? "Termo Aditivo" : "Contrato Avulso"} — {brl(c.valorTotal)}
          </p>
          <p className="text-emerald-800">
            {(c.servicos || []).map((s: any) => s.nome).filter(Boolean).join(" · ") || "Sem serviços"}
          </p>
          <p>
            Assinado por {c.assinaturaNome || "—"} {maskCpf(c.assinaturaCpf) ? `(${maskCpf(c.assinaturaCpf)})` : ""} em{" "}
            {c.assinaturaData ? new Date(c.assinaturaData).toLocaleString("pt-BR") : "—"} — IP{" "}
            {c.assinaturaIp || "não registrado"}
          </p>
        </div>
      ))}
    </div>
  );
}
