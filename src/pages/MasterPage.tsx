import React from 'react';
import {
  FileSpreadsheet,
  Receipt,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Cpu,
  FileText,
  CheckCircle2,
  AlertCircle,
  FolderDown,
  Building,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { MasterSummary, MasterRowStats } from '../types/finance';

interface MasterPageProps {
  competencia: string;
  summary: MasterSummary;
  onImportarPlanilha: () => void;
  onImportarExtratos: () => void;
  onBaixarBackup: () => void;
  onRestaurarBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onZerarMes: () => void;
  onApagarTudo: () => void;
  onDistribuirUnidade: () => void;
  onGerarTxtAtual: () => void;
  onGerarTxtUnico: () => void;
  statusMsg?: { type: 'success' | 'warning' | 'error'; text: string } | null;
}

export const MasterPage: React.FC<MasterPageProps> = ({
  competencia,
  summary,
  onImportarPlanilha,
  onImportarExtratos,
  onBaixarBackup,
  onRestaurarBackup,
  onZerarMes,
  onApagarTudo,
  onDistribuirUnidade,
  onGerarTxtAtual,
  onGerarTxtUnico,
  statusMsg,
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Banner & Quick Actions */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                Competência Ativa: {competencia}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
              Painel de Integração Contábil & SCI Único
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Importe planilhas mensais completas ou extratos de múltiplos bancos (PDF, OFX, TXT Sicoob).
              O sistema consolida contas, sugere classificações inteligentes e exporta os arquivos para o SCI Único.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onImportarPlanilha}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar Planilha do Mês</span>
            </button>

            <button
              type="button"
              onClick={onImportarExtratos}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all"
            >
              <Receipt className="w-4 h-4 text-cyan-500" />
              <span>Importar Extratos Bancários</span>
            </button>

            <button
              type="button"
              onClick={onBaixarBackup}
              title="Baixar arquivo JSON com todos os dados do sistema"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              title="Restaurar backup JSON salvo"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={onRestaurarBackup} className="hidden" />
            </label>

            <button
              type="button"
              onClick={onZerarMes}
              title="Zerar lançamentos da competência atual"
              className="p-2.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl border border-transparent hover:border-amber-200 dark:hover:border-amber-900 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onApagarTudo}
              title="Apagar todos os dados do sistema"
              className="p-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : statusMsg.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Lançamentos</span>
            <Cpu className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {summary.totalGeral}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Registrados neste mês</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Classificados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {summary.totalClassificados}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Prontos para integração</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Pendentes</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {summary.totalPendentes}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Requerem classificação</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Conclusão</span>
            <Percent className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-2 font-mono">
            {summary.completoPct}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.completoPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Accounting Actions Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/20 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span>Geração de Integrações e Distribuição Contábil</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Aplique as regras de débito/crédito da macro v30 e gere os arquivos TXT prontos para importação no SCI Único.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onDistribuirUnidade}
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              <Building className="w-4 h-4" />
              <span>Distribuir por Unidade</span>
            </button>

            <button
              type="button"
              onClick={onGerarTxtAtual}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>TXTs (Formato Atual)</span>
            </button>

            <button
              type="button"
              onClick={onGerarTxtUnico}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all"
            >
              <FolderDown className="w-4 h-4" />
              <span>TXTs (SCI Único Oficial)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tables Grid: Unidades & Bancos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unidades Table */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-cyan-500" />
              <span>Lançamentos por Unidade</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {summary.unidades.length} unidades
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Unidade</th>
                  <th className="py-2.5 px-3 text-right">Classif.</th>
                  <th className="py-2.5 px-3 text-right">Pend.</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Completo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {summary.unidades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      Nenhum lançamento registrado para esta competência
                    </td>
                  </tr>
                ) : (
                  summary.unidades.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {u.nome}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {u.classificados}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        {u.pendentes}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {u.total}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-cyan-600 dark:text-cyan-400">
                        {u.completoPct}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bancos Table */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-cyan-500" />
              <span>Lançamentos por Conta Bancária</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {summary.bancos.length} contas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Conta / Movimentação</th>
                  <th className="py-2.5 px-3 text-right">Classif.</th>
                  <th className="py-2.5 px-3 text-right">Pend.</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {summary.bancos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                      Nenhum lançamento bancário registrado
                    </td>
                  </tr>
                ) : (
                  summary.bancos.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {b.nome}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {b.classificados}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        {b.pendentes}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {b.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
