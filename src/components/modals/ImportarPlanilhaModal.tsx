import React, { useState } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertTriangle, UploadCloud, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Importacao } from '../../engine';

interface ImportarPlanilhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resultado: any, competencia: string, atualizarCadastros: boolean) => void;
}

export const ImportarPlanilhaModal: React.FC<ImportarPlanilhaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [competencia, setCompetencia] = useState('');
  const [atualizarCadastros, setAtualizarCadastros] = useState(true);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    setCarregando(true);
    setErro('');
    setResultado(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const res = Importacao.lerPlanilha(wb);

      if (!res.contas || res.contas.length === 0) {
        setErro('Nenhuma conta bancária reconhecida nesta planilha (abas terminadas em "Conta <número>").');
        setCarregando(false);
        return;
      }

      setResultado(res);
      if (res.mesSugerido) {
        setCompetencia(res.mesSugerido);
      } else {
        const d = new Date();
        setCompetencia(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    } catch (err: any) {
      console.error(err);
      setErro('Falha ao processar arquivo: ' + (err.message || 'formato inválido'));
    } finally {
      setCarregando(false);
    }
  };

  const handleImportar = () => {
    if (!resultado || !competencia) return;
    onConfirm(resultado, competencia, atualizarCadastros);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setNomeArquivo('');
    setCarregando(false);
    setResultado(null);
    setCompetencia('');
    setErro('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Importar Planilha do Mês</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Processamento integral (.xlsm ou .xlsx) com leitura automática de contas e cadastros</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { handleReset(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-all">
            <input
              type="file"
              id="file-planilha-input"
              accept=".xlsm,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-planilha-input" className="cursor-pointer flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Clique para selecionar a planilha mensal
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Compatível com versões v19 a v30 (.xlsm, .xlsx)
              </span>
              {nomeArquivo && (
                <span className="inline-block mt-3 px-3 py-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-semibold rounded-lg">
                  {nomeArquivo}
                </span>
              )}
            </label>
          </div>

          {carregando && (
            <div className="flex items-center justify-center py-6 gap-3 text-cyan-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-semibold">Analisando pasta de trabalho e validando abas...</span>
            </div>
          )}

          {erro && (
            <div className="p-4 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {resultado && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Planilha reconhecida com sucesso!</span>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div><strong>Contas bancárias:</strong> {resultado.contas.map((c: any) => c.nome).join(', ')}</div>
                  {resultado.avisos && resultado.avisos.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ {resultado.avisos.length} avisos ou itens requerem conferência.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Competência (Mês)
                  </label>
                  <input
                    type="month"
                    value={competencia}
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={atualizarCadastros}
                      onChange={(e) => setAtualizarCadastros(e.target.checked)}
                      className="w-4 h-4 text-cyan-500 rounded border-slate-300 dark:border-slate-700 focus:ring-cyan-500"
                    />
                    <span>Atualizar cadastros (clientes, fornecedores, tabelas)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => { handleReset(); onClose(); }}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImportar}
            disabled={!resultado || !competencia}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 rounded-xl"
          >
            Confirmar Importação
          </button>
        </div>
      </div>
    </div>
  );
};
