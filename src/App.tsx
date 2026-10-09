import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { LoginPage } from './pages/LoginPage';
import { MasterPage } from './pages/MasterPage';
import { LedgerPage } from './pages/LedgerPage';
import { UnidadePage } from './pages/UnidadePage';
import { CadastrosPage } from './pages/CadastrosPage';
import { ConciliacaoPage } from './pages/ConciliacaoPage';
import { AdminPage } from './pages/AdminPage';

import { NovaContaModal } from './components/modals/NovaContaModal';
import { NovaUnidadeModal } from './components/modals/NovaUnidadeModal';
import { ImportarPlanilhaModal } from './components/modals/ImportarPlanilhaModal';
import { ImportarExtratosModal } from './components/modals/ImportarExtratosModal';

import { AuthService } from './services/authService';
import { StorageService } from './services/storage';
import { AuditService } from './services/auditService';
import { ApiService } from './services/apiService';

import { User, AuthSession } from './types/auth';
import { BankAccount, Unit, Entry, MasterSummary, CadastroData } from './types/finance';
import { ConciliacaoSalva } from './types/reconciliation';
import { Core, Integracao, Extratos } from './engine';

const CADASTROS_DEFS = [
  { id: 'clientes', nome: 'Clientes' },
  { id: 'fornecedores', nome: 'Fornecedores' },
  { id: 'plano', nome: 'Plano de Contas' },
  { id: 'tabelas', nome: 'Tabelas Auxiliares' },
];

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => AuthService.getSession());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('makerpixel_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [activeView, setActiveView] = useState<ActiveView>('master');
  const [competencia, setCompetencia] = useState<string>('2026-08');
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>(['2026-08', '2026-09']);

  const [contas, setContas] = useState<BankAccount[]>([]);
  const [unidades, setUnidades] = useState<Unit[]>([]);
  const [entriesMap, setEntriesMap] = useState<Record<string, Entry[]>>({});
  const [cadastrosData, setCadastrosData] = useState<Record<string, CadastroData>>({});
  const [salvasConc, setSalvasConc] = useState<ConciliacaoSalva[]>([]);

  // Modals state
  const [isNovaContaOpen, setIsNovaContaOpen] = useState(false);
  const [isNovaUnidadeOpen, setIsNovaUnidadeOpen] = useState(false);
  const [isImportPlanilhaOpen, setIsImportPlanilhaOpen] = useState(false);
  const [isImportExtratosOpen, setIsImportExtratosOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Inicializa tema
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('makerpixel_theme', theme);
    } catch {}
  }, [theme]);

  // Inicializa armazenamento local
  useEffect(() => {
    StorageService.init().then((ok) => {
      loadStorageData();
    });
  }, []);

  const loadStorageData = () => {
    // Carrega contas
    const c = StorageService.get<BankAccount[]>('contas') || [
      {
        id: 'cta-sicoob-1',
        nome: 'Sicoob 24402-3 Conta 643',
        banco: 'Sicoob',
        numeroConta: '24402-3',
        contaContabil: '643',
        agencia: '3078',
      },
      {
        id: 'cta-sicredi-2',
        nome: 'Sicredi 19915-0 Conta 627',
        banco: 'Sicredi',
        numeroConta: '19915-0',
        contaContabil: '627',
        agencia: '0281',
      },
    ];
    setContas(c);

    // Carrega unidades
    const u = StorageService.get<Unit[]>('unidades') || [
      { id: 'unid-matriz', nome: 'Matriz', codigoSci: '101' },
      { id: 'unid-tubarao', nome: 'Filial Tubarão', codigoSci: '102' },
      { id: 'unid-criciuma', nome: 'Criciúma', codigoSci: '103' },
    ];
    setUnidades(u);

    // Detecta meses e carrega lançamentos
    const keys = StorageService.keys();
    const meses = new Set<string>();
    const entriesPorConta: Record<string, Entry[]> = {};

    keys.forEach((k) => {
      const match = k.match(/^lancamentos:(\d{4}-\d{2}):(.+)$/);
      if (match) {
        const [, mes, contaId] = match;
        meses.add(mes);
        if (mes === competencia) {
          entriesPorConta[contaId] = StorageService.get<Entry[]>(k) || [];
        }
      }
    });

    if (meses.size > 0) {
      setMesesDisponiveis(Array.from(meses));
    }
    setEntriesMap(entriesPorConta);

    // Carrega cadastros
    const cadObj: Record<string, CadastroData> = {};
    CADASTROS_DEFS.forEach((d) => {
      const header = StorageService.get<string[]>(`cabecalho:${d.id}`) || ['Código', 'Nome', 'CNPJ/CPF', 'Descrição'];
      const rows = StorageService.get<any[]>(`cad-${d.id}`) || [];
      cadObj[d.id] = {
        id: d.id,
        titulo: d.nome,
        cabecalho: header,
        linhas: rows,
      };
    });
    setCadastrosData(cadObj);
  };

  // Recarrega entradas quando a competência muda
  useEffect(() => {
    const entriesPorConta: Record<string, Entry[]> = {};
    contas.forEach((c) => {
      entriesPorConta[c.id] = StorageService.get<Entry[]>(`lancamentos:${competencia}:${c.id}`) || [];
    });
    unidades.forEach((u) => {
      entriesPorConta[u.id] = StorageService.get<Entry[]>(`lancamentos:${competencia}:${u.id}`) || [];
    });
    setEntriesMap(entriesPorConta);
  }, [competencia, contas, unidades]);

  // Contagem de lançamentos por conta para badges do sidebar
  const countsByConta = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [id, list] of Object.entries(entriesMap)) {
      map[id] = list?.length || 0;
    }
    return map;
  }, [entriesMap]);

  // Resumo do Master
  const masterSummary: MasterSummary = useMemo(() => {
    let totalClass = 0;
    let totalPend = 0;

    const bancosStats = contas.map((c) => {
      const list = entriesMap[c.id] || [];
      let cl = 0,
        pe = 0;
      list.forEach((e) => {
        if (e.categoria && e.unidade) cl++;
        else pe++;
      });
      totalClass += cl;
      totalPend += pe;
      const tot = cl + pe;
      return {
        id: c.id,
        nome: c.nome,
        classificados: cl,
        pendentes: pe,
        total: tot,
        completoPct: tot > 0 ? Math.round((cl / tot) * 100) : 100,
      };
    });

    const unidadesStats = unidades.map((u) => {
      const list = entriesMap[u.id] || [];
      let cl = 0,
        pe = 0;
      list.forEach((e) => {
        if (e.categoria && e.unidade) cl++;
        else pe++;
      });
      const tot = cl + pe;
      return {
        id: u.id,
        nome: u.nome,
        classificados: cl,
        pendentes: pe,
        total: tot,
        completoPct: tot > 0 ? Math.round((cl / tot) * 100) : 100,
      };
    });

    const totalGeral = totalClass + totalPend;
    const completoPct = totalGeral > 0 ? Math.round((totalClass / totalGeral) * 100) : 100;

    return {
      competencia,
      totalClassificados: totalClass,
      totalPendentes: totalPend,
      totalGeral,
      completoPct,
      unidades: unidadesStats,
      bancos: bancosStats,
    };
  }, [contas, unidades, entriesMap, competencia]);

  // Opções para autocomplete
  const naturezasOptions = useMemo(() => {
    const list = cadastrosData['plano']?.linhas || [];
    return Array.from(new Set(list.map((r) => r['Nome'] || r['Descrição'] || '').filter(Boolean)));
  }, [cadastrosData]);

  const nomesOptions = useMemo(() => {
    const forn = cadastrosData['fornecedores']?.linhas || [];
    const cli = cadastrosData['clientes']?.linhas || [];
    return Array.from(new Set([...forn, ...cli].map((r) => r['Nome'] || r['Razão Social'] || '').filter(Boolean)));
  }, [cadastrosData]);

  // Handlers
  const handleSaveConta = async (dados: Omit<BankAccount, 'id'>) => {
    const nova: BankAccount = {
      ...dados,
      id: `cta-${Date.now()}`,
    };
    const novasContas = [...contas, nova];
    setContas(novasContas);
    await StorageService.set('contas', novasContas);
    AuditService.log('LANCAMENTO_CRIADO', `Conta bancária cadastrada: ${nova.nome}`, session?.user);
  };

  const handleSaveUnidade = async (dados: Omit<Unit, 'id'>) => {
    const nova: Unit = {
      ...dados,
      id: `unid-${Date.now()}`,
    };
    const novasUnidades = [...unidades, nova];
    setUnidades(novasUnidades);
    await StorageService.set('unidades', novasUnidades);
  };

  const handleSaveEntry = async (contaId: string, entry: Entry) => {
    const atuais = entriesMap[contaId] || [];
    const idx = atuais.findIndex((e) => e.id === entry.id);
    let novos: Entry[];
    if (idx >= 0) {
      novos = [...atuais];
      novos[idx] = entry;
      AuditService.log('LANCAMENTO_EDITADO', `Lançamento atualizado: ${entry.descricao}`, session?.user);
    } else {
      novos = [entry, ...atuais];
      AuditService.log('LANCAMENTO_CRIADO', `Novo lançamento: ${entry.descricao}`, session?.user);
    }
    setEntriesMap({ ...entriesMap, [contaId]: novos });
    await StorageService.set(`lancamentos:${competencia}:${contaId}`, novos);
  };

  const handleDeleteEntry = async (contaId: string, entryId: string) => {
    const atuais = entriesMap[contaId] || [];
    const novos = atuais.filter((e) => e.id !== entryId);
    setEntriesMap({ ...entriesMap, [contaId]: novos });
    await StorageService.set(`lancamentos:${competencia}:${contaId}`, novos);
    AuditService.log('LANCAMENTO_EXCLUIDO', `Lançamento removido`, session?.user);
  };

  const handleClearEntries = async (contaId: string) => {
    if (confirm('Tem certeza que deseja apagar todos os lançamentos desta conta neste mês?')) {
      setEntriesMap({ ...entriesMap, [contaId]: [] });
      await StorageService.remove(`lancamentos:${competencia}:${contaId}`);
    }
  };

  const handleDeleteAccount = async (contaId: string) => {
    if (confirm('Deseja excluir esta conta bancária e seus lançamentos?')) {
      const novas = contas.filter((c) => c.id !== contaId);
      setContas(novas);
      await StorageService.set('contas', novas);
      await StorageService.remove(`lancamentos:${competencia}:${contaId}`);
      setActiveView('master');
    }
  };

  const handleConfirmSuggestions = async (contaId: string) => {
    const list = entriesMap[contaId] || [];
    const confirmed = list.map((e) => ({ ...e, sugerido: false }));
    setEntriesMap({ ...entriesMap, [contaId]: confirmed });
    await StorageService.set(`lancamentos:${competencia}:${contaId}`, confirmed);
    setStatusMsg({ type: 'success', text: 'Sugestões confirmadas com sucesso.' });
  };

  // Importar planilha completa
  const handleConfirmImportPlanilha = async (resultado: any, mesEscolhido: string, atualizarCadastros: boolean) => {
    setCompetencia(mesEscolhido);
    if (!mesesDisponiveis.includes(mesEscolhido)) {
      setMesesDisponiveis([mesEscolhido, ...mesesDisponiveis]);
    }

    // Salva contas
    if (resultado.contas && resultado.contas.length > 0) {
      setContas(resultado.contas);
      await StorageService.set('contas', resultado.contas);
    }

    // Salva lançamentos por conta
    for (const c of resultado.contas || []) {
      if (resultado.porMes && resultado.porMes[mesEscolhido] && resultado.porMes[mesEscolhido][c.id]) {
        const itens = resultado.porMes[mesEscolhido][c.id];
        await StorageService.set(`lancamentos:${mesEscolhido}:${c.id}`, itens);
      }
    }

    // Atualiza cadastros
    if (atualizarCadastros && resultado.cadastros) {
      for (const [id, cad] of Object.entries<any>(resultado.cadastros)) {
        await StorageService.set(`cabecalho:${id}`, cad.cabecalho);
        await StorageService.set(`cad-${id}`, cad.linhas);
      }
    }

    loadStorageData();
    AuditService.log('IMPORT_PLANILHA', `Planilha mensal importada para ${mesEscolhido}`, session?.user);
    setStatusMsg({
      type: 'success',
      text: `Planilha importada com sucesso para a competência ${mesEscolhido}.`,
    });
  };

  // Importar extratos múltiplos
  const handleConfirmImportExtratos = async (arquivosLidos: any[]) => {
    let totalAdicionados = 0;
    const novosEntriesMap = { ...entriesMap };

    for (const arq of arquivosLidos) {
      const contaTarget = contas.find((c) => c.id === arq.contaId) || contas[0];
      if (!contaTarget) continue;

      const atuais = novosEntriesMap[contaTarget.id] || [];
      const { novos } = Extratos.semDuplicar(atuais, arq.itens || []);

      // Sugestões inteligentes pelo histórico anterior
      const comSugestao = Extratos.sugerirClassificacao(novos, atuais);

      const mesclados = [...comSugestao, ...atuais];
      novosEntriesMap[contaTarget.id] = mesclados;
      await StorageService.set(`lancamentos:${competencia}:${contaTarget.id}`, mesclados);
      totalAdicionados += novos.length;
    }

    setEntriesMap(novosEntriesMap);
    AuditService.log('IMPORT_EXTRATO', `${totalAdicionados} lançamentos importados de extratos`, session?.user);
    setStatusMsg({
      type: 'success',
      text: `${totalAdicionados} lançamentos importados com sucesso dos extratos.`,
    });
  };

  // Distribuição por unidade
  const handleDistribuirUnidade = async () => {
    const todosLancamentos: Entry[] = [];
    contas.forEach((c) => {
      const l = entriesMap[c.id] || [];
      todosLancamentos.push(...l);
    });

    if (todosLancamentos.length === 0) {
      setStatusMsg({ type: 'warning', text: 'Não há lançamentos para distribuir neste mês.' });
      return;
    }

    const { distribuidos, unidadesEncontradas } = Integracao.distribuirPorUnidade(
      todosLancamentos,
      unidades,
      contas
    );

    // Grava nas abas de cada unidade
    const novosEntriesMap = { ...entriesMap };
    for (const [unidId, itens] of Object.entries<any>(distribuidos)) {
      novosEntriesMap[unidId] = itens;
      await StorageService.set(`lancamentos:${competencia}:${unidId}`, itens);
    }

    setEntriesMap(novosEntriesMap);
    AuditService.log('DISTRIBUICAO_UNIDADE', `Lançamentos distribuídos por unidade`, session?.user);
    setStatusMsg({
      type: 'success',
      text: `Lançamentos distribuídos com sucesso por unidade!`,
    });
  };

  // Gerar TXT SCI Único
  const handleGerarTxtUnico = () => {
    const todosLancamentos: Entry[] = [];
    contas.forEach((c) => {
      const l = entriesMap[c.id] || [];
      todosLancamentos.push(...l);
    });

    const settings = ApiService.getCompanySettings();
    const res = Integracao.gerarTxtUnico(todosLancamentos, unidades, settings);

    if (res.arquivos && res.arquivos.length > 0) {
      res.arquivos.forEach((arq: any) => {
        // UTF-8 com BOM
        const blob = new Blob(['\ufeff' + arq.conteudo], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = arq.nome;
        a.click();
        URL.revokeObjectURL(url);
      });
      AuditService.log('EXPORT_TXT_UNICO', `Arquivos do SCI Único gerados`, session?.user);
      setStatusMsg({
        type: 'success',
        text: `TXTs do SCI Único gerados com sucesso (${res.arquivos.length} arquivo(s)).`,
      });
    } else {
      setStatusMsg({
        type: 'warning',
        text: 'Nenhum lançamento pronto para gerar TXT do Único.',
      });
    }
  };

  // Gerar TXT Formato Atual
  const handleGerarTxtAtual = () => {
    const todosLancamentos: Entry[] = [];
    contas.forEach((c) => {
      const l = entriesMap[c.id] || [];
      todosLancamentos.push(...l);
    });

    const res = Integracao.gerarTxtAtual(todosLancamentos, unidades);
    if (res.arquivos && res.arquivos.length > 0) {
      res.arquivos.forEach((arq: any) => {
        const blob = new Blob([arq.conteudo], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = arq.nome;
        a.click();
        URL.revokeObjectURL(url);
      });
      AuditService.log('EXPORT_TXT_ATUAL', `TXTs formato atual exportados`, session?.user);
    }
  };

  // Backup e Restauração
  const handleBaixarBackup = () => {
    const dados = StorageService.getAllData();
    const payload = {
      sistema: 'MakerPixel Techsystem',
      versao: '2.0.0',
      dataBackup: new Date().toISOString(),
      dados,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-makerpixel-financeiro-${competencia}.json`;
    a.click();
    URL.revokeObjectURL(url);
    AuditService.log('BACKUP_GERADO', `Backup completo baixado`, session?.user);
  };

  const handleRestaurarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.dados) {
        await StorageService.restoreAllData(json.dados);
        loadStorageData();
        AuditService.log('BACKUP_RESTAURADO', `Backup restaurado do arquivo ${file.name}`, session?.user);
        setStatusMsg({ type: 'success', text: 'Backup restaurado com sucesso!' });
      }
    } catch (err: any) {
      alert('Arquivo de backup inválido: ' + err.message);
    }
  };

  const handleZerarMes = async () => {
    if (confirm(`Tem certeza que deseja apagar todos os lançamentos do mês ${competencia}?`)) {
      const chaves = StorageService.keys().filter((k) => k.startsWith(`lancamentos:${competencia}:`));
      for (const k of chaves) {
        await StorageService.remove(k);
      }
      setEntriesMap({});
      setStatusMsg({ type: 'warning', text: `Lançamentos do mês ${competencia} foram zerados.` });
    }
  };

  const handleApagarTudo = async () => {
    if (confirm('ATENÇÃO: Isto apagará TODOS os dados, contas e lançamentos salvos no navegador. Continuar?')) {
      await StorageService.clearAll();
      window.location.reload();
    }
  };

  // Se não estiver autenticado, exibe a LoginPage moderna da MakerPixel Techsystem
  if (!session) {
    return (
      <LoginPage
        onLoginSuccess={(s) => {
          setSession(s);
          loadStorageData();
        }}
      />
    );
  }

  // Título e subtítulo dinâmicos da Topbar
  let viewTitle = 'Painel Master';
  let viewSubtitle = 'Integração Contábil SCI Único';

  if (activeView === 'conciliacao') {
    viewTitle = 'Conciliação Bancária';
    viewSubtitle = 'Extratos e Planilhas';
  } else if (activeView === 'admin') {
    viewTitle = 'Área Administrativa';
    viewSubtitle = 'Configurações do Sistema';
  } else if (typeof activeView === 'object') {
    if (activeView.type === 'conta') {
      const c = contas.find((x) => x.id === activeView.id);
      viewTitle = c?.nome || 'Conta Bancária';
      viewSubtitle = `Banco ${c?.banco || ''} • Cta ${c?.numeroConta || ''}`;
    } else if (activeView.type === 'unidade') {
      const u = unidades.find((x) => x.id === activeView.id);
      viewTitle = u?.nome || 'Unidade';
      viewSubtitle = 'Lançamentos Consolidados';
    } else if (activeView.type === 'cadastro') {
      const cad = CADASTROS_DEFS.find((x) => x.id === activeView.id);
      viewTitle = cad?.nome || 'Cadastro';
      viewSubtitle = 'Tabela Auxiliar';
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar MakerPixel Tech */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        contas={contas}
        unidades={unidades}
        cadastros={CADASTROS_DEFS}
        onNovaConta={() => setIsNovaContaOpen(true)}
        onNovaUnidade={() => setIsNovaUnidadeOpen(true)}
        userRole={session.user.role}
        countsByConta={countsByConta}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar
          viewTitle={viewTitle}
          viewSubtitle={viewSubtitle}
          competencia={competencia}
          onCompetenciaChange={setCompetencia}
          mesesDisponiveis={mesesDisponiveis}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          currentUser={session.user}
          onLogout={() => {
            AuthService.logout();
            setSession(null);
          }}
          onSwitchUser={(u) => {
            const s = AuthService.getSession();
            if (s) {
              s.user = u;
              localStorage.setItem('makerpixel_auth_session', JSON.stringify(s));
              setSession({ ...s });
            }
          }}
        />

        {/* Content View Router */}
        <main className="flex-1 overflow-y-auto bg-slate-100/60 dark:bg-slate-950">
          {activeView === 'master' && (
            <MasterPage
              competencia={competencia}
              summary={masterSummary}
              onImportarPlanilha={() => setIsImportPlanilhaOpen(true)}
              onImportarExtratos={() => setIsImportExtratosOpen(true)}
              onBaixarBackup={handleBaixarBackup}
              onRestaurarBackup={handleRestaurarBackup}
              onZerarMes={handleZerarMes}
              onApagarTudo={handleApagarTudo}
              onDistribuirUnidade={handleDistribuirUnidade}
              onGerarTxtAtual={handleGerarTxtAtual}
              onGerarTxtUnico={handleGerarTxtUnico}
              statusMsg={statusMsg}
            />
          )}

          {activeView === 'conciliacao' && (
            <ConciliacaoPage
              contas={contas}
              getEntriesForAccount={(id) => entriesMap[id] || []}
              salvas={salvasConc}
              onSalvarConciliacao={(nome, dados) => {
                const nova: ConciliacaoSalva = {
                  id: `salva-${Date.now()}`,
                  nome,
                  dataSalva: new Date().toISOString(),
                  tipo: 'pagamentos',
                  itens: dados.itens,
                  grupos: dados.grupos,
                };
                setSalvasConc([nova, ...salvasConc]);
                StorageService.set(`conc-avulsa:salva:${nova.id}`, nova);
              }}
              onExcluirSalva={(id) => {
                setSalvasConc(salvasConc.filter((s) => s.id !== id));
                StorageService.remove(`conc-avulsa:salva:${id}`);
              }}
            />
          )}

          {typeof activeView === 'object' && activeView.type === 'conta' && (
            <LedgerPage
              conta={contas.find((c) => c.id === activeView.id) || contas[0]}
              unidades={unidades}
              entries={entriesMap[activeView.id] || []}
              naturezasOptions={naturezasOptions}
              nomesOptions={nomesOptions}
              onSaveEntry={(e) => handleSaveEntry(activeView.id, e)}
              onDeleteEntry={(id) => handleDeleteEntry(activeView.id, id)}
              onClearEntries={() => handleClearEntries(activeView.id)}
              onDeleteAccount={() => handleDeleteAccount(activeView.id)}
              onConfirmSuggestions={() => handleConfirmSuggestions(activeView.id)}
              onImportExtrato={() => setIsImportExtratosOpen(true)}
              onEditContaContabil={async (nova) => {
                const novas = contas.map((c) => (c.id === activeView.id ? { ...c, contaContabil: nova } : c));
                setContas(novas);
                await StorageService.set('contas', novas);
              }}
            />
          )}

          {typeof activeView === 'object' && activeView.type === 'unidade' && (
            <UnidadePage
              unidade={unidades.find((u) => u.id === activeView.id) || unidades[0]}
              entries={entriesMap[activeView.id] || []}
              onRedistribuir={handleDistribuirUnidade}
              onExcluirUnidade={async () => {
                if (confirm('Deseja excluir esta unidade?')) {
                  const novas = unidades.filter((u) => u.id !== activeView.id);
                  setUnidades(novas);
                  await StorageService.set('unidades', novas);
                  setActiveView('master');
                }
              }}
            />
          )}

          {typeof activeView === 'object' && activeView.type === 'cadastro' && (
            <CadastrosPage
              cadastro={
                cadastrosData[activeView.id] || {
                  id: activeView.id,
                  titulo: 'Cadastro',
                  cabecalho: [],
                  linhas: [],
                }
              }
              onImportarPlanilha={async (cabecalho, linhas) => {
                await StorageService.set(`cabecalho:${activeView.id}`, cabecalho);
                await StorageService.set(`cad-${activeView.id}`, linhas);
                loadStorageData();
              }}
              onLimparCadastro={async () => {
                if (confirm('Limpar este cadastro?')) {
                  await StorageService.remove(`cabecalho:${activeView.id}`);
                  await StorageService.remove(`cad-${activeView.id}`);
                  loadStorageData();
                }
              }}
            />
          )}

          {activeView === 'admin' && <AdminPage currentUser={session.user} />}
        </main>
      </div>

      {/* Global Modals */}
      <NovaContaModal
        isOpen={isNovaContaOpen}
        onClose={() => setIsNovaContaOpen(false)}
        onSave={handleSaveConta}
      />

      <NovaUnidadeModal
        isOpen={isNovaUnidadeOpen}
        onClose={() => setIsNovaUnidadeOpen(false)}
        onSave={handleSaveUnidade}
      />

      <ImportarPlanilhaModal
        isOpen={isImportPlanilhaOpen}
        onClose={() => setIsImportPlanilhaOpen(false)}
        onConfirm={handleConfirmImportPlanilha}
      />

      <ImportarExtratosModal
        isOpen={isImportExtratosOpen}
        onClose={() => setIsImportExtratosOpen(false)}
        contas={contas}
        onConfirm={handleConfirmImportExtratos}
      />
    </div>
  );
}
