import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { BankAccount } from '../../types/finance';

interface NovaContaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (conta: Omit<BankAccount, 'id'>) => void;
}

const BANCOS_POPULARES = [
  'Sicoob',
  'Sicredi',
  'Caixa Econômica',
  'Banco do Brasil',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banrisul',
  'Nubank',
  'Inter',
  'Outro',
];

export const NovaContaModal: React.FC<NovaContaModalProps> = ({ isOpen, onClose, onSave }) => {
  const [banco, setBanco] = useState('Sicoob');
  const [outroBanco, setOutroBanco] = useState('');
  const [numeroConta, setNumeroConta] = useState('');
  const [contaContabil, setContaContabil] = useState('');
  const [agencia, setAgencia] = useState('');
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bancoFinal = banco === 'Outro' ? outroBanco.trim() : banco;
    if (!bancoFinal) {
      setErro('Informe o nome do banco.');
      return;
    }
    if (!numeroConta.trim()) {
      setErro('Informe o número da conta bancária.');
      return;
    }
    if (!contaContabil.trim()) {
      setErro('Informe a conta contábil no SCI Único.');
      return;
    }

    const nomeFormatado = `${bancoFinal} ${numeroConta.trim()} Conta ${contaContabil.trim()}`;

    onSave({
      nome: nomeFormatado,
      banco: bancoFinal,
      numeroConta: numeroConta.trim(),
      contaContabil: contaContabil.trim(),
      agencia: agencia.trim() || undefined,
    });

    // Reset
    setNumeroConta('');
    setContaContabil('');
    setAgencia('');
    setOutroBanco('');
    setErro('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Nova Conta Bancária</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cadastre a conta corrente e seu código no SCI Único</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
              Instituição Bancária
            </label>
            <select
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            >
              {BANCOS_POPULARES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {banco === 'Outro' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Nome do Banco
              </label>
              <input
                type="text"
                value={outroBanco}
                onChange={(e) => setOutroBanco(e.target.value)}
                placeholder="Ex.: BTG Pactual, Safra, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Número da Conta
              </label>
              <input
                type="text"
                value={numeroConta}
                onChange={(e) => setNumeroConta(e.target.value)}
                placeholder="Ex.: 24402-3"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Conta Contábil (Único)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={contaContabil}
                onChange={(e) => setContaContabil(e.target.value)}
                placeholder="Ex.: 643"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Agência <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <input
              type="text"
              value={agencia}
              onChange={(e) => setAgencia(e.target.value)}
              placeholder="Ex.: 3078"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 shadow-md shadow-cyan-500/20 rounded-xl transition-all"
            >
              Adicionar Conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
