import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Download,
  CheckCircle2,
  Building2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react';
import { Entry, BankAccount, Unit } from '../types/finance';
import { Core, Integracao } from '../engine';

interface LedgerPageProps {
  conta: BankAccount;
  unidades: Unit[];
  entries: Entry[];
  naturezasOptions: string[];
  nomesOptions: string[];
  onSaveEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string) => void;
  onClearEntries: () => void;
  onDeleteAccount: () => void;
  onConfirmSuggestions: () => void;
  onImportExtrato: () => void;
  onEditContaContabil: (novaConta: string) => void;
}

export const LedgerPage: React.FC<LedgerPageProps> = ({
  conta,
  unidades,
  entries,
  naturezasOptions,
  nomesOptions,
  onSaveEntry,
  onDeleteEntry,
  onClearEntries,
  onDeleteAccount,
  onConfirmSuggestions,
  onImportExtrato,
  onEditContaContabil,
}) => {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataMovimento, setDataMovimento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [documento, setDocumento] = useState('');
  const [modelo, setModelo] = useState('PIX');
  const [valorStr, setValorStr] = useState('');
  const [sinal, setSinal] = useState<'C' | 'D'>('D');
  const [categoria, setCategoria] = useState('Despesa');
  const [unidade, setUnidade] = useState(unidades[0]?.nome || 'Matriz');
  const [natureza, setNatureza] = useState('');
  const [contaContabil, setContaContabil] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const categorias = ['Recebimento', 'Despesa', 'Pagamento', 'Aplicações', 'Resgate'];
  const modelosDoc = ['NF', 'NFS-E', 'NFE', 'NFCE', 'REC', 'BOL', 'TED', 'DOC', 'PIX', 'OUT'];

  const temSugestoes = entries.some((e) => e.sugerido);

  // Calcula totais
  const totalC = entries
    .filter((e) => e.sinal === 'C')
    .reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalD = entries
    .filter((e) => e.sinal === 'D')
    .reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const saldoLiquido = totalC - totalD;

  const handleEditClick = (e: Entry) => {
    setEditingId(e.id);
    setData(e.data);
    setDataMovimento(e.dataMovimento || '');
    setDescricao(e.descricao);
    setDocumento(e.documento || '');
    setModelo(e.modelo || 'PIX');
    setValorStr(Core.formatBR(e.valor));
    setSinal(e.sinal);
    setCategoria(e.categoria || 'Despesa');
    setUnidade(e.unidade || (unidades[0]?.nome || 'Matriz'));
    setNatureza(e.natureza || '');
    setContaContabil(e.conta || '');
    setNome(e.nome || '');
    setCpf(e.cpf || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDescricao('');
    setDocumento('');
    setValorStr('');
    setNatureza('');
    setContaContabil('');
    setNome('');
    setCpf('');
    setErro('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = Core.parseValor(valorStr);
    if (!data || !descricao.trim() || isNaN(v) || v <= 0) {
      setErro('Preencha os campos obrigatórios: Data, Descrição e Valor válido.');
      return;
    }

    const entryToSave: Entry = {
      id: editingId || `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      data,
      dataMovimento: dataMovimento || undefined,
      descricao: descricao.trim(),
      documento: documento.trim() || undefined,
      modelo: modelo || undefined,
      valor: v,
      sinal,
      categoria,
      unidade,
      natureza: natureza.trim(),
      conta: contaContabil.trim(),
      nome: nome.trim(),
      cpf: cpf.trim(),
      origemContaId: conta.id,
      origemContaNome: conta.nome,
    };

    onSaveEntry(entryToSave);
    handleCancelEdit();
  };

  const handleCopyExcel = () => {
    const tsv = Core.toTsv(entries);
    navigator.clipboard.writeText(tsv).then(() => {
      setToastMsg('Copiado para o Excel com sucesso!');
      setTimeout(() => setToastMsg(''), 3000);
    });
  };

  const handleExportCsv = () => {
    const csv = Core.toCsv(entries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancamentos-${conta.numeroConta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Conta Header & Actions */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{conta.nome}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Banco: <strong>{conta.banco}</strong> • Conta: <strong>{conta.numeroConta}</strong> •
                Conta Contábil Único: <strong>{conta.contaContabil}</strong>
                {conta.agencia && ` • Agência: ${conta.agencia}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onImportExtrato}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Importar Extrato
          </button>

          {temSugestoes && (
            <button
              type="button"
              onClick={onConfirmSuggestions}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Confirmar Sugestões</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const nova = prompt('Nova conta contábil no SCI Único:', conta.contaContabil);
              if (nova && nova.trim()) onEditContaContabil(nova.trim());
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Editar Cta Contábil
          </button>

          <button
            type="button"
            onClick={onClearEntries}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
          >
            Limpar Lançamentos
          </button>

          <button
            type="button"
            onClick={onDeleteAccount}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            Excluir Conta
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Form Lançamento */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Data, histórico e valor são obrigatórios. Sem categoria e unidade, fica como pendente.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancelar edição
            </button>
          )}
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 text-xs rounded-xl font-medium">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Data
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Data do Movimento <span className="lowercase font-normal text-slate-400">(opc)</span>
              </label>
              <input
                type="date"
                value={dataMovimento}
                onChange={(e) => setDataMovimento(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Descrição / Histórico
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: PIX RECEBIDO - CLIENTE X"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Documento
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ex.: 12345"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Modelo Documento
              </label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {modelosDoc.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Valor & Sinal (C / D)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorStr}
                  onChange={(e) => setValorStr(e.target.value)}
                  placeholder="0,00"
                  required
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setSinal('C')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      sinal === 'C'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    C (Entrada)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSinal('D')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      sinal === 'D'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    D (Saída)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Unidade
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.nome}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Natureza do Gasto
              </label>
              <input
                type="text"
                list="list-naturezas"
                value={natureza}
                onChange={(e) => setNatureza(e.target.value)}
                placeholder="Ex.: Despesas Bancárias"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <datalist id="list-naturezas">
                {naturezasOptions.map((n, i) => (
                  <option key={i} value={n} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Conta Contábil
              </label>
              <input
                type="text"
                value={contaContabil}
                onChange={(e) => setContaContabil(e.target.value)}
                placeholder="Ex.: 502"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Fornecedor ou Cliente
              </label>
              <input
                type="text"
                list="list-nomes"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Razão Social"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <datalist id="list-nomes">
                {nomesOptions.map((nm, i) => (
                  <option key={i} value={nm} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                CPF / CNPJ
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'Salvar Alteração' : 'Adicionar Lançamento'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Lançamentos Table Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Lançamentos Registrados ({entries.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Movimentações bancárias classificadas para integração
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyExcel}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-500" />
              <span>Copiar p/ Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-500" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Table Wrap */}
        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Histórico / Descrição</th>
                <th className="py-2.5 px-3">Doc</th>
                <th className="py-2.5 px-3">Mod</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Unidade</th>
                <th className="py-2.5 px-3">Natureza</th>
                <th className="py-2.5 px-3">Conta</th>
                <th className="py-2.5 px-3">Favorecido / CNPJ</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    Nenhum lançamento nesta conta bancária. Adicione pelo formulário acima ou importe um extrato.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      entry.sugerido ? 'bg-cyan-500/[0.03]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      {entry.data}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white max-w-[220px] truncate">
                      {entry.descricao}
                      {entry.sugerido && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                          Sugerido
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{entry.documento || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{entry.modelo || '-'}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                        entry.sinal === 'C'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {entry.sinal === 'C' ? '+' : '-'} {Core.formatBR(entry.valor)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {entry.categoria || <span className="text-amber-500 font-bold">Pendente</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {entry.unidade || <span className="text-amber-500 font-bold">Pendente</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                      {entry.natureza || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {entry.conta || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                      {entry.nome || entry.cpf || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(entry)}
                          title="Editar Lançamento"
                          className="p-1 rounded text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry.id)}
                          title="Excluir Lançamento"
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totais do Rodapé */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div>
            Total de Lançamentos: <span className="font-mono font-bold">{entries.length}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
              <span>Entradas (C):</span>
              <span className="font-mono font-bold">R$ {Core.formatBR(totalC)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
              <span>Saídas (D):</span>
              <span className="font-mono font-bold">R$ {Core.formatBR(totalD)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold pl-4 border-l border-slate-200 dark:border-slate-800">
              <span>Saldo do Mês:</span>
              <span className={`font-mono ${saldoLiquido >= 0 ? 'text-cyan-500' : 'text-rose-500'}`}>
                R$ {Core.formatBR(saldoLiquido)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
