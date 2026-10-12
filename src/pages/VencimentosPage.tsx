import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  ClockAlert,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Sparkles,
  FileSpreadsheet,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  History,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export type TipoDocumento =
  | 'Certificado A1'
  | 'CND Federal'
  | 'CND Estadual'
  | 'CND Municipal'
  | 'CRF FGTS'
  | 'Alvará'
  | 'Procuração'
  | 'Licença';

export type AndamentoDocumento = 'Pendente' | 'Em renovação' | 'Aguardando cliente';

export interface Cliente {
  id: string;
  nome: string;
  doc: string; // CNPJ / CPF
  regime: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | 'MEI';
  contato: string;
  email: string;
  telefone: string;
}

export interface DocumentoVencimento {
  id: string;
  clienteId: string;
  tipo: TipoDocumento;
  numero?: string;
  emissao?: string;
  vencimento: string; // YYYY-MM-DD
  responsavel?: string;
  observacoes?: string;
  andamento: AndamentoDocumento;
  historico?: { dataRenovacao: string; vencimentoAnterior: string }[];
}

const VALIDADES_PADRAO: Record<TipoDocumento, number> = {
  'Certificado A1': 365,
  'CND Federal': 180,
  'CND Estadual': 90,
  'CND Municipal': 90,
  'CRF FGTS': 30,
  'Alvará': 365,
  'Procuração': 365,
  'Licença': 365,
};

