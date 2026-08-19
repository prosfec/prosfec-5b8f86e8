// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
import { Users, TrendingUp, Award, Target, BarChart2, DollarSign } from "lucide-react";
import { formatCurrencyBRL } from "../utils";

interface TeamMember {
  id: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  plano?: string;
}

interface TeamLead {
  id: string;
  parceiroId?: string;
  parceiroNome?: string;
  status?: string;
  limiteEstimado?: number;
  valorAprovado?: number;
  dataCriacao?: string;
}

interface TeamPerformanceChartProps {
  teamMembers: TeamMember[];
  teamLeads: TeamLead[];
  distributedLeadsMap?: Record<string, { teamMemberName: string; date: string; status: string; id: string }>;
}

export const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({
  teamMembers,
  teamLeads,
  distributedLeadsMap = {}
}) => {
  const [metricType, setMetricType] = useState<"volume" | "financial">("volume");

  // Process data per team member
  const chartData = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) return [];

    // Count distributed leads per member
    const distributedCounts: Record<string, number> = {};
    Object.values(distributedLeadsMap).forEach((item: any) => {
      if (item && item.teamMemberName) {
        distributedCounts[item.teamMemberName] = (distributedCounts[item.teamMemberName] || 0) + 1;
      }
    });

    return teamMembers.map(member => {
      const memberLeads = teamLeads.filter(l => l.parceiroId === member.id);
      const concludedLeads = memberLeads.filter(l => l.status === "concluido" || l.status === "convertido");
      const inProgressLeads = memberLeads.filter(l => l.status !== "concluido" && l.status !== "convertido" && l.status !== "cancelado");
      
      const totalVolume = memberLeads.reduce((acc, l) => acc + (l.valorAprovado || l.limiteEstimado || 0), 0);
      const concludedVolume = concludedLeads.reduce((acc, l) => acc + (l.valorAprovado || l.limiteEstimado || 0), 0);

      // Name display: FirstName + Last Initial
      const nameParts = (member.nome || "Consultor").trim().split(" ");
      const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.` : nameParts[0];

      const directedCount = distributedCounts[member.nome] || 0;

      return {
        id: member.id,
        fullName: member.nome || "Consultor",
        displayName,
        totalLeads: memberLeads.length,
        concludedLeads: concludedLeads.length,
        inProgressLeads: inProgressLeads.length,
        directedLeads: directedCount,
        totalVolume,
        concludedVolume,
        conversionRate: memberLeads.length > 0 ? Math.round((concludedLeads.length / memberLeads.length) * 100) : 0
      };
    }).sort((a, b) => b.totalLeads - a.totalLeads);
  }, [teamMembers, teamLeads, distributedLeadsMap]);

  // Aggregate Summary KPI Metrics
  const summaryMetrics = useMemo(() => {
    const totalTeamLeads = teamLeads.length;
    const totalConcludedLeads = teamLeads.filter(l => l.status === "concluido" || l.status === "convertido").length;
    const avgLeadsPerMember = teamMembers.length > 0 ? (totalTeamLeads / teamMembers.length).toFixed(1) : "0";
    
    // Top performer
    const topPerformer = [...chartData].sort((a, b) => b.totalLeads - a.totalLeads)[0];
    const avgConversion = totalTeamLeads > 0 ? Math.round((totalConcludedLeads / totalTeamLeads) * 100) : 0;
    const totalCreditPipeline = teamLeads.reduce((acc, l) => acc + (l.valorAprovado || l.limiteEstimado || 0), 0);

    return {
      totalTeamLeads,
      totalConcludedLeads,
      avgLeadsPerMember,
      topPerformerName: topPerformer?.fullName || "N/A",
      topPerformerCount: topPerformer?.totalLeads || 0,
      avgConversion,
      totalCreditPipeline
    };
  }, [teamLeads, teamMembers, chartData]);

  if (!teamMembers || teamMembers.length === 0) {
    return null;
  }

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-2 min-w-[200px]">
          <div className="font-extrabold text-sm text-emerald-400 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>{data.fullName}</span>
            <span className="text-[10px] text-slate-400 font-mono">ID: {data.id.substring(0, 6)}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span>Leads Totais Captados:</span>
              <span className="font-bold text-white">{data.totalLeads}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-300">
              <span>Concluídos / Convertidos:</span>
              <span className="font-bold">{data.concludedLeads}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-300">
              <span>Leads Direcionados (Caça):</span>
              <span className="font-bold">{data.directedLeads}</span>
            </div>
            <div className="flex justify-between items-center text-amber-300">
              <span>Taxa de Conversão:</span>
              <span className="font-bold">{data.conversionRate}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800 font-bold">
              <span>Crédito Estimado:</span>
              <span className="text-emerald-400 font-mono">{formatCurrencyBRL(data.totalVolume)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-xl text-[#00A86B]">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-800">
                Desempenho & Volume de Leads da Equipe
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento visual em tempo real do volume de prospecção por consultor.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setMetricType("volume")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              metricType === "volume"
                ? "bg-white text-[#0A3D2E] shadow-xs font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Qtd. Leads
          </button>
          <button
            onClick={() => setMetricType("financial")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              metricType === "financial"
                ? "bg-white text-[#0A3D2E] shadow-xs font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Crédito (R$)
          </button>
        </div>
      </div>

      {/* Summary Stat Mini-Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total de Leads</span>
            <Users className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-slate-800">{summaryMetrics.totalTeamLeads}</p>
          <p className="text-[10px] text-slate-500 font-medium">Média: {summaryMetrics.avgLeadsPerMember} / consultor</p>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-100/80 p-3.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Concluídos</span>
            <Award className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-emerald-900">{summaryMetrics.totalConcludedLeads}</p>
          <p className="text-[10px] text-emerald-700 font-medium">Taxa média: {summaryMetrics.avgConversion}%</p>
        </div>

        <div className="bg-indigo-50/60 border border-indigo-100/80 p-3.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Maior Captador</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-sm font-extrabold text-indigo-950 truncate">{summaryMetrics.topPerformerName}</p>
          <p className="text-[10px] text-indigo-700 font-medium">{summaryMetrics.topPerformerCount} leads gerados</p>
        </div>

        <div className="bg-amber-50/60 border border-amber-100/80 p-3.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Pipeline Crédito</span>
            <Target className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-sm font-black text-amber-950 font-mono truncate">{formatCurrencyBRL(summaryMetrics.totalCreditPipeline)}</p>
          <p className="text-[10px] text-amber-700 font-medium">Volume total simulado</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full pt-2">
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Nenhum dado de equipe disponível para gerar gráficos.
          </div>
        ) : (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="displayName"
                  tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: "#CBD5E1" }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.6)" }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: "15px", fontSize: "11px", fontWeight: "bold" }}
                />

                {metricType === "volume" ? (
                  <>
                    <Bar
                      dataKey="totalLeads"
                      name="Leads Captados/Indicados"
                      fill="#0A3D2E"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="concludedLeads"
                      name="Concluídos / Convertidos"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="directedLeads"
                      name="Leads Direcionados (Caça)"
                      fill="#6366F1"
                      radius={[6, 6, 0, 0]}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="totalVolume"
                      name="Crédito Total Simulado (R$)"
                      fill="#0A3D2E"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="concludedVolume"
                      name="Crédito Aprovado (R$)"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
