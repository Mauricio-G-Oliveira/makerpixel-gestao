import React from 'react';
import { Network, RefreshCw, Trash2, Building } from 'lucide-react';
import { Unit, Entry } from '../types/finance';
import { Core } from '../engine';

interface UnidadePageProps {
  unidade: Unit;
  entries: Entry[];
  onRedistribuir: () => void;
  onExcluirUnidade: () => void;
}

export const UnidadePage: React.FC<UnidadePageProps> = ({
  unidade,
  entries,
  onRedistribuir,
  onExcluirUnidade,
}) => {
  const totalValor = entries.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Notice Banner */}
      <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-950 dark:text-cyan-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Aba Gerada Automaticamente — {unidade.nome}
            </h4>
            <p className="text-xs text-slate-600 dark:text-cyan-300/80 mt-0.5">
              Os lançamentos desta unidade vêm das contas bancárias com contas de débito e crédito
              já mapeadas. Para alterar, ajuste na conta bancária e redistribua.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRedistribuir}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Redistribuir</span>
          </button>

          <button
            type="button"
            onClick={onExcluirUnidade}
            className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold rounded-xl transition-colors"
          >
            Excluir Unidade
          </button>
        </div>
      </div>

      {/* Table Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Lançamentos Distribuídos ({entries.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mapeamento de débito, crédito e histórico padrão conforme regras contábeis
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            Total da Unidade: <span className="text-cyan-500">R$ {Core.formatBR(totalValor)}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Histórico / Descrição</th>
                <th className="py-2.5 px-3 font-mono">Débito</th>
                <th className="py-2.5 px-3 font-mono">Crédito</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3 font-mono">HP</th>
                <th className="py-2.5 px-3">Doc</th>
                <th className="py-2.5 px-3">Origem / Banco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Nenhum lançamento distribuído para esta unidade ainda. Clique em "Redistribuir" ou distribua pelo Painel Master.
                  </td>
                </tr>
              ) : (
                entries.map((e, idx) => (
                  <tr key={e.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {e.data}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white max-w-[240px] truncate">
                      {e.descricao}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                      {e.debito || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-sky-600 dark:text-sky-400 font-bold">
                      {e.credito || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      R$ {Core.formatBR(e.valor)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{e.hp || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{e.documento || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-[140px]">
                      {e.origemContaNome || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
