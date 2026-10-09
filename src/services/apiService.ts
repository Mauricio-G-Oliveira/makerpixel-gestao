import { CompanySettings } from '../types/auth';
import { StorageService } from './storage';

const COMPANY_SETTINGS_KEY = 'makerpixel_company_settings';

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  razaoSocial: 'MakerPixel Tecnologia e Inovação LTDA',
  nomeFantasia: 'MakerPixel Techsystem',
  cnpj: '12.345.678/0001-90',
  inscricaoEstadual: '254.123.456',
  codigoSciPadrao: '101',
  centroCustoPadrao: 'Matriz',
  contaPadraoDebitoPagamento: '148',
  contaPadraoCreditoRecebimento: '18',
  contaPadraoJurosRecebidos: '2284',
  hpRecebimento: '3708',
  hpPagamento: '3026',
  hpDespesaBancaria: '3712',
  hpTransferencia: '2020',
};

export const ApiService = {
  getCompanySettings(): CompanySettings {
    try {
      const stored = localStorage.getItem(COMPANY_SETTINGS_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(DEFAULT_COMPANY_SETTINGS));
      return DEFAULT_COMPANY_SETTINGS;
    } catch {
      return DEFAULT_COMPANY_SETTINGS;
    }
  },

  saveCompanySettings(settings: CompanySettings): void {
    try {
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Erro ao salvar configurações da empresa:', e);
    }
  },

  // Documentação e status da API para a próxima fase (Java Spring Boot)
  getBackendIntegrationStatus() {
    return {
      mode: 'FRONTEND_STANDALONE_INDEXEDDB',
      futureBackend: 'Java Spring Boot 3 + Spring Security + JPA Hibernate',
      futureDatabase: 'PostgreSQL 16 / MySQL 8',
      endpointsReady: [
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/refresh',
        'GET /api/v1/users',
        'POST /api/v1/users',
        'GET /api/v1/financial/accounts',
        'POST /api/v1/financial/accounts',
        'GET /api/v1/financial/entries?competencia={mes}&contaId={id}',
        'POST /api/v1/financial/entries/batch',
        'POST /api/v1/financial/distribute',
        'POST /api/v1/financial/export-unico',
        'POST /api/v1/reconciliation/run',
      ],
      currentStorageCapacityMB: '500+ MB via IndexedDB no navegador',
    };
  },
};
