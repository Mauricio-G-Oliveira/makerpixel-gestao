import React from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  Building2,
  Network,
  BookOpen,
  ShieldCheck,
  Plus,
  Sparkles,
  Calculator,
  Scale,
  CalendarClock,
  X,
  Download,
} from 'lucide-react';
import { Logo } from '../../brand/Logo';
import { BankAccount, Unit } from '../../types/finance';
import { UserRole } from '../../types/auth';

export type ActiveView =
  | 'master'
  | 'conciliacao'
  | 'apuracao-icms'
  | 'auditor-ibs-cbs'
  | 'vencimentos'
  | { type: 'conta'; id: string }
  | { type: 'unidade'; id: string }
  | { type: 'cadastro'; id: string }
  | 'admin';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  contas: BankAccount[];
  unidades: Unit[];
  cadastros: { id: string; nome: string }[];
  onNovaConta: () => void;
  onNovaUnidade: () => void;
  userRole: UserRole;
  countsByConta?: Record<string, number>;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  contas,
  unidades,
  cadastros,
  onNovaConta,
  onNovaUnidade,
  userRole,
  countsByConta = {},
  isOpenMobile = false,
  onCloseMobile,
  onInstallPwa,
  canInstallPwa = false,
}) => {
  const isContaActive = (id: string) =>
    typeof activeView === 'object' && activeView.type === 'conta' && activeView.id === id;

  const isUnidadeActive = (id: string) =>
    typeof activeView === 'object' && activeView.type === 'unidade' && activeView.id === id;

  const isCadastroActive = (id: string) =>
    typeof activeView === 'object' && activeView.type === 'cadastro' && activeView.id === id;

  const handleNav = (view: ActiveView) => {
    onSelectView(view);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Backdrop para fechar menu no mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 dark:bg-[#070D18] border-r border-slate-800 dark:border-[#16243B] flex flex-col h-screen text-slate-300 select-none overflow-hidden flex-shrink-0 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 dark:border-[#16243B] bg-slate-950/40 flex items-center justify-between">
          <Logo size="md" variant="light" />
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white md:hidden"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav List */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sessão Principal */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Financeiro & Contábil
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNav('master')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'master'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 opacity-80" />
                  <span>Painel Master (SCI)</span>
                </div>
                <Sparkles className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => handleNav('conciliacao')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'conciliacao'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="w-4 h-4 opacity-80" />
                  <span>Conciliação Bancária</span>
                </div>
              </button>
            </div>
          </div>

          {/* Novos Módulos: Fiscal & Tributário */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 flex items-center justify-between">
              <span>Fiscal & Tributário</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-mono">
                Novo
              </span>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNav('apuracao-icms')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'apuracao-icms'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <span>Apuração de ICMS</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 dark:bg-[#16243B] text-slate-400">
                  XML
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('auditor-ibs-cbs')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'auditor-ibs-cbs'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Scale className="w-4 h-4 text-sky-400" />
                  <span>Auditor IBS / CBS</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300">
                  LC 214
                </span>
              </button>
            </div>
          </div>

          {/* Novo Módulo: Compliance & Prazos */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
              <span>Compliance & Prazos</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-mono">
                Novo
              </span>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNav('vencimentos')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'vencimentos'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarClock className="w-4 h-4 text-amber-400" />
                  <span>Painel de Vencimentos</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 dark:bg-[#16243B] text-slate-400">
                  A1/CND
                </span>
              </button>
            </div>
          </div>

          {/* Contas Bancárias */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Contas Bancárias ({contas.length})
              </span>
              <button
                type="button"
                onClick={onNovaConta}
                title="Adicionar Conta"
                className="p-1 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 text-slate-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {contas.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">
                  Nenhuma conta cadastrada
                </div>
              ) : (
                contas.map((c) => {
                  const count = countsByConta[c.id] || 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleNav({ type: 'conta', id: c.id })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isContaActive(c.id)
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400 opacity-80 flex-shrink-0" />
                        <span className="truncate">{c.nome}</span>
                      </div>
                      {count > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-800 dark:bg-[#16243B] text-slate-400 font-mono">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Unidades e Filiais */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Unidades & Centros ({unidades.length})
              </span>
              <button
                type="button"
                onClick={onNovaUnidade}
                title="Adicionar Unidade"
                className="p-1 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 text-slate-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {unidades.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">
                  Nenhuma unidade cadastrada
                </div>
              ) : (
                unidades.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleNav({ type: 'unidade', id: u.id })}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isUnidadeActive(u.id)
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Network className="w-3.5 h-3.5 text-sky-400 opacity-80 flex-shrink-0" />
                      <span className="truncate">{u.nome}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Cadastros */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cadastros Auxiliares
            </div>
            <div className="space-y-1">
              {cadastros.map((cad) => (
                <button
                  key={cad.id}
                  type="button"
                  onClick={() => handleNav({ type: 'cadastro', id: cad.id })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isCadastroActive(cad.id)
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 opacity-70 flex-shrink-0" />
                    <span className="truncate">{cad.nome}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Admin (Stageflow style) */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sistema
            </div>
            <button
              type="button"
              onClick={() => handleNav('admin')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'admin'
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:bg-slate-800/70 dark:hover:bg-[#0E182A] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Área Admin (Stageflow)</span>
              </div>
              {userRole === 'admin' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-cyan-400/20 text-cyan-300">
                  Full
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Footer Info & PWA install action */}
        <div className="p-4 border-t border-slate-800/80 dark:border-[#16243B] bg-slate-950/40 space-y-2.5">
          {canInstallPwa && onInstallPwa && (
            <button
              type="button"
              onClick={onInstallPwa}
              className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500/20 to-sky-600/20 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar como App (PWA)</span>
            </button>
          )}

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-400">MakerPixel</span>
              <span className="text-[10px] text-slate-600 block">v2.1 • PWA & Fiscais</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          </div>
        </div>
      </aside>
    </>
  );
};
