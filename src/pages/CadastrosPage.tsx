import React, { useState } from 'react';
import { BookOpen, Search, Upload, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CadastroData } from '../types/finance';
import { Core } from '../engine';

interface CadastrosPageProps {
  cadastro: CadastroData;
  onImportarPlanilha: (cabecalho: string[], linhas: any[]) => void;
  onLimparCadastro: () => void;
}

export const CadastrosPage: React.FC<CadastrosPageProps> = ({
  cadastro,
  onImportarPlanilha,
  onLimparCadastro,
}) => {
  const [busca, setBusca] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (json.length > 0) {
        const header = (json[0] || []).map((h) => String(h || '').trim());
        const rows = json.slice(1).map((r) => {
          const obj: Record<string, string> = {};
          header.forEach((col, idx) => {
            obj[col] = String(r[idx] || '');
          });
          return obj;
        });
        onImportarPlanilha(header, rows);
      }
    } catch (err) {
      alert('Erro ao carregar planilha do cadastro.');
    }
  };

  const linhasFiltradas = cadastro.linhas.filter((row) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(termo));
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header & Actions */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{cadastro.titulo}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastro auxiliar sincronizado para autocomplete e validações contábeis
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-cyan-500" />
            <span>Importar da Planilha</span>
            <input type="file" accept=".xlsx,.xlsm,.xls" onChange={handleFile} className="hidden" />
          </label>

          <button
            type="button"
            onClick={onLimparCadastro}
            className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold rounded-xl transition-colors"
          >
            Limpar Este Cadastro
          </button>
        </div>
      </div>

      {/* Table Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar registros..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {linhasFiltradas.length} registro(s) exibido(s)
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {cadastro.cabecalho.map((col, idx) => (
                  <th key={idx} className="py-2.5 px-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {linhasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={cadastro.cabecalho.length || 1}
                    className="py-8 text-center text-slate-400 italic"
                  >
                    Nenhum registro encontrado. Importe a planilha deste cadastro pelo botão acima.
                  </td>
                </tr>
              ) : (
                linhasFiltradas.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {cadastro.cabecalho.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[250px] truncate"
                      >
                        {row[col] || '-'}
                      </td>
                    ))}
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