function calcularDiasRestantes(vencimento: string): number {
  if (!vencimento) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [ano, mes, dia] = vencimento.split('-').map(Number);
  const dataVenc = new Date(ano, mes - 1, dia);
  const diffTime = dataVenc.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusPrazo(dias: number): 'vencido' | '7d' | '15d' | '30d' | 'ok' {
  if (dias < 0) return 'vencido';
  if (dias <= 7) return '7d';
  if (dias <= 15) return '15d';
  if (dias <= 30) return '30d';
  return 'ok';
}

export const VencimentosPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoVencimento[]>([]);

  // Abas
  const [abaAtiva, setAbaAtiva] = useState<'vencimentos' | 'por-cliente' | 'clientes' | 'calendario'>('vencimentos');

  // Filtros
  const [busca, setBusca] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modais de Criação
  const [isNovoDocOpen, setIsNovoDocOpen] = useState(false);
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);

  // Form novo doc
  const [formDocClienteId, setFormDocClienteId] = useState('');
  const [formDocTipo, setFormDocTipo] = useState<TipoDocumento>('Certificado A1');
  const [formDocVencimento, setFormDocVencimento] = useState('');
  const [formDocNumero, setFormDocNumero] = useState('');

  // Form novo cliente
  const [formCliNome, setFormCliNome] = useState('');
  const [formCliDoc, setFormCliDoc] = useState('');
  const [formCliTelefone, setFormCliTelefone] = useState('');
  const [formCliEmail, setFormCliEmail] = useState('');
  const [formCliRegime, setFormCliRegime] = useState<Cliente['regime']>('Simples Nacional');

  // Carrega mock de clientes e documentos inicial
  useState(() => {
    carregarExemplos();
  });

  function carregarExemplos() {
    const mockClientes: Cliente[] = [
      {
        id: 'c1',
        nome: 'Supermercado Central Tubarão Ltda',
        doc: '12.345.678/0001-90',
        regime: 'Lucro Presumido',
        contato: 'Roberto Almeida',
        email: 'financeiro@supercentral.com.br',
        telefone: '48999887766',
      },
      {
        id: 'c2',
        nome: 'Auto Mecânica e Peças Sul Ltda',
        doc: '98.765.432/0001-11',
        regime: 'Simples Nacional',
        contato: 'Cláudio Duarte',
        email: 'claudio@automecanicasul.com',
        telefone: '48988776655',
      },
      {
        id: 'c3',
        nome: 'Tech Inovação e Sistemas Eireli',
        doc: '45.123.789/0001-22',
        regime: 'Simples Nacional',
        contato: 'Ana Paula Reis',
        email: 'ana@techinovacao.com.br',
        telefone: '48991234567',
      },
      {
        id: 'c4',
        nome: 'Distribuidora de Alimentos Catarinense',
        doc: '33.444.555/0001-88',
        regime: 'Lucro Real',
        contato: 'Marcos Vinícius',
        email: 'fiscal@alimentoscatarinense.com',
        telefone: '48996543210',
      },
    ];

    const hoje = new Date();
    const addDias = (dias: number) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + dias);
      return d.toISOString().substring(0, 10);
    };

    const mockDocs: DocumentoVencimento[] = [
      {
        id: 'd1',
        clienteId: 'c1',
        tipo: 'Certificado A1',
        numero: 'A1-987213',
        vencimento: addDias(-3), // Vencido
        andamento: 'Pendente',
      },
      {
        id: 'd2',
        clienteId: 'c1',
        tipo: 'CND Federal',
        numero: 'CND-8821',
        vencimento: addDias(5), // Até 7 dias
        andamento: 'Aguardando cliente',
      },
      {
        id: 'd3',
        clienteId: 'c2',
        tipo: 'CRF FGTS',
        numero: 'CRF-2026-09',
        vencimento: addDias(12), // 8 a 15 dias
        andamento: 'Em renovação',
      },
      {
        id: 'd4',
        clienteId: 'c2',
        tipo: 'Alvará',
        numero: 'ALV-4420',
        vencimento: addDias(25), // 16 a 30 dias
        andamento: 'Pendente',
      },
      {
        id: 'd5',
        clienteId: 'c3',
        tipo: 'Certificado A1',
        numero: 'A1-44129',
        vencimento: addDias(180), // Em dia
        andamento: 'Pendente',
      },
      {
        id: 'd6',
        clienteId: 'c4',
        tipo: 'CND Estadual',
        numero: 'CND-SC-901',
        vencimento: addDias(4), // Até 7 dias
        andamento: 'Pendente',
      },
      {
        id: 'd7',
        clienteId: 'c4',
        tipo: 'CND Municipal',
        numero: 'CND-MUN-102',
        vencimento: addDias(-1), // Vencido
        andamento: 'Em renovação',
      },
    ];

    setClientes(mockClientes);
    setDocumentos(mockDocs);
    if (mockClientes.length > 0) setFormDocClienteId(mockClientes[0].id);
  }

  // Mapa de Clientes
  const clientesMap = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes.forEach((c) => map.set(c.id, c));
    return map;
  }, [clientes]);

  // Lista com Dias e Status Calculados
  const docsCalculados = useMemo(() => {
    return documentos.map((d) => {
      const dias = calcularDiasRestantes(d.vencimento);
      const status = getStatusPrazo(dias);
      const cliente = clientesMap.get(d.clienteId);
      return {
        ...d,
        dias,
        status,
        clienteNome: cliente?.nome || 'Cliente Desconhecido',
        clienteDoc: cliente?.doc || '',
        clienteTelefone: cliente?.telefone || '',
      };
    });
  }, [documentos, clientesMap]);

  // Contadores de KPIs
  const kpis = useMemo(() => {
    let vencidos = 0;
    let ate7d = 0;
    let de8a15d = 0;
    let de16a30d = 0;
    let emDia = 0;

    docsCalculados.forEach((d) => {
      if (d.status === 'vencido') vencidos++;
      else if (d.status === '7d') ate7d++;
      else if (d.status === '15d') de8a15d++;
      else if (d.status === '30d') de16a30d++;
      else emDia++;
    });

    return { vencidos, ate7d, de8a15d, de16a30d, emDia, total: docsCalculados.length };
  }, [docsCalculados]);

  // Filtro
  const docsFiltrados = useMemo(() => {
    return docsCalculados.filter((d) => {
      if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'todos' && d.status !== filtroStatus) return false;
      if (busca) {
        const b = busca.toLowerCase();
        const matchNome = d.clienteNome.toLowerCase().includes(b);
        const matchDoc = d.clienteDoc.includes(b);
        const matchTipo = d.tipo.toLowerCase().includes(b);
        if (!matchNome && !matchDoc && !matchTipo) return false;
      }
      return true;
    }).sort((a, b) => a.dias - b.dias);
  }, [docsCalculados, filtroTipo, filtroStatus, busca]);

  // Ação de Renovar Documento
  const handleRenovar = (docId: string) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const validadeDias = VALIDADES_PADRAO[d.tipo] || 365;
        const dataAtual = new Date();
        dataAtual.setDate(dataAtual.getDate() + validadeDias);
        const novoVencimento = dataAtual.toISOString().substring(0, 10);

        const historico = d.historico || [];
        historico.push({
          dataRenovacao: new Date().toISOString().substring(0, 10),
          vencimentoAnterior: d.vencimento,
        });

        return {
          ...d,
          vencimento: novoVencimento,
          andamento: 'Pendente',
          historico,
        };
      })
    );
  };

  // Ação de Alterar Andamento
  const handleChangeAndamento = (docId: string, novoAndamento: AndamentoDocumento) => {
    setDocumentos((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, andamento: novoAndamento } : d))
    );
  };

  // Ação de Avisar no WhatsApp
  const handleAvisarWhatsApp = (doc: (typeof docsCalculados)[0]) => {
    const tel = doc.clienteTelefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(
      `Olá! Somos da MakerPixel Contabilidade.\n\nGostaríamos de avisar que o seu documento *${doc.tipo}* (${doc.clienteNome}) está com vencimento agendado para *${doc.vencimento.split('-').reverse().join('/')}* (${doc.dias < 0 ? 'VENCIDO' : `em ${doc.dias} dias`}).\n\nPodemos providenciar a renovação? Ficamos à disposição!`
    );
    window.open(`https://wa.me/55${tel}?text=${mensagem}`, '_blank');
  };

  // Adicionar Novo Documento
  const handleSalvarNovoDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDocClienteId || !formDocVencimento) return;

    const novo: DocumentoVencimento = {
      id: `doc-${Date.now()}`,
      clienteId: formDocClienteId,
      tipo: formDocTipo,
      numero: formDocNumero,
      vencimento: formDocVencimento,
      andamento: 'Pendente',
    };

    setDocumentos([novo, ...documentos]);
    setIsNovoDocOpen(false);
    setFormDocNumero('');
  };

  // Adicionar Novo Cliente
  const handleSalvarNovoCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCliNome || !formCliDoc) return;

    const novo: Cliente = {
      id: `cli-${Date.now()}`,
      nome: formCliNome,
      doc: formCliDoc,
      regime: formCliRegime,
      contato: formCliNome,
      email: formCliEmail,
      telefone: formCliTelefone,
    };

    setClientes([...clientes, novo]);
    setIsNovoClienteOpen(false);
    setFormCliNome('');
    setFormCliDoc('');
    setFormCliTelefone('');
    setFormCliEmail('');
  };

  // Exportar Excel
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const dados = [
      ['Cliente', 'CNPJ/CPF', 'Tipo de Documento', 'Vencimento', 'Dias Restantes', 'Status', 'Andamento'],
      ...docsFiltrados.map((d) => [
        d.clienteNome,
        d.clienteDoc,
        d.tipo,
        d.vencimento,
        d.dias,
        d.status.toUpperCase(),
        d.andamento,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Vencimentos');
    XLSX.writeFile(wb, `Vencimentos_Clientes_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in select-none">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400">
              Compliance & Prazos
            </span>
            <span className="text-xs text-slate-400 font-medium">Controle de Vencimentos</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Painel de Vencimentos dos Clientes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Acompanhe certificados digitais A1, CNDs (Federal, Estadual, Municipal, FGTS), alvarás e
            procurações. Notifique clientes via WhatsApp com um clique e registre renovações com histórico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNovoDocOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Documento</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNovoClienteOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F1A2E] dark:hover:bg-[#16243B] text-slate-800 dark:text-amber-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-[#1A2A44] flex items-center gap-2 transition-all"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Novo Cliente</span>
          </button>

          <button
            type="button"
            onClick={carregarExemplos}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0F1A2E] dark:hover:bg-[#16243B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1A2A44] transition-all"
            title="Recarregar dados de exemplo"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            type="button"
            onClick={exportarExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards por Prazo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Vencidos */}
        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === 'vencido' ? 'todos' : 'vencido')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filtroStatus === 'vencido'
              ? 'ring-2 ring-rose-500 shadow-md'
              : ''
          } bg-rose-500/10 border-rose-500/25`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Vencidos</div>
          <div className="mt-1 text-2xl font-black font-mono text-rose-400">{kpis.vencidos}</div>
          <div className="text-[10px] text-slate-400 mt-1">Urgente / Expirado</div>
        </button>

        {/* Até 7 dias */}
        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === '7d' ? 'todos' : '7d')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filtroStatus === '7d'
              ? 'ring-2 ring-amber-500 shadow-md'
              : ''
          } bg-amber-500/10 border-amber-500/25`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Até 7 dias</div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-400">{kpis.ate7d}</div>
          <div className="text-[10px] text-slate-400 mt-1">Esta semana</div>
        </button>

        {/* 8 a 15 dias */}
        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === '15d' ? 'todos' : '15d')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filtroStatus === '15d'
              ? 'ring-2 ring-yellow-500 shadow-md'
              : ''
          } bg-yellow-500/10 border-yellow-500/25`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">8 a 15 dias</div>
          <div className="mt-1 text-2xl font-black font-mono text-yellow-400">{kpis.de8a15d}</div>
          <div className="text-[10px] text-slate-400 mt-1">Próxima quinzena</div>
        </button>

        {/* 16 a 30 dias */}
        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === '30d' ? 'todos' : '30d')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filtroStatus === '30d'
              ? 'ring-2 ring-sky-500 shadow-md'
              : ''
          } bg-sky-500/10 border-sky-500/25`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">16 a 30 dias</div>
          <div className="mt-1 text-2xl font-black font-mono text-sky-400">{kpis.de16a30d}</div>
          <div className="text-[10px] text-slate-400 mt-1">Neste mês</div>
        </button>

        {/* Em dia */}
        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === 'ok' ? 'todos' : 'ok')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filtroStatus === 'ok'
              ? 'ring-2 ring-emerald-500 shadow-md'
              : ''
          } bg-emerald-500/10 border-emerald-500/25 col-span-2 sm:col-span-1`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Em dia</div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-400">{kpis.emDia}</div>
          <div className="text-[10px] text-slate-400 mt-1">&gt; 30 dias</div>
        </button>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#16243B] pb-3">
        <button
          type="button"
          onClick={() => setAbaAtiva('vencimentos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'vencimentos'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Vencimentos ({docsCalculados.length})
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('por-cliente')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'por-cliente'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Por Cliente ({clientes.length})
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('clientes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'clientes'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-500 hover:text-white hover:bg-slate-800'
          }`}
        >
          Cadastro de Clientes
        </button>
      </div>

      {/* Conteúdo Aba Vencimentos */}
      {abaAtiva === 'vencimentos' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por cliente, documento ou tipo..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-bold text-slate-300 outline-none"
              >
                <option value="todos">Todos os Tipos</option>
                {Object.keys(VALIDADES_PADRAO).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-xs font-bold text-slate-300 outline-none"
              >
                <option value="todos">Todos os Prazos</option>
                <option value="vencido">Vencidos</option>
                <option value="7d">Até 7 dias</option>
                <option value="15d">8 a 15 dias</option>
                <option value="30d">16 a 30 dias</option>
                <option value="ok">Em dia</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-[#16243B] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Documento</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-center">Prazo</th>
                  <th className="py-2.5 px-3">Andamento</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#16243B]">
                {docsFiltrados.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50 dark:hover:bg-[#0F1A2E]/60 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{d.clienteNome}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{d.clienteDoc}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-amber-400">{d.tipo}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Nº {d.numero || 'S/N'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-200">
                      {d.vencimento.split('-').reverse().join('/')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'vencido'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : d.status === '7d'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : d.status === '15d'
                            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                            : d.status === '30d'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {d.dias < 0
                          ? `Venceu há ${Math.abs(d.dias)}d`
                          : d.dias === 0
                          ? 'Vence hoje'
                          : `Em ${d.dias} dias`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={d.andamento}
                        onChange={(e) =>
                          handleChangeAndamento(d.id, e.target.value as AndamentoDocumento)
                        }
                        className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-[#16243B] text-[11px] font-bold text-slate-300 outline-none"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Em renovação">Em renovação</option>
                        <option value="Aguardando cliente">Aguardando cliente</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRenovar(d.id)}
                          title="Registrar renovação com validade padrão"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAvisarWhatsApp(d)}
                          title="Enviar aviso pré-preenchido no WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDocumentos((prev) => prev.filter((item) => item.id !== d.id))
                          }
                          title="Excluir documento"
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Por Cliente */}
      {abaAtiva === 'por-cliente' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((cli) => {
            const docsCli = docsCalculados.filter((d) => d.clienteId === cli.id);
            const statusCritico = docsCli.find((d) => d.status === 'vencido')
              ? 'vencido'
              : docsCli.find((d) => d.status === '7d')
              ? '7d'
              : 'ok';

            return (
              <div
                key={cli.id}
                className={`p-5 rounded-2xl bg-white dark:bg-[#0A1220] border transition-all ${
                  statusCritico === 'vencido'
                    ? 'border-rose-500/30'
                    : statusCritico === '7d'
                    ? 'border-amber-500/30'
                    : 'border-slate-200 dark:border-[#16243B]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{cli.nome}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{cli.doc}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                    {cli.regime}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Documentos ({docsCli.length}):
                  </div>
                  {docsCli.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-0"
                    >
                      <span className="text-slate-300 font-medium">{d.tipo}</span>
                      <span
                        className={`font-mono text-[11px] ${
                          d.status === 'vencido'
                            ? 'text-rose-400 font-bold'
                            : d.status === '7d'
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {d.vencimento.split('-').reverse().join('/')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Tel: {cli.telefone}</span>
                  {cli.telefone && docsCli.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAvisarWhatsApp(docsCli[0])}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-500/25 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conteúdo Aba Cadastro de Clientes */}
      {abaAtiva === 'clientes' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-[#16243B] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Clientes Cadastrados ({clientes.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsNovoClienteOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Cliente</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-[#16243B] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Razão Social / Nome</th>
                  <th className="py-2.5 px-3">CNPJ / CPF</th>
                  <th className="py-2.5 px-3">Regime</th>
                  <th className="py-2.5 px-3">Contato</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">Telefone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#16243B]">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-[#0F1A2E]/60">
                    <td className="py-3 px-3 font-bold text-white">{c.nome}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{c.doc}</td>
                    <td className="py-3 px-3 text-slate-300">{c.regime}</td>
                    <td className="py-3 px-3 text-slate-300">{c.contato}</td>
                    <td className="py-3 px-3 text-slate-300">{c.email}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{c.telefone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo Documento */}
      {isNovoDocOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Adicionar Novo Documento</h3>
            <form onSubmit={handleSalvarNovoDoc} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cliente</label>
                <select
                  value={formDocClienteId}
                  onChange={(e) => setFormDocClienteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={formDocTipo}
                  onChange={(e) => setFormDocTipo(e.target.value as TipoDocumento)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {Object.keys(VALIDADES_PADRAO).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  required
                  value={formDocVencimento}
                  onChange={(e) => setFormDocVencimento(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Número / Identificação (Opcional)
                </label>
                <input
                  type="text"
                  value={formDocNumero}
                  onChange={(e) => setFormDocNumero(e.target.value)}
                  placeholder="Ex: A1-99212 ou CND-44"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNovoDocOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-xl"
                >
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {isNovoClienteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Cadastrar Novo Cliente</h3>
            <form onSubmit={handleSalvarNovoCliente} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nome / Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={formCliNome}
                  onChange={(e) => setFormCliNome(e.target.value)}
                  placeholder="Ex: Mercado Santa Catarina Ltda"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">CNPJ ou CPF</label>
                <input
                  type="text"
                  required
                  value={formCliDoc}
                  onChange={(e) => setFormCliDoc(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={formCliTelefone}
                  onChange={(e) => setFormCliTelefone(e.target.value)}
                  placeholder="48999887766"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formCliEmail}
                  onChange={(e) => setFormCliEmail(e.target.value)}
                  placeholder="financeiro@empresa.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNovoClienteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-xl"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
