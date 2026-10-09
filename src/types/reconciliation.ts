import { Entry } from './finance';

export interface ExtratoItem {
  id?: string;
  data: string; // YYYY-MM-DD
  valor: number;
  sinal: 'C' | 'D';
  historico: string;
  documento?: string;
  fitid?: string;
  cpf?: string;
  nome?: string;
}

export type SituacaoConciliacao =
  | 'ok'
  | 'data_diferente'
  | 'so_banco'
  | 'so_sistema'
  | 'manual'
  | 'conferido';

export interface ConciliacaoPar {
  id: string;
  banco?: ExtratoItem;
  sistema?: Entry;
  situacao: SituacaoConciliacao;
  diferencaDias?: number;
  diferencaValor?: number;
  obs?: string;
  manualGrupoId?: string;
}

export interface ConciliacaoManualGrupo {
  id: string;
  bancoIds: string[];
  sistemaIds: string[];
  motivo?: string;
  conferido?: boolean;
}

export interface FornecedorComparativo {
  fornecedor: string;
  cnpj?: string;
  pagoBanco: number;
  debitoBalancete: number;
  diferenca: number;
  situacao: 'bate' | 'diferenca' | 'sem_balancete';
}

export interface ConciliacaoSalva {
  id: string;
  nome: string;
  dataSalva: string;
  tipo: 'pagamentos' | 'recebimentos';
  itens: ConciliacaoPar[];
  grupos: ConciliacaoManualGrupo[];
  vinculosFornecedores?: Record<string, string>;
}
