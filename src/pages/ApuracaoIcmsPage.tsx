import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ItemNota {
  nItem: string;
  cProd: string;
  xProd: string;
  cfop: string;
  vProd: number;
  bc: number;
  aliq: number;
  icms: number;
  credSN: number;
  st?: boolean;
}

interface NotaFiscal {
  chave: string;
  nNF: string;
  mod: string;
  dhEmi: string;
  data: string; // YYYY-MM-DD
  tpNF: '0' | '1'; // 0 = entrada, 1 = saída
  emit: { doc: string; nome: string; uf: string };
  dest: { doc: string; nome: string; uf?: string };
  itens: ItemNota[];
  vNF: number;
  vBC: number;
  vICMS: number;
  cancelada: boolean;
}

// CFOPs que não entram por padrão
const DEFAULT_EXCL_E = new Set([
  '1551', '2551', '3551', '1556', '2556', '3556', '1403', '2403', '1405', '2405', '1406', '2406', '1407', '2407', '1653', '2653',
]);
const DEFAULT_EXCL_S = new Set(['5929', '6929']);

const EQUIV_MAP: Record<string, string> = {
  '5401': '1403',
  '5402': '1403',
  '5403': '1403',
  '5405': '1403',
  '6401': '2403',
  '6402': '2403',
  '6403': '2403',
  '6404': '2403',
};

function getCfopEntradaEquivalente(c: string): string {
  if (EQUIV_MAP[c]) return EQUIV_MAP[c];
  const prefix = c.charAt(0);
  const map: Record<string, string> = { '5': '1', '6': '2', '7': '3' };
  return map[prefix] ? map[prefix] + c.slice(1) : c;
}

