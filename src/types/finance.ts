export type EntrySignal = 'C' | 'D';

export interface Entry {
  id: string;
  data: string; // YYYY-MM-DD
  dataMovimento?: string; // YYYY-MM-DD
  descricao: string;
  documento?: string;
  modelo?: string;
  valor: number;
  sinal: EntrySignal;
  categoria: string;
  unidade: string;
  natureza: string;
  conta: string; // Conta contábil no plano de contas
  nome: string; // Razão social do fornecedor ou cliente
  cpf: string; // CPF ou CNPJ formatado ou limpo
  sugerido?: boolean;
  fitid?: string;
  // Campos contábeis calculados na distribuição:
  debito?: string;
  credito?: string;
  hp?: string;
  complementoHp?: string;
  origemContaId?: string;
  origemContaNome?: string;
}

export interface BankAccount {
  id: string;
  nome: string; // Ex.: "Sicoob 24402-3 Conta 643"
  banco: string; // Ex.: "Sicoob"
  numeroConta: string; // Ex.: "24402-3"
  contaContabil: string; // Ex.: "643"
  agencia?: string; // Ex.: "3078"
  saldoInicial?: number;
}

export interface Unit {
  id: string;
  nome: string;
  codigoSci?: string;
  cnpj?: string;
}

export interface MasterRowStats {
  nome: string;
  id: string;
  classificados: number;
  pendentes: number;
  total: number;
  completoPct: number;
}

export interface MasterSummary {
  competencia: string;
  totalClassificados: number;
  totalPendentes: number;
  totalGeral: number;
  completoPct: number;
  unidades: MasterRowStats[];
  bancos: MasterRowStats[];
}

export interface CadastroData {
  id: string;
  titulo: string;
  cabecalho: string[];
  linhas: Record<string, string>[];
}
