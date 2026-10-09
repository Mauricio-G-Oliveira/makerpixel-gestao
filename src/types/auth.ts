export type UserRole = 'admin' | 'contador' | 'operador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  rememberMe: boolean;
  expiresAt: string;
}

export type AuditActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'IMPORT_PLANILHA'
  | 'IMPORT_EXTRATO'
  | 'LANCAMENTO_CRIADO'
  | 'LANCAMENTO_EDITADO'
  | 'LANCAMENTO_EXCLUIDO'
  | 'DISTRIBUICAO_UNIDADE'
  | 'EXPORT_TXT_UNICO'
  | 'EXPORT_TXT_ATUAL'
  | 'CONCILIACAO_REALIZADA'
  | 'CONCILIACAO_SALVA'
  | 'BACKUP_GERADO'
  | 'BACKUP_RESTAURADO'
  | 'USUARIO_CRIADO'
  | 'USUARIO_EDITADO'
  | 'CONFIG_ALTERADA';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditActionType;
  description: string;
  details?: string;
  ipAddress?: string;
  status: 'success' | 'warning' | 'error';
}

export interface CompanySettings {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  codigoSciPadrao: string;
  centroCustoPadrao?: string;
  contaPadraoDebitoPagamento: string;
  contaPadraoCreditoRecebimento: string;
  contaPadraoJurosRecebidos: string;
  hpRecebimento: string;
  hpPagamento: string;
  hpDespesaBancaria: string;
  hpTransferencia: string;
}
