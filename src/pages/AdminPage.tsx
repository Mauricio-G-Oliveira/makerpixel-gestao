import React, { useState } from 'react';
import {
  Users,
  Settings,
  ShieldCheck,
  Cpu,
  Plus,
  Trash2,
  Edit2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Save,
  Server,
  Database,
  Code2,
} from 'lucide-react';
import { User, UserRole, AuditLog, CompanySettings } from '../types/auth';
import { AuthService } from '../services/authService';
import { AuditService } from '../services/auditService';
import { ApiService } from '../services/apiService';

interface AdminPageProps {
  currentUser: User;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser }) => {
  const [tab, setTab] = useState<'usuarios' | 'configuracoes' | 'auditoria' | 'arquitetura'>(
    'usuarios'
  );

  // Users State
  const [users, setUsers] = useState<User[]>(() => AuthService.getUsers());
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userDept, setUserDept] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('operador');
  const [userModalError, setUserModalError] = useState('');

  // Settings State
  const [settings, setSettings] = useState<CompanySettings>(() => ApiService.getCompanySettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>(() => AuditService.getLogs());
  const [logFilter, setLogFilter] = useState('');

  // Handlers for Users
  const handleOpenUserModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setUserName(u.name);
      setUserEmail(u.email);
      setUserDept(u.department || '');
      setUserRole(u.role);
    } else {
      setEditingUser(null);
      setUserName('');
      setUserEmail('');
      setUserDept('');
      setUserRole('operador');
    }
    setUserModalError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updated = AuthService.updateUser(editingUser.id, {
          name: userName,
          email: userEmail,
          department: userDept,
          role: userRole,
        });
        AuditService.log('USUARIO_EDITADO', `Usuário ${updated.name} foi atualizado`, currentUser);
      } else {
        const created = AuthService.createUser({
          name: userName,
          email: userEmail,
          department: userDept,
          role: userRole,
        });
        AuditService.log('USUARIO_CRIADO', `Novo usuário criado: ${created.name}`, currentUser);
      }
      setUsers(AuthService.getUsers());
      setIsUserModalOpen(false);
    } catch (err: any) {
      setUserModalError(err.message || 'Erro ao salvar usuário');
    }
  };

  const handleToggleStatus = (u: User) => {
    try {
      const updated = AuthService.toggleUserStatus(u.id);
      AuditService.log(
        'USUARIO_EDITADO',
        `Status do usuário ${updated.name} alterado para ${updated.active ? 'Ativo' : 'Inativo'}`,
        currentUser
      );
      setUsers(AuthService.getUsers());
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = (u: User) => {
    if (confirm(`Deseja realmente remover o usuário ${u.name}?`)) {
      try {
        AuthService.deleteUser(u.id);
        AuditService.log('USUARIO_EDITADO', `Usuário removido: ${u.name}`, currentUser);
        setUsers(AuthService.getUsers());
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Handlers for Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    ApiService.saveCompanySettings(settings);
    AuditService.log('CONFIG_ALTERADA', 'Configurações da empresa e SCI atualizadas', currentUser);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const filteredLogs = logs.filter((l) => {
    if (!logFilter.trim()) return true;
    const q = logFilter.toLowerCase();
    return (
      l.description.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Área de Administração (Stageflow Standard)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestão corporativa de acessos, parâmetros do SCI Único e auditoria de eventos
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setTab('usuarios')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'usuarios'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Usuários
          </button>
          <button
            type="button"
            onClick={() => setTab('configuracoes')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'configuracoes'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Empresa & SCI
          </button>
          <button
            type="button"
            onClick={() => setTab('auditoria')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'auditoria'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Logs & Auditoria
          </button>
          <button
            type="button"
            onClick={() => setTab('arquitetura')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'arquitetura'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Java Backend / DB
          </button>
        </div>
      </div>

      {/* Tab: Gestão de Usuários */}
      {tab === 'usuarios' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Usuários do Sistema ({users.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Controle de perfis e permissões por colaborador
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenUserModal()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Perfil</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Último Acesso</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 font-bold flex items-center justify-center text-xs">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                    <td className="py-2.5 px-3 text-slate-500">{u.department || 'Operações'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                            : u.role === 'contador'
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                            : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {u.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Nunca'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenUserModal(u)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Empresa & SCI */}
      {tab === 'configuracoes' && (
        <form
          onSubmit={handleSaveSettings}
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Parâmetros da Empresa & SCI Único
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configurações padrão usadas na geração dos arquivos de integração contábil
              </p>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Configurações</span>
            </button>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-600 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configurações atualizadas com sucesso!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={settings.razaoSocial}
                onChange={(e) => setSettings({ ...settings, razaoSocial: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={settings.nomeFantasia}
                onChange={(e) => setSettings({ ...settings, nomeFantasia: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                CNPJ
              </label>
              <input
                type="text"
                value={settings.cnpj}
                onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Código SCI da Matriz
              </label>
              <input
                type="text"
                value={settings.codigoSciPadrao}
                onChange={(e) => setSettings({ ...settings, codigoSciPadrao: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-3">
              Mapeamento de Contas e Históricos Padrão (Macro VBA v30)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Cta Pagamento (Débito)
                </label>
                <input
                  type="text"
                  value={settings.contaPadraoDebitoPagamento}
                  onChange={(e) =>
                    setSettings({ ...settings, contaPadraoDebitoPagamento: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Cta Recebimento (Crédito)
                </label>
                <input
                  type="text"
                  value={settings.contaPadraoCreditoRecebimento}
                  onChange={(e) =>
                    setSettings({ ...settings, contaPadraoCreditoRecebimento: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  HP Recebimento
                </label>
                <input
                  type="text"
                  value={settings.hpRecebimento}
                  onChange={(e) => setSettings({ ...settings, hpRecebimento: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  HP Pagamento
                </label>
                <input
                  type="text"
                  value={settings.hpPagamento}
                  onChange={(e) => setSettings({ ...settings, hpPagamento: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab: Logs & Auditoria */}
      {tab === 'auditoria' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Trilha de Auditoria em Tempo Real ({logs.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro imutável de todas as ações de importação, conciliação e dados
              </p>
            </div>

            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                placeholder="Filtrar por ação, usuário..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Ação</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-md truncate">
                      {log.description}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Arquitetura & Java Blueprint */}
      {tab === 'arquitetura' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-500" />
              <span>Blueprint da Arquitetura & Transição Java / Banco de Dados</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Status da transição de arquitetura: fase 1 (Frontend React + Tailwind + IndexedDB) concluída com 100% de paridade.
              Preparado para os novos módulos e backend Java Spring Boot na próxima fase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
              <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                Fase 1: Frontend Atual
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                React 19 + Tailwind
              </div>
              <div className="text-xs text-slate-500 mt-2 space-y-1">
                <div>✓ 100% Regras VBA v30</div>
                <div>✓ 124 Testes Automatizados</div>
                <div>✓ IndexedDB Local (500+ MB)</div>
                <div>✓ Login & Admin Stageflow</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5">
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Fase 2: Próximos Módulos
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                Módulos Avançados
              </div>
              <div className="text-xs text-slate-500 mt-2 space-y-1">
                <div>• Relatórios DRE & Balanço</div>
                <div>• Fluxo de Caixa Projetado</div>
                <div>• Integrações Bancárias API (Open Finance)</div>
                <div>• Módulo de Faturamento NFe</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Fase 3: Backend Java & BD
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                Spring Boot 3 + PostgreSQL
              </div>
              <div className="text-xs text-slate-500 mt-2 space-y-1">
                <div>• Spring Security + JWT Tokens</div>
                <div>• JPA Hibernate Entities</div>
                <div>• Migrations Flyway / Liquibase</div>
                <div>• Sincronização multiusuário</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 font-mono text-xs space-y-2">
            <div className="text-cyan-400 font-bold">// Endpoints REST já mapeados na camada ApiService:</div>
            <div>POST /api/v1/auth/login</div>
            <div>GET  /api/v1/financial/entries?competencia=2026-08&contaId=sicoob-1</div>
            <div>POST /api/v1/financial/distribute</div>
            <div>POST /api/v1/financial/export-unico</div>
            <div>POST /api/v1/reconciliation/run</div>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {userModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium">
                  {userModalError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Nome do colaborador"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  value={userDept}
                  onChange={(e) => setUserDept(e.target.value)}
                  placeholder="Ex.: Controladoria, Contabilidade"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="operador">Operador (Lançamentos e Extratos)</option>
                  <option value="contador">Contador (Integrações e Conciliações)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
