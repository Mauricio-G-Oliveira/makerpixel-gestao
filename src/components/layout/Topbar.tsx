import React from 'react';
import { Moon, Sun, Database, Calendar } from 'lucide-react';
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
    <header className="h-20 px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div>
        {viewSubtitle && (
          <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-0.5">
            {viewSubtitle}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {viewTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3.5 sm:gap-4">
        {/* Competência Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <Calendar className="w-4 h-4 text-cyan-500" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Competência
            </span>
            <select
              value={competencia}
              onChange={(e) => onCompetenciaChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
            >
              {opcoesMeses.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {formatMes(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Storage status pill */}
        <div
          title="Dados armazenados no IndexedDB do navegador. Sincronização direta com backend Java pronta."
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
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
          className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/90 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* User profile menu */}
        <UserMenu currentUser={currentUser} onLogout={onLogout} onSwitchUser={onSwitchUser} />
      </div>
    </header>
  );
};
