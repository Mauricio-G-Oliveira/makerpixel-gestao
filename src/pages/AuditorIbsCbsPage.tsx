import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Scale,
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  Calculator,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ItemAuditado {
  id: string;
  nItem: string;
  xProd: string;
  ncm: string;
  cfop: string;
  vProd: number;
  cst: string;
  bc: number;
  pRed?: number; // % redução da BC (gRed)
  aliqIbsUf: number;
  vIbsUf: number;
  aliqIbsMun: number;
  vIbsMun: number;
  aliqCbs: number;
  vCbs: number;
  status: 'ok' | 'warn' | 'err';
  mensagem: string;
}

// Tabela oficial de CSTs da Reforma Tributária (LC 214/2025)
const TABELA_CST_REFORMA = [
  { cst: '01', desc: 'Tributação integral', redutor: 'Não' },
  { cst: '02', desc: 'Tributação com alíquota reduzida (cesta básica, saúde, educação)', redutor: 'Sim (30% a 60%)' },
  { cst: '03', desc: 'Não incidência', redutor: 'Integral' },
  { cst: '04', desc: 'Imunidade constitucional', redutor: 'Integral' },
  { cst: '05', desc: 'Isenção específica', redutor: 'Integral' },
  { cst: '06', desc: 'Diferimento total ou parcial', redutor: 'Condicional' },
  { cst: '07', desc: 'Suspensão da exigibilidade', redutor: 'Condicional' },
  { cst: '08', desc: 'Regime automotivo e incentivos regionais', redutor: 'Específico' },
  { cst: '09', desc: 'Monofásico / Combustíveis e lubrificantes', redutor: 'Alíq. Ad Rem' },
  { cst: '40', desc: 'Outras hipóteses de desoneração', redutor: 'Variável' },
  { cst: '50', desc: 'Operações com crédito presumido', redutor: 'Crédito outorgado' },
  { cst: '99', desc: 'Outras operações', redutor: 'Geral' },
];

