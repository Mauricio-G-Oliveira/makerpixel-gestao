import { AuditLog, AuditActionType, UserRole } from '../types/auth';

const AUDIT_KEY = 'makerpixel_audit_logs';

const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    userId: 'user-admin-1',
    userName: 'Administrador MakerPixel',
    userRole: 'admin',
    action: 'LOGIN',
    description: 'Sessão iniciada via console administrativo',
    status: 'success',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userId: 'user-contador-2',
    userName: 'Mariana Silva',
    userRole: 'contador',
    action: 'IMPORT_PLANILHA',
    description: 'Importação da planilha de movimentações Setembro/2026',
    status: 'success',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    userId: 'user-contador-2',
    userName: 'Mariana Silva',
    userRole: 'contador',
    action: 'DISTRIBUICAO_UNIDADE',
    description: 'Distribuição contábil executada para 5 unidades',
    status: 'success',
  },
];

export const AuditService = {
  getLogs(): AuditLog[] {
    try {
      const stored = localStorage.getItem(AUDIT_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  },

  log(
    action: AuditActionType,
    description: string,
    user?: { id: string; name: string; role: UserRole },
    details?: string,
    status: 'success' | 'warning' | 'error' = 'success'
  ): void {
    const logs = this.getLogs();
    const newEntry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'sys',
      userName: user?.name || 'Sistema',
      userRole: user?.role || 'admin',
      action,
      description,
      details,
      status,
    };

    logs.unshift(newEntry);
    if (logs.length > 300) logs.pop();

    try {
      localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Não foi possível gravar log de auditoria:', e);
    }
  },

  clearLogs(): void {
    try {
      localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
    } catch {}
  },
};
