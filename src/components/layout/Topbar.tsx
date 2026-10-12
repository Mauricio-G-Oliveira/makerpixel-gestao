import React from 'react';
import { Moon, Sun, Database, Calendar, Menu, Download } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { User } from '../../types/auth';

interface TopbarProps {
  viewTitle: string;
  viewSubtitle?: string;
  competencia: string;
  onCompetenciaChange: (mes: string) => void;
  mesesDisponiveis: string[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: User;
  onLogout: () => void;
  onSwitchUser?: (u: User) => void;
  onOpenMobileMenu?: () => void;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  viewTitle,
  viewSubtitle,
  competencia,
  onCompetenciaChange,
  mesesDisponiveis,
  theme,
  onToggleTheme,
  currentUser,
  onLogout,
  onSwitchUser,
  onOpenMobileMenu,
  onInstallPwa,
  canInstallPwa = false,
}) => {
  // Gera opções caso lista vazia
  const opcoesMeses = mesesDisponiveis.length > 0 ? mesesDisponiveis : [competencia];
  if (!opcoesMeses.includes(competencia)) opcoesMeses.push(competencia);
  opcoesMeses.sort().reverse();

  const formatMes = (iso: string) => {
    if (!iso) return '';
    const [ano, mes] = iso.split('-');
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const idx = parseInt(mes, 10) - 1;
    return `${nomes[idx] || mes} / ${ano}`;
  };

  return (
    <header className="h-18 sm:h-20 px-3.5 sm:px-6 border-b border-slate-200/80 dark:border-[#16243b] bg-white/80 dark:bg-[#070D18]/85 backdrop-blur-md flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 md:hidden transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>
        )}
        <div className="min-w-0">
          {viewSubtitle && (
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-0.5 truncate max-w-[150px] sm:max-w-none">
              {viewSubtitle}
            </div>
          )}
          <h1 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[170px] sm:max-w-none">
            {viewTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* PWA Install Button when available */}
        {canInstallPwa && onInstallPwa && (
          <button
            type="button"
            onClick={onInstallPwa}
            title="Instalar MakerPixel no computador ou celular"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold text-xs rounded-xl shadow-sm hover:from-cyan-400 hover:to-sky-500 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar App</span>
          </button>
        )}

        {/* Competência Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#0C1626] border border-slate-200 dark:border-[#1A2A44] shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-cyan-400 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 hidden sm:block">
              Competência
            </span>
            <select
              value={competencia}
              onChange={(e) => onCompetenciaChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
            >
              {opcoesMeses.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-[#0A1220] text-slate-900 dark:text-white">
                  {formatMes(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Storage status pill */}
        <div
          title="Dados armazenados no IndexedDB do navegador. Sincronização direta com backend Java pronta."
          className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#0C1626] border border-slate-200 dark:border-[#1A2A44] text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Database className="w-3.5 h-3.5 opacity-60" />
          <span>Local (IndexedDB)</span>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Alternar tema"
          className="p-2 sm:p-2.5 rounded-xl bg-slate-100/90 dark:bg-[#0C1626] hover:bg-slate-200 dark:hover:bg-[#122036] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1A2A44] transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* User profile menu */}
        <UserMenu currentUser={currentUser} onLogout={onLogout} onSwitchUser={onSwitchUser} />
      </div>
    </header>
  );
};
