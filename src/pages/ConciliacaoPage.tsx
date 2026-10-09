import React, { useState } from 'react';
import {
  FileCheck2,
  UploadCloud,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Trash2,
  FolderOpen,
  Download,
  Calendar,
  Layers,
  Building,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BankAccount, Entry } from '../types/finance';
import {
  ExtratoItem,
  ConciliacaoPar,
  ConciliacaoManualGrupo,
  FornecedorComparativo,
  ConciliacaoSalva,
} from '../types/reconciliation';
import { Core, Conciliacao, Extratos, PdfExtrato, Nfe } from '../engine';

interface ConciliacaoPageProps {
  contas: BankAccount[];
  getEntriesForAccount: (contaId: string) => Entry[];
  salvas: ConciliacaoSalva[];
  onSalvarConciliacao: (nome: string, dados: any) => void;
  onExcluirSalva: (id: string) => void;
}

export const ConciliacaoPage: React.FC<ConciliacaoPageProps> = ({
  contas,
  getEntriesForAccount,
  salvas,
  onSalvarConciliacao,
  onExcluirSalva,
}) => {
  const [modo, setModo] = useState<'conta' | 'avulso'>('conta');
  const [contaId, setContaId] = useState(contas[0]?.id || '');
  const [tolerancia, setTolerancia] = useState(3);
  const [extratoNome, setExtratoNome] = useState('');
  const [extratoItens, setExtratoItens] = useState<ExtratoItem[]>([]);
  const [pares, setPares] = useState<ConciliacaoPar[]>([]);
  const [gruposManuais, setGruposManuais] = useState<ConciliacaoManualGrupo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filtroTexto, setFiltroTexto] = useState('');

  // Modo avulso states
  const [avTipo, setAvTipo] = useState<'pagamentos' | 'recebimentos'>('pagamentos');
  const [avPlanilhaNome, setAvPlanilhaNome] = useState('');
  const [fornecedoresComp, setFornecedoresComp] = useState<FornecedorComparativo[]>([]);
  const [semFornecedorItens, setSemFornecedorItens] = useState<any[]>([]);
  const [filtroForn, setFiltroForn] = useState('pendentes');
  const [statusMsg, setStatusMsg] = useState('');

  // Executa conciliação modo conta
  const processarConciliacaoConta = (itensBanco: ExtratoItem[], idConta: string, tol: number) => {
    const sistemaEntries = getEntriesForAccount(idConta);
    if (!itensBanco || itensBanco.length === 0) return;

    const res = Conciliacao.conciliar(itensBanco, sistemaEntries, tol);
    const listaPares: ConciliacaoPar[] = [];

    // Casados
    (res.casados || []).forEach((c: any, i: number) => {
      listaPares.push({
        id: `par-casado-${i}`,
        banco: c.banco,
        sistema: c.sistema,
        situacao: c.tipo === 'data_diferente' ? 'data_diferente' : 'ok',
        diferencaDias: c.diferencaDias,
      });
    });

    // Só no banco
    (res.soBanco || []).forEach((b: any, i: number) => {
      listaPares.push({
        id: `par-banco-${i}`,
        banco: b,
        situacao: 'so_banco',
      });
    });

    // Só no sistema
    (res.soSistema || []).forEach((s: any, i: number) => {
      listaPares.push({
        id: `par-sistema-${i}`,
        sistema: s,
        situacao: 'so_sistema',
      });
    });

    setPares(listaPares);
  };

  const handleExtratoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtratoNome(file.name);
    setStatusMsg('Lendo arquivo de extrato...');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let itens: ExtratoItem[] = [];

      if (ext === 'pdf') {
        const pdfjs = (window as any).pdfjsLib;
        const buf = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const paginas = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const textContent = await page.getTextContent();
          paginas.push(
            textContent.items.map((i: any) => ({
              s: i.str,
              x: i.transform[4],
              y: i.transform[5],
              w: i.width,
            }))
          );
        }
        const r = PdfExtrato.lerExtratoPdf(paginas);
        itens = r.itens || [];
        if (r.numeroConta && !contaId) {
          const matchConta = Extratos.qualConta(r.numeroConta, contas);
          if (matchConta) setContaId(matchConta.id);
        }
      } else if (ext === 'ofx') {
        const txt = await file.text();
        const r = Extratos.lerExtratoOfx(txt);
        itens = r.itens || [];
      } else if (ext === 'txt') {
        let txt = await file.text();
        const r = Extratos.lerExtratoSicoob(txt);
        itens = r.itens || [];
      } else if (ext === 'csv') {
        const txt = await file.text();
        const r = Extratos.lerExtratoCsv(txt);
        itens = r.itens || [];
      } else if (['xlsx', 'xlsm', 'xls'].includes(ext || '')) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const r = Core.lerExtratoPlanilha(wb);
        itens = r.itens || [];
      }

      setExtratoItens(itens);
      setStatusMsg(`${itens.length} movimentações carregadas.`);
      processarConciliacaoConta(itens, contaId, tolerancia);
    } catch (err: any) {
      alert('Erro ao processar extrato: ' + err.message);
      setStatusMsg('');
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConciliarSelecionados = () => {
    if (selectedIds.size === 0) return;
    const selecionados = pares.filter((p) => selectedIds.has(p.id));

    // Soma valores do banco vs sistema
    const somaBanco = selecionados.reduce((acc, p) => acc + (p.banco?.valor || 0), 0);
    const somaSistema = selecionados.reduce((acc, p) => acc + (p.sistema?.valor || 0), 0);

    let motivo = '';
    if (Math.abs(somaBanco - somaSistema) > 0.01) {
      motivo = prompt('Os valores não batem exatamente. Informe a justificativa:') || '';
      if (!motivo) return;
    }

    const novoGrupoId = `grupo-${Date.now()}`;
    const novosPares = pares.map((p) => {
      if (selectedIds.has(p.id)) {
        return {
          ...p,
          situacao: 'manual' as any,
          obs: motivo || 'Conciliado manualmente',
          manualGrupoId: novoGrupoId,
        };
      }
      return p;
    });

    setPares(novosPares);
    setSelectedIds(new Set());
  };

  const handleMarcarConferido = () => {
    if (selectedIds.size === 0) return;
    const motivo = prompt('Observação da conferência (ex.: tarifa bancária sem par):') || 'Conferido avulso';
    const novosPares = pares.map((p) => {
      if (selectedIds.has(p.id)) {
        return {
          ...p,
          situacao: 'conferido' as any,
          obs: motivo,
        };
      }
      return p;
    });
    setPares(novosPares);
    setSelectedIds(new Set());
  };

  const handleExportCsv = () => {
    const linhas = [
      'Data Banco;Historico Banco;Valor Banco;Sinal Banco;Situacao;Data Sistema;Descricao Sistema;Valor Sistema;Obs',
    ];
    pares.forEach((p) => {
      linhas.push(
        [
          p.banco?.data || '',
          `"${(p.banco?.historico || '').replace(/"/g, '""')}"`,
          p.banco?.valor ? Core.formatBR(p.banco.valor) : '',
          p.banco?.sinal || '',
          p.situacao,
          p.sistema?.data || '',
          `"${(p.sistema?.descricao || '').replace(/"/g, '""')}"`,
          p.sistema?.valor ? Core.formatBR(p.sistema.valor) : '',
          `"${(p.obs || '').replace(/"/g, '""')}"`,
        ].join(';')
      );
    });

    const blob = new Blob(['\ufeff' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciliacao-${contaId || 'avulsa'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paresFiltrados = pares.filter((p) => {
    if (!filtroTexto.trim()) return true;
    const termo = filtroTexto.toLowerCase();
    const txtBanco = (p.banco?.historico || '') + (p.banco?.documento || '');
    const txtSistema = (p.sistema?.descricao || '') + (p.sistema?.nome || '') + (p.sistema?.cpf || '');
    return txtBanco.toLowerCase().includes(termo) || txtSistema.toLowerCase().includes(termo);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Header & Mode Toggle */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Conciliação Bancária
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cruze movimentações bancárias (PDF, OFX, TXT Sicoob) com os lançamentos contábeis
              </p>
            </div>
          </div>
        </div>

        {/* Mode Segmented Controls */}
        <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setModo('conta')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              modo === 'conta'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Conta do Sistema
          </button>
          <button
            type="button"
            onClick={() => setModo('avulso')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              modo === 'avulso'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Extrato × Planilha / Balancete / NF-e
          </button>
        </div>
      </div>

      {/* Mode Controls Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {modo === 'conta' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Conta Bancária
              </label>
              <select
                value={contaId}
                onChange={(e) => {
                  setContaId(e.target.value);
                  if (extratoItens.length > 0) processarConciliacaoConta(extratoItens, e.target.value, tolerancia);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Extrato Bancário (PDF, OFX, TXT, CSV)
              </label>
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 hover:border-cyan-500 rounded-xl text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <UploadCloud className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                <span className="truncate">{extratoNome || 'Escolher extrato'}</span>
                <input
                  type="file"
                  accept=".pdf,.ofx,.txt,.csv,.xlsx,.xlsm,.xls"
                  onChange={handleExtratoFile}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tolerância de Data
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={tolerancia}
                  onChange={(e) => {
                    const tol = parseInt(e.target.value, 10) || 0;
                    setTolerancia(tol);
                    if (extratoItens.length > 0) processarConciliacaoConta(extratoItens, contaId, tol);
                  }}
                  className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-500">dias</span>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPares([]);
                  setExtratoNome('');
                  setExtratoItens([]);
                  setSelectedIds(new Set());
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={pares.length === 0}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-500" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Cruza o extrato com planilha externa de fornecedores/clientes, com o Balancete do SCI Único ou XMLs de NF-e (.xml ou .zip).
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Natureza da Planilha
                </label>
                <select
                  value={avTipo}
                  onChange={(e) => setAvTipo(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="pagamentos">Pagamentos a Fornecedores</option>
                  <option value="recebimentos">Recebimentos de Clientes</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  1. Extrato Bancário
                </label>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 hover:border-cyan-500 rounded-xl text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <UploadCloud className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                  <span className="truncate">{extratoNome || 'Escolher extrato'}</span>
                  <input
                    type="file"
                    accept=".pdf,.ofx,.txt,.csv,.xlsx,.xlsm,.xls"
                    onChange={handleExtratoFile}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  2. Planilha, Balancete ou NF-e (.xml/.zip)
                </label>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 hover:border-cyan-500 rounded-xl text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <UploadCloud className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <span className="truncate">{avPlanilhaNome || 'Escolher planilha ou XMLs'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xlsm,.xls,.csv,.xml,.zip"
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Select Floating Toolbar */}
      {selectedIds.size > 0 && (
        <div className="p-4 rounded-2xl bg-cyan-600 text-white shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="text-xs font-bold flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/20">{selectedIds.size}</span>
            <span>itens selecionados para conciliação manual</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConciliarSelecionados}
              className="px-3.5 py-1.5 bg-white text-cyan-800 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
            >
              Conciliar Selecionados
            </button>
            <button
              type="button"
              onClick={handleMarcarConferido}
              className="px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Marcar como Conferido
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-white/80 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Main Reconciliation Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Resultado do Cruzamento ({pares.length} pares)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verde = Bateu • Ciano = Data próxima • Laranja/Roxo = Pendente de par
            </p>
          </div>

          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Filtrar por texto, valor ou doc..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="w-8 py-2.5 px-3"></th>
                <th colSpan={3} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700">
                  Extrato do Banco
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700">
                  Situação
                </th>
                <th colSpan={3} className="py-2.5 px-3">
                  Lançado no Sistema
                </th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-semibold text-slate-400">
                <th className="w-8 py-2 px-3"></th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Histórico</th>
                <th className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-700">Valor</th>
                <th className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700">Status</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3 text-right">Valor</th>
                <th className="py-2 px-3">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Nenhuma movimentação carregada. Selecione um extrato acima para rodar a conciliação automática.
                  </td>
                </tr>
              ) : (
                paresFiltrados.map((p) => {
                  const isChecked = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-cyan-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(p.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-500"
                        />
                      </td>

                      {/* Banco */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {p.banco?.data || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                        {p.banco?.historico || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {p.banco ? `R$ ${Core.formatBR(p.banco.valor)}` : '-'}
                      </td>

                      {/* Situação */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {p.situacao === 'ok' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            ✓ Conciliado
                          </span>
                        )}
                        {p.situacao === 'data_diferente' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                            ± Data ({p.diferencaDias}d)
                          </span>
                        )}
                        {p.situacao === 'so_banco' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Só no Banco
                          </span>
                        )}
                        {p.situacao === 'so_sistema' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            Só no Sistema
                          </span>
                        )}
                        {p.situacao === 'manual' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                            Manual: {p.obs}
                          </span>
                        )}
                        {p.situacao === 'conferido' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                            Conferido
                          </span>
                        )}
                      </td>

                      {/* Sistema */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {p.sistema?.data || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {p.sistema ? `R$ ${Core.formatBR(p.sistema.valor)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                        {p.sistema?.descricao || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
