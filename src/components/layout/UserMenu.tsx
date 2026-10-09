import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Shield, ChevronDown, Check, UserCheck } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { User as UserType } from '../../types/auth';

interface UserMenuProps {
  currentUser: UserType;
  onLogout: () => void;
  onSwitchUser?: (user: UserType) => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  onLogout,
  onSwitchUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const allUsers = AuthService.getUsers();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            Admin
          </span>
        );
      case 'contador':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            Contador
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            Operador
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 pl-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 transition-all text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          {currentUser.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden sm:block text-xs leading-tight">
          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>{currentUser.name}</span>
            {getRoleBadge(currentUser.role)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
            {currentUser.email}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Conectado como
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
              {currentUser.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</div>
          </div>

          {/* Quick switcher */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Alternar Perfil Demo
            </div>
            {allUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  if (onSwitchUser) onSwitchUser(u);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                  u.id === currentUser.id
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 opacity-70" />
                  <div className="text-left">
                    <div>{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.role}</div>
                  </div>
                </div>
                {u.id === currentUser.id && <Check className="w-4 h-4 text-cyan-500" />}
              </button>
            ))}
          </div>

          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