export const ApuracaoIcmsPage: React.FC = () => {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [empresaAtiva, setEmpresaAtiva] = useState<string>('11222333000181');
  const [dataDe, setDataDe] = useState<string>('2026-09-01');
  const [dataAte, setDataAte] = useState<string>('2026-09-30');

  // Ajustes manuais
  const [saldoAnt, setSaldoAnt] = useState<number>(0);
  const [outCred, setOutCred] = useState<number>(0);
  const [outDeb, setOutDeb] = useState<number>(0);
  const [mostrarAjustes, setMostrarAjustes] = useState<boolean>(false);

  // Regras de exclusão personalizadas
  const [regrasPersonalizadas, setRegrasPersonalizadas] = useState<Record<string, boolean>>({});

  // Filtros de visualização
  const [abaAtiva, setAbaAtiva] = useState<'cfop' | 'notas' | 'diario'>('cfop');
  const [buscaNota, setBuscaNota] = useState<string>('');
  const [filtroTipoNota, setFiltroTipoNota] = useState<'todas' | 'saida' | 'entrada' | 'canceladas'>('todas');

  // Carrega exemplo inicial se vazio
  useEffect(() => {
    carregarExemplo();
  }, []);

  // Lista de empresas detectadas
  const empresasDetectadas = useMemo(() => {
    const map = new Map<string, { doc: string; nome: string; count: number }>();
    notas.forEach((n) => {
      if (n.emit.doc && n.emit.doc.length === 14) {
        const item = map.get(n.emit.doc) || { doc: n.emit.doc, nome: n.emit.nome, count: 0 };
        item.count++;
        map.set(n.emit.doc, item);
      }
      if (n.dest.doc && n.dest.doc.length === 14) {
        const item = map.get(n.dest.doc) || { doc: n.dest.doc, nome: n.dest.nome, count: 0 };
        item.count++;
        map.set(n.dest.doc, item);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [notas]);

  // Função para regra de inclusão do CFOP
  const isCfopIncluso = (direcao: 'S' | 'E', cfop: string) => {
    const key = `${direcao}:${cfop}`;
    if (key in regrasPersonalizadas) return regrasPersonalizadas[key];
    return direcao === 'S' ? !DEFAULT_EXCL_S.has(cfop) : !DEFAULT_EXCL_E.has(cfop);
  };

  const toggleCfopRegra = (direcao: 'S' | 'E', cfop: string) => {
    const key = `${direcao}:${cfop}`;
    const atual = isCfopIncluso(direcao, cfop);
    setRegrasPersonalizadas({ ...regrasPersonalizadas, [key]: !atual });
  };

  // Cálculo da Apuração
  const apuracaoCalculada = useMemo(() => {
    let debito = 0;
    let credito = 0;
    const cfopMap = new Map<
      string,
      {
        direcao: 'S' | 'E';
        cfop: string;
        qtdNotas: number;
        vContabil: number;
        vBC: number;
        vIcms: number;
        vCredSN: number;
        incluso: boolean;
      }
    >();

    const dailyMap = new Map<string, { deb: number; cred: number }>();

    notas.forEach((n) => {
      // Filtra período
      if (dataDe && n.data < dataDe) return;
      if (dataAte && n.data > dataAte) return;

      // Classifica direção relativa à empresa ativa
      let direcao: 'S' | 'E' | null = null;
      let terceiros = false;

      if (n.emit.doc === empresaAtiva) {
        direcao = n.tpNF === '0' ? 'E' : 'S';
      } else if (n.dest.doc === empresaAtiva) {
        direcao = n.tpNF === '1' ? 'E' : 'S';
        terceiros = true;
      }

      if (!direcao) return;

      let apurNota = 0;

      n.itens.forEach((it) => {
        const cfop = direcao === 'E' && terceiros ? getCfopEntradaEquivalente(it.cfop) : it.cfop;
        const key = `${direcao}:${cfop}`;
        const incluso = isCfopIncluso(direcao, cfop);

        let group = cfopMap.get(key);
        if (!group) {
          group = {
            direcao,
            cfop,
            qtdNotas: 0,
            vContabil: 0,
            vBC: 0,
            vIcms: 0,
            vCredSN: 0,
            incluso,
          };
          cfopMap.set(key, group);
        }

        group.vContabil += it.vProd;
        group.vBC += it.bc;
        group.vIcms += it.icms;
        group.vCredSN += it.credSN;

        if (!n.cancelada && incluso) {
          const valorImposto = direcao === 'E' ? (it.icms > 0 ? it.icms : it.credSN) : it.icms;
          apurNota += valorImposto;
        }
      });

      if (!n.cancelada) {
        if (direcao === 'S') debito += apurNota;
        else credito += apurNota;

        const d = dailyMap.get(n.data) || { deb: 0, cred: 0 };
        if (direcao === 'S') d.deb += apurNota;
        else d.cred += apurNota;
        dailyMap.set(n.data, d);
      }
    });

    const debitoTotal = debito + (Number(outDeb) || 0);
    const creditoTotal = credito + (Number(outCred) || 0) + (Number(saldoAnt) || 0);
    const saldoFinal = debitoTotal - creditoTotal;

    return {
      debito,
      credito,
      debitoTotal,
      creditoTotal,
      saldoFinal,
      cfops: Array.from(cfopMap.values()).sort((a, b) => b.vIcms - a.vIcms),
      daily: Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [notas, empresaAtiva, dataDe, dataAte, saldoAnt, outCred, outDeb, regrasPersonalizadas]);

  // Carregar dados de exemplo simulados
  function carregarExemplo() {
    const exNotas: NotaFiscal[] = [];
    const empDoc = '11222333000181';
    const empNome = 'Comercial Exemplo Ltda';

    const clientes = [
      { doc: '44555666000177', nome: 'Mercado Bom Preço Ltda', uf: 'SC' },
      { doc: '48111222000190', nome: 'Distribuidora Serra Azul Ltda', uf: 'SC' },
      { doc: '77888999000155', nome: 'Atacado Paranaense S.A.', uf: 'PR' },
    ];

    const fornecedores = [
      { doc: '22333444000110', nome: 'Indústria Catarinense de Alimentos S.A.', uf: 'SC' },
      { doc: '33444555000120', nome: 'Paulista Embalagens Ltda', uf: 'SP' },
      { doc: '55666777000130', nome: 'Fábrica Pequena ME (Simples)', uf: 'SC' },
    ];

    let n = 1000;
    for (let dia = 1; dia <= 28; dia++) {
      const diaStr = String(dia).padStart(2, '0');
      const data = `2026-09-${diaStr}`;

      // Vendas Saída
      const c = clientes[dia % clientes.length];
      const inter = c.uf !== 'SC';
      const valorVenda = 1200 + ((dia * 350) % 3500);
      const aliq = inter ? 12 : 17;
      const icmsVenda = (valorVenda * aliq) / 100;

      exNotas.push({
        chave: `422609${empDoc}5500100000${n}100123450`,
        nNF: String(n++),
        mod: '55',
        dhEmi: `${data}T10:30:00-03:00`,
        data,
        tpNF: '1',
        emit: { doc: empDoc, nome: empNome, uf: 'SC' },
        dest: c,
        itens: [
          {
            nItem: '1',
            cProd: '101',
            xProd: 'Alimentos e Mercadorias para Revenda',
            cfop: inter ? '6102' : '5102',
            vProd: valorVenda,
            bc: valorVenda,
            aliq,
            icms: icmsVenda,
            credSN: 0,
          },
        ],
        vNF: valorVenda,
        vBC: valorVenda,
        vICMS: icmsVenda,
        cancelada: dia === 9,
      });

      // Compras Entradas (a cada 3 dias)
      if (dia % 3 === 0) {
        const f = fornecedores[(dia / 3) % fornecedores.length];
        const valorCompra = 2000 + ((dia * 400) % 4000);
        const aliqCompra = f.uf === 'SP' ? 12 : 17;
        const icmsCompra = (valorCompra * aliqCompra) / 100;

        exNotas.push({
          chave: `422609${f.doc}5500100000${n}100987650`,
          nNF: String(n++),
          mod: '55',
          dhEmi: `${data}T14:15:00-03:00`,
          data,
          tpNF: '1',
          emit: f,
          dest: { doc: empDoc, nome: empNome, uf: 'SC' },
          itens: [
            {
              nItem: '1',
              cProd: '501',
              xProd: 'Matéria-Prima e Embalagens Industriais',
              cfop: f.uf === 'SP' ? '6102' : '5102',
              vProd: valorCompra,
              bc: valorCompra,
              aliq: aliqCompra,
              icms: icmsCompra,
              credSN: f.nome.includes('Simples') ? valorCompra * 0.0256 : 0,
            },
          ],
          vNF: valorCompra,
          vBC: valorCompra,
          vICMS: icmsCompra,
          cancelada: false,
        });
      }
    }

    setNotas(exNotas);
    setEmpresaAtiva(empDoc);
  }

  // Leitura de XMLs reais
  const handleUploadXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const novasNotas: NotaFiscal[] = [];
    const parser = new DOMParser();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.xml')) {
        try {
          const text = await file.text();
          const doc = parser.parseFromString(text, 'text/xml');
          const infNFe = doc.querySelector('infNFe');
          if (!infNFe) continue;

          const chave = (infNFe.getAttribute('Id') || '').replace(/^NFe/, '');
          const nNF = doc.querySelector('ide > nNF')?.textContent || '';
          const mod = doc.querySelector('ide > mod')?.textContent || '55';
          const dhEmi = doc.querySelector('ide > dhEmi')?.textContent || '';
          const data = dhEmi ? dhEmi.substring(0, 10) : '';
          const tpNF = (doc.querySelector('ide > tpNF')?.textContent || '1') as '0' | '1';

          const emitDoc =
            doc.querySelector('emit > CNPJ')?.textContent ||
            doc.querySelector('emit > CPF')?.textContent ||
            '';
          const emitNome = doc.querySelector('emit > xNome')?.textContent || '';
          const emitUf = doc.querySelector('emit > enderEmit > UF')?.textContent || 'SC';

          const destDoc =
            doc.querySelector('dest > CNPJ')?.textContent ||
            doc.querySelector('dest > CPF')?.textContent ||
            '';
          const destNome = doc.querySelector('dest > xNome')?.textContent || '';

          const itens: ItemNota[] = [];
          doc.querySelectorAll('det').forEach((det) => {
            const cProd = det.querySelector('prod > cProd')?.textContent || '';
            const xProd = det.querySelector('prod > xProd')?.textContent || '';
            const cfop = det.querySelector('prod > CFOP')?.textContent || '';
            const vProd = parseFloat(det.querySelector('prod > vProd')?.textContent || '0');
            const vBC = parseFloat(det.querySelector('imposto > ICMS vBC')?.textContent || '0');
            const pICMS = parseFloat(det.querySelector('imposto > ICMS pICMS')?.textContent || '0');
            const vICMS = parseFloat(det.querySelector('imposto > ICMS vICMS')?.textContent || '0');
            const vCredSN = parseFloat(
              det.querySelector('imposto > ICMS vCredICMSSN')?.textContent || '0'
            );

            itens.push({
              nItem: det.getAttribute('nItem') || '1',
              cProd,
              xProd,
              cfop,
              vProd,
              bc: vBC,
              aliq: pICMS,
              icms: vICMS,
              credSN: vCredSN,
            });
          });

          const vNF = parseFloat(doc.querySelector('total > ICMSTot > vNF')?.textContent || '0');
          const vBC = parseFloat(doc.querySelector('total > ICMSTot > vBC')?.textContent || '0');
          const vICMS = parseFloat(doc.querySelector('total > ICMSTot > vICMS')?.textContent || '0');
          const cStat = doc.querySelector('protNFe > infProt > cStat')?.textContent;

          novasNotas.push({
            chave,
            nNF,
            mod,
            dhEmi,
            data,
            tpNF,
            emit: { doc: emitDoc, nome: emitNome, uf: emitUf },
            dest: { doc: destDoc, nome: destNome },
            itens,
            vNF,
            vBC,
            vICMS,
            cancelada: cStat === '101',
          });
        } catch (err) {
          console.error('Erro ao ler XML:', err);
        }
      }
    }

    if (novasNotas.length > 0) {
      setNotas((prev) => [...novasNotas, ...prev]);
    }
  };

  // Exportar Excel XLSX
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Aba Resumo
    const resumoData = [
      ['RELATÓRIO DE APURAÇÃO DE ICMS', ''],
      ['Empresa:', empresaAtiva],
      ['Período:', `${dataDe} até ${dataAte}`],
      ['', ''],
      ['Débitos (Saídas):', apuracaoCalculada.debito],
      ['Outros Débitos:', Number(outDeb) || 0],
      ['Total Débitos:', apuracaoCalculada.debitoTotal],
      ['', ''],
      ['Créditos (Entradas):', apuracaoCalculada.credito],
      ['Saldo Credor Anterior:', Number(saldoAnt) || 0],
      ['Outros Créditos (CIAP/TTD):', Number(outCred) || 0],
      ['Total Créditos:', apuracaoCalculada.creditoTotal],
      ['', ''],
      [
        apuracaoCalculada.saldoFinal >= 0 ? 'ICMS A RECOLHER:' : 'SALDO CREDOR FINAL:',
        Math.abs(apuracaoCalculada.saldoFinal),
      ],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // 2. Aba Por CFOP
    const cfopData = [
      ['Direção', 'CFOP', 'Entra na Apuração', 'Valor Contábil', 'Base de Cálculo', 'ICMS / Crédito SN'],
      ...apuracaoCalculada.cfops.map((c) => [
        c.direcao === 'S' ? 'Saída (Débito)' : 'Entrada (Crédito)',
        c.cfop,
        c.incluso ? 'SIM' : 'NÃO',
        c.vContabil,
        c.vBC,
        c.vIcms + c.vCredSN,
      ]),
    ];
    const wsCfop = XLSX.utils.aoa_to_sheet(cfopData);
    XLSX.utils.book_append_sheet(wb, wsCfop, 'Por CFOP');

    XLSX.writeFile(wb, `Apuracao_ICMS_${empresaAtiva}_${dataDe}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in select-none">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              Departamento Fiscal
            </span>
            <span className="text-xs text-slate-400 font-medium">Prévia & Fechamento</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Apuração Parcial de ICMS
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Consolidação em tempo real a partir dos XMLs de NF-e e NFC-e. Acompanhe saídas, entradas,
            créditos de Simples Nacional, ajustes manuais e saldo devedor/credor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span>Importar XMLs</span>
            <input type="file" multiple accept=".xml" onChange={handleUploadXml} className="hidden" />
          </label>

          <button
            type="button"
            onClick={carregarExemplo}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F1A2E] dark:hover:bg-[#16243B] text-slate-800 dark:text-cyan-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-[#1A2A44] flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Usar Exemplo</span>
          </button>

          <button
            type="button"
            onClick={exportarExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Baixar (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setNotas([])}
            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Limpar notas carregadas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Parâmetros de Seleção: Empresa e Período */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Empresa Apurada
            </label>
            <select
              value={empresaAtiva}
              onChange={(e) => setEmpresaAtiva(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
            >
              {empresasDetectadas.map((emp) => (
                <option key={emp.doc} value={emp.doc}>
                  {emp.nome ? `${emp.nome} (${emp.doc})` : emp.doc}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                De
              </label>
              <input
                type="date"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-mono text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Até
              </label>
              <input
                type="date"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-mono text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarAjustes(!mostrarAjustes)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#0F1A2E] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-400 self-start md:self-auto transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ajustes Manuais</span>
          {mostrarAjustes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Painel de Ajustes Manuais */}
      {mostrarAjustes && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm animate-in fade-in space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-500">
            Ajustes Fiscais Manuais (Salvos Localmente)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Saldo Credor Anterior (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={saldoAnt || ''}
                onChange={(e) => setSaldoAnt(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Outros Créditos / CIAP / TTD (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={outCred || ''}
                onChange={(e) => setOutCred(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Outros Débitos / Estornos (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={outDeb || ''}
                onChange={(e) => setOutDeb(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cards de KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Débito */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Débitos (Saídas)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
            R$ {apuracaoCalculada.debito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total com outros débitos: R${' '}
            {apuracaoCalculada.debitoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Crédito */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Créditos (Entradas)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
            R$ {apuracaoCalculada.credito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total com saldo ant: R${' '}
            {apuracaoCalculada.creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Ajustes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Ajustes Manuais</span>
            <Calculator className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
            R$ {(saldoAnt + outCred - outDeb).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Créditos extras − Débitos</div>
        </div>

        {/* Saldo Final */}
        <div
          className={`p-5 rounded-2xl border shadow-sm ${
            apuracaoCalculada.saldoFinal > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className={apuracaoCalculada.saldoFinal > 0 ? 'text-rose-400' : 'text-emerald-400'}>
              {apuracaoCalculada.saldoFinal > 0 ? 'ICMS A RECOLHER' : 'SALDO CREDOR'}
            </span>
            <CheckCircle2
              className={`w-4 h-4 ${
                apuracaoCalculada.saldoFinal > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            />
          </div>
          <div
            className={`mt-2 text-2xl font-black font-mono ${
              apuracaoCalculada.saldoFinal > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            R${' '}
            {Math.abs(apuracaoCalculada.saldoFinal).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Posição parcial até {dataAte}</div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#16243B] pb-3">
        <button
          type="button"
          onClick={() => setAbaAtiva('cfop')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'cfop'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Resumo por CFOP ({apuracaoCalculada.cfops.length})
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('notas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'notas'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Notas Fiscais ({notas.length})
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('diario')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'diario'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Evolução Diária
        </button>
      </div>

      {/* Conteúdo da Aba CFOP */}
      {abaAtiva === 'cfop' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Agrupamento Tributário por CFOP
            </h3>
            <span className="text-xs text-slate-500">
              Clique no interruptor para incluir ou desconsiderar um CFOP
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-[#16243B] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Direção</th>
                  <th className="py-2.5 px-3">CFOP</th>
                  <th className="py-2.5 px-3 text-right">Valor Contábil</th>
                  <th className="py-2.5 px-3 text-right">Base de Cálculo</th>
                  <th className="py-2.5 px-3 text-right">ICMS / Crédito SN</th>
                  <th className="py-2.5 px-3 text-center">Apuração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#16243B]">
                {apuracaoCalculada.cfops.map((item) => (
                  <tr
                    key={`${item.direcao}:${item.cfop}`}
                    className={`hover:bg-slate-50 dark:hover:bg-[#0F1A2E]/60 transition-colors ${
                      !item.incluso ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.direcao === 'S'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {item.direcao === 'S' ? 'Saída (Débito)' : 'Entrada (Crédito)'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-cyan-300">
                      {item.cfop}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      R$ {item.vContabil.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      R$ {item.vBC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      R${' '}
                      {(item.vIcms + item.vCredSN).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCfopRegra(item.direcao, item.cfop)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          item.incluso
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {item.incluso ? 'Entra' : 'Ignorado'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Notas Fiscais */}
      {abaAtiva === 'notas' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaNota}
                onChange={(e) => setBuscaNota(e.target.value)}
                placeholder="Buscar por NF, parceiro ou chave..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroTipoNota('todas')}
                className={`px-3 py-1.5 rounded-lg font-semibold ${
                  filtroTipoNota === 'todas'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipoNota('saida')}
                className={`px-3 py-1.5 rounded-lg font-semibold ${
                  filtroTipoNota === 'saida'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Saídas
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipoNota('entrada')}
                className={`px-3 py-1.5 rounded-lg font-semibold ${
                  filtroTipoNota === 'entrada'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entradas
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-[#16243B] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">NF-e</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Parceiro</th>
                  <th className="py-2.5 px-3 text-right">Valor Total</th>
                  <th className="py-2.5 px-3 text-right">ICMS Destacado</th>
                  <th className="py-2.5 px-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#16243B]">
                {notas.map((n) => (
                  <tr
                    key={n.chave}
                    className={`hover:bg-slate-50 dark:hover:bg-[#0F1A2E]/60 transition-colors ${
                      n.cancelada ? 'opacity-40 line-through' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono text-slate-500">{n.data}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-cyan-300">
                      Nº {n.nNF}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          n.tpNF === '1' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {n.tpNF === '1' ? 'Saída' : 'Entrada'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200 truncate max-w-xs">
                      {n.tpNF === '1' ? n.dest.nome : n.emit.nome}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      R$ {n.vNF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      R$ {n.vICMS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {n.cancelada ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                          Cancelada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Autorizada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Diário */}
      {abaAtiva === 'diario' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Distribuição Diária de Débitos e Créditos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apuracaoCalculada.daily.map(([dia, v]) => (
              <div
                key={dia}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] flex items-center justify-between"
              >
                <div className="font-mono text-xs font-bold text-slate-400">{dia}</div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-rose-400 font-bold">
                    Déb: R$ {v.deb.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-emerald-400 font-bold">
                    Créd: R$ {v.cred.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