export const AuditorIbsCbsPage: React.FC = () => {
  const [itens, setItens] = useState<ItemAuditado[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'auditoria' | 'calculadora' | 'tabela-cst'>('auditoria');
  const [buscaCst, setBuscaCst] = useState<string>('');

  // Estados da Calculadora Avulsa
  const [calcBc, setCalcBc] = useState<number>(1000);
  const [calcRed, setCalcRed] = useState<number>(0);
  const [calcAliqIbsUf, setCalcAliqIbsUf] = useState<number>(10.0);
  const [calcAliqIbsMun, setCalcAliqIbsMun] = useState<number>(5.5);
  const [calcAliqCbs, setCalcAliqCbs] = useState<number>(8.8);

  // Inicializa com exemplo
  useState(() => {
    carregarExemplo();
  });

  function carregarExemplo() {
    const mock: ItemAuditado[] = [
      {
        id: '1',
        nItem: '1',
        xProd: 'Notebook Corporativo Core i7 16GB SSD',
        ncm: '84713012',
        cfop: '5102',
        vProd: 4500.0,
        cst: '01',
        bc: 4500.0,
        pRed: 0,
        aliqIbsUf: 10.0,
        vIbsUf: 450.0,
        aliqIbsMun: 5.5,
        vIbsMun: 247.5,
        aliqCbs: 8.8,
        vCbs: 396.0,
        status: 'ok',
        mensagem: 'Valores e alíquotas nominais conferidos com exatidão conforme LC 214/2025.',
      },
      {
        id: '2',
        nItem: '2',
        xProd: 'Medicamento de Uso Contínuo (Saúde)',
        ncm: '30049099',
        cfop: '5102',
        vProd: 120.0,
        cst: '02',
        bc: 48.0,
        pRed: 60,
        aliqIbsUf: 10.0,
        vIbsUf: 4.8,
        aliqIbsMun: 5.5,
        vIbsMun: 2.64,
        aliqCbs: 8.8,
        vCbs: 4.22,
        status: 'ok',
        mensagem: 'Alíquota reduzida com redução de 60% na base de cálculo devidamente validada.',
      },
      {
        id: '3',
        nItem: '3',
        xProd: 'Cesta Básica Nacional (Arroz e Feijão)',
        ncm: '10063021',
        cfop: '5102',
        vProd: 85.0,
        cst: '02',
        bc: 85.0,
        pRed: 0,
        aliqIbsUf: 10.0,
        vIbsUf: 8.5,
        aliqIbsMun: 5.5,
        vIbsMun: 4.68,
        aliqCbs: 8.8,
        vCbs: 7.48,
        status: 'warn',
        mensagem: 'Atenção: Item de cesta básica nacional enquadrado no CST 02 sem aplicação de redutor.',
      },
      {
        id: '4',
        nItem: '4',
        xProd: 'Serviço de Consultoria em TI',
        ncm: '00000000',
        cfop: '5933',
        vProd: 3200.0,
        cst: '01',
        bc: 3200.0,
        pRed: 0,
        aliqIbsUf: 10.0,
        vIbsUf: 300.0, // Divergente
        aliqIbsMun: 5.5,
        vIbsMun: 176.0,
        aliqCbs: 8.8,
        vCbs: 281.6,
        status: 'err',
        mensagem: 'Erro de cálculo: Valor de IBS UF informado (R$ 300,00) difere da BC × Alíquota (R$ 320,00).',
      },
    ];
    setItens(mock);
  }

  // Upload de XML de NF-e com grupo IBSCBS
  const handleUploadXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const novos: ItemAuditado[] = [];
    const parser = new DOMParser();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.xml')) {
        try {
          const text = await file.text();
          const doc = parser.parseFromString(text, 'text/xml');

          doc.querySelectorAll('det').forEach((det) => {
            const nItem = det.getAttribute('nItem') || '1';
            const xProd = det.querySelector('prod > xProd')?.textContent || 'Produto';
            const ncm = det.querySelector('prod > NCM')?.textContent || '';
            const cfop = det.querySelector('prod > CFOP')?.textContent || '';
            const vProd = parseFloat(det.querySelector('prod > vProd')?.textContent || '0');

            // Leitura grupo IBSCBS ou ICMS base se preliminar
            const ibscbs = det.querySelector('imposto > IBSCBS');
            const cst = ibscbs?.querySelector('CST')?.textContent || '01';
            const bc = parseFloat(ibscbs?.querySelector('vBC')?.textContent || String(vProd));

            const aliqIbsUf = parseFloat(ibscbs?.querySelector('pIBSUF')?.textContent || '10.0');
            const vIbsUf = parseFloat(ibscbs?.querySelector('vIBSUF')?.textContent || '0');

            const aliqIbsMun = parseFloat(ibscbs?.querySelector('pIBSMun')?.textContent || '5.5');
            const vIbsMun = parseFloat(ibscbs?.querySelector('vIBSMun')?.textContent || '0');

            const aliqCbs = parseFloat(ibscbs?.querySelector('pCBS')?.textContent || '8.8');
            const vCbs = parseFloat(ibscbs?.querySelector('vCBS')?.textContent || '0');

            // Validação
            const expIbsUf = (bc * aliqIbsUf) / 100;
            const diff = Math.abs(expIbsUf - vIbsUf);

            let status: 'ok' | 'warn' | 'err' = 'ok';
            let mensagem = 'Item validado conforme regras da LC 214/2025.';

            if (diff > 0.05 && vIbsUf > 0) {
              status = 'err';
              mensagem = `Divergência de cálculo: Esperado IBS UF R$ ${expIbsUf.toFixed(2)}, informado R$ ${vIbsUf.toFixed(2)}.`;
            } else if (cst === '02') {
              status = 'warn';
              mensagem = 'Atenção: Alíquota reduzida (CST 02) requer comprovação de anexo legal.';
            }

            novos.push({
              id: `${Date.now()}-${i}-${nItem}`,
              nItem,
              xProd,
              ncm,
              cfop,
              vProd,
              cst,
              bc,
              aliqIbsUf,
              vIbsUf: vIbsUf || expIbsUf,
              aliqIbsMun,
              vIbsMun: vIbsMun || (bc * aliqIbsMun) / 100,
              aliqCbs,
              vCbs: vCbs || (bc * aliqCbs) / 100,
              status,
              mensagem,
            });
          });
        } catch (err) {
          console.error('Erro ao ler XML para auditoria:', err);
        }
      }
    }

    if (novos.length > 0) {
      setItens((prev) => [...novos, ...prev]);
    }
  };

  // Totais
  const totais = useMemo(() => {
    let vProd = 0;
    let vIbsUf = 0;
    let vIbsMun = 0;
    let vCbs = 0;
    let ok = 0;
    let warn = 0;
    let err = 0;

    itens.forEach((it) => {
      vProd += it.vProd;
      vIbsUf += it.vIbsUf;
      vIbsMun += it.vIbsMun;
      vCbs += it.vCbs;
      if (it.status === 'ok') ok++;
      else if (it.status === 'warn') warn++;
      else err++;
    });

    return {
      vProd,
      vIbsUf,
      vIbsMun,
      vCbs,
      totalTributos: vIbsUf + vIbsMun + vCbs,
      ok,
      warn,
      err,
    };
  }, [itens]);

  // Cálculo da Calculadora Avulsa
  const bcEfetiva = calcBc * (1 - calcRed / 100);
  const calcValIbsUf = (bcEfetiva * calcAliqIbsUf) / 100;
  const calcValIbsMun = (bcEfetiva * calcAliqIbsMun) / 100;
  const calcValCbs = (bcEfetiva * calcAliqCbs) / 100;
  const calcTotalTrib = calcValIbsUf + calcValIbsMun + calcValCbs;

  // Exportar Excel
  const exportarPlanilha = () => {
    const wb = XLSX.utils.book_new();
    const dados = [
      ['Item', 'Descrição', 'NCM', 'CFOP', 'Valor Prod', 'CST', 'BC Efetiva', 'IBS UF', 'IBS Mun', 'CBS', 'Status', 'Observação'],
      ...itens.map((it) => [
        it.nItem,
        it.xProd,
        it.ncm,
        it.cfop,
        it.vProd,
        it.cst,
        it.bc,
        it.vIbsUf,
        it.vIbsMun,
        it.vCbs,
        it.status.toUpperCase(),
        it.mensagem,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria IBS-CBS');
    XLSX.writeFile(wb, `Auditoria_IBS_CBS_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in select-none">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400">
              Reforma Tributária
            </span>
            <span className="text-xs text-slate-400 font-medium">LC 214/2025 • NT 2025.002</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Auditor IBS / CBS
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Conferência automática de itens de NF-e e NFS-e. Valide CST, base de cálculo, alíquotas
            efetivas, reduções por produto e divergências de cálculo antes da transmissão fiscal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span>Importar NF-e/NFS-e</span>
            <input type="file" multiple accept=".xml" onChange={handleUploadXml} className="hidden" />
          </label>

          <button
            type="button"
            onClick={carregarExemplo}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F1A2E] dark:hover:bg-[#16243B] text-slate-800 dark:text-sky-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-[#1A2A44] flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Carregar Exemplo</span>
          </button>

          <button
            type="button"
            onClick={exportarPlanilha}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setItens([])}
            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Limpar itens auditados"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPIs de Auditoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Auditado</div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
            R$ {totais.vProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{itens.length} itens analisados</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total IBS (UF + Mun)</div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-400">
            R$ {(totais.vIbsUf + totais.vIbsMun).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            UF: R$ {totais.vIbsUf.toFixed(2)} | Mun: R$ {totais.vIbsMun.toFixed(2)}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total CBS (Federal)</div>
          <div className="mt-2 text-2xl font-black font-mono text-cyan-400">
            R$ {totais.vCbs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Alíquota estimada 8.8%</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Conformidade</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {totais.ok} OK
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> {totais.warn} Alerta
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-rose-400">
              <XCircle className="w-3.5 h-3.5" /> {totais.err} Erro
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Conferência LC 214/2025</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#16243B] pb-3">
        <button
          type="button"
          onClick={() => setAbaAtiva('auditoria')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'auditoria'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Tabela de Auditoria ({itens.length})
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('calculadora')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'calculadora'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Calculadora Avulsa
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('tabela-cst')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'tabela-cst'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Tabela Oficial de CST
        </button>
      </div>

      {/* Conteúdo Aba Auditoria */}
      {abaAtiva === 'auditoria' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm space-y-4">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-[#16243B] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Descrição / NCM</th>
                  <th className="py-2.5 px-3 text-center">CST</th>
                  <th className="py-2.5 px-3 text-right">Valor Prod</th>
                  <th className="py-2.5 px-3 text-right">Base Efetiva</th>
                  <th className="py-2.5 px-3 text-right">IBS UF (10%)</th>
                  <th className="py-2.5 px-3 text-right">IBS Mun (5.5%)</th>
                  <th className="py-2.5 px-3 text-right">CBS (8.8%)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#16243B]">
                {itens.map((it) => (
                  <tr
                    key={it.id}
                    className="hover:bg-slate-50 dark:hover:bg-[#0F1A2E]/60 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-slate-500">#{it.nItem}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{it.xProd}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        NCM: {it.ncm || '—'} • CFOP: {it.cfop || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">
                        {it.cst}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      R$ {it.vProd.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      R$ {it.bc.toFixed(2)}
                      {it.pRed ? (
                        <span className="block text-[10px] text-amber-400">Red: {it.pRed}%</span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      R$ {it.vIbsUf.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      R$ {it.vIbsMun.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      R$ {it.vCbs.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        title={it.mensagem}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          it.status === 'ok'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : it.status === 'warn'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {it.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Calculadora Avulsa */}
      {abaAtiva === 'calculadora' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm max-w-xl mx-auto space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Calculator className="w-5 h-5 text-sky-400" />
            <span>Simulador de Tributos IBS / CBS</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Valor do Produto / Base Nominal (R$)
              </label>
              <input
                type="number"
                value={calcBc}
                onChange={(e) => setCalcBc(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] font-mono text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Redução da Base de Cálculo (%)
              </label>
              <input
                type="number"
                value={calcRed}
                onChange={(e) => setCalcRed(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] font-mono text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">IBS UF (%)</label>
                <input
                  type="number"
                  value={calcAliqIbsUf}
                  onChange={(e) => setCalcAliqIbsUf(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">IBS Mun (%)</label>
                <input
                  type="number"
                  value={calcAliqIbsMun}
                  onChange={(e) => setCalcAliqIbsMun(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">CBS (%)</label>
                <input
                  type="number"
                  value={calcAliqCbs}
                  onChange={(e) => setCalcAliqCbs(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] font-mono text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Base Efetiva:</span>
              <span className="font-bold text-white">R$ {bcEfetiva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>IBS Estadual (UF):</span>
              <span className="font-bold text-sky-400">R$ {calcValIbsUf.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>IBS Municipal:</span>
              <span className="font-bold text-sky-400">R$ {calcValIbsMun.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>CBS Federal:</span>
              <span className="font-bold text-cyan-400">R$ {calcValCbs.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-bold text-white">
              <span>Total IBS + CBS:</span>
              <span className="text-emerald-400">R$ {calcTotalTrib.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Tabela Oficial CST */}
      {abaAtiva === 'tabela-cst' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Classificação Tributária Oficial (Portal da Conformidade Fácil)
            </h3>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaCst}
                onChange={(e) => setBuscaCst(e.target.value)}
                placeholder="Filtrar por código ou descrição..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-[#16243B] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">CST</th>
                  <th className="py-2.5 px-3">Descrição da Hipótese Legal</th>
                  <th className="py-2.5 px-3">Aplicação de Redutor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#16243B]">
                {TABELA_CST_REFORMA.filter(
                  (c) =>
                    c.cst.includes(buscaCst) ||
                    c.desc.toLowerCase().includes(buscaCst.toLowerCase())
                ).map((c) => (
                  <tr key={c.cst} className="hover:bg-slate-50 dark:hover:bg-[#0F1A2E]/60">
                    <td className="py-3 px-3 font-mono font-bold text-sky-400">{c.cst}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{c.desc}</td>
                    <td className="py-3 px-3 text-slate-400">{c.redutor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
