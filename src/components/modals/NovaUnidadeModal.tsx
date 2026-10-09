import React, { useState } from 'react';
import { X, Network } from 'lucide-react';
import { Unit } from '../../types/finance';

interface NovaUnidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unidade: Omit<Unit, 'id'>) => void;
}

export const NovaUnidadeModal: React.FC<NovaUnidadeModalProps> = ({ isOpen, onClose, onSave }) => {
  const [nome, setNome] = useState('');
  const [codigoSci, setCodigoSci] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da unidade.');
      return;
    }

    onSave({
      nome: nome.trim(),
      codigoSci: codigoSci.trim() || undefined,
      cnpj: cnpj.trim() || undefined,
    });

    setNome('');
    setCodigoSci('');
    setCnpj('');
    setErro('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Nova Unidade / Filial</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Filial ou centro de custo com lançamentos próprios</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Nome da Unidade
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Filial Tubarão, Matriz, etc."
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Código SCI <span className="text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <input
                type="text"
                value={codigoSci}
                onChange={(e) => setCodigoSci(e.target.value)}
                placeholder="Ex.: 102"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                CNPJ <span className="text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Ex.: 00.000.000/0001-00"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 shadow-md shadow-cyan-500/20 rounded-xl"
            >
              Adicionar Unidade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
