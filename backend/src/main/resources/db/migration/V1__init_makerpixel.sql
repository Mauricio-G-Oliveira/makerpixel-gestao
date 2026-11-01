-- ==============================================================================
-- MakerPixel Contábil - Migration V1: Estrutura Base Multi-Escritório e RLS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Escritórios (Tenants)
CREATE TABLE escritorio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    contato VARCHAR(120),
    email VARCHAR(180) NOT NULL,
    telefone VARCHAR(30),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    situacao VARCHAR(20) NOT NULL DEFAULT 'TESTE', -- TESTE, ATIVO, SUSPENSO, ENCERRADO
    teste_expira_em TIMESTAMP WITH TIME ZONE,
    modulos_ativos TEXT[] NOT NULL DEFAULT ARRAY[
        'CONCILIACAO_BANCARIA',
        'INTEGRACAO_UNICO',
        'VENCIMENTOS',
        'EM_DIA',
        'FISCAL',
        'CONTROLE_HORAS',
        'ENCERRAMENTO_LUCROS'
    ],
    max_usuarios INT NOT NULL DEFAULT 3,
    max_empresas INT NOT NULL DEFAULT 20,
    suporte_liberado_ate TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escritorio_cnpj ON escritorio(cnpj);
CREATE INDEX idx_escritorio_situacao ON escritorio(situacao);
CREATE INDEX idx_escritorio_teste_expira ON escritorio(teste_expira_em);

-- 2. Usuários
CREATE TABLE usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL, -- ADMIN_PRODUTO, ADMIN_ESCRITORIO, USUARIO
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    trocar_senha_primeiro_acesso BOOLEAN NOT NULL DEFAULT TRUE,
    modulos_liberados TEXT[],
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuario_escritorio ON usuario(escritorio_id);
CREATE INDEX idx_usuario_email ON usuario(email);

-- 3. Empresas Atendidas pelo Escritório
CREATE TABLE empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
    cnpj VARCHAR(14) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    codigo VARCHAR(50),
    regime VARCHAR(30) NOT NULL DEFAULT 'SIMPLES_NACIONAL', -- MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL, etc.
    segmento VARCHAR(100),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    cep VARCHAR(8),
    logradouro VARCHAR(200),
    numero VARCHAR(50),
    bairro VARCHAR(100),
    telefone VARCHAR(30),
    situacao_cadastral VARCHAR(20) DEFAULT 'ATIVA', -- ATIVA, BAIXADA, INAPTA, SUSPENSA, NULA
    data_situacao DATE,
    data_inicio_atividade DATE,
    data_baixa DATE,
    data_consulta_receita TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_empresa_escritorio_cnpj UNIQUE (escritorio_id, cnpj)
);

CREATE INDEX idx_empresa_escritorio ON empresa(escritorio_id);
CREATE INDEX idx_empresa_cnpj ON empresa(cnpj);
CREATE INDEX idx_empresa_regime ON empresa(regime);

-- 4. Sócios (QSA)
CREATE TABLE socio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    cpf VARCHAR(14),
    percentual NUMERIC(5,2),
    data_entrada DATE,
    data_saida DATE
);

CREATE INDEX idx_socio_empresa ON socio(empresa_id);
CREATE INDEX idx_socio_escritorio ON socio(escritorio_id);

-- 5. Tabela de Configuração dos Limites de Faturamento (2026)
CREATE TABLE limite_faturamento_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano INT NOT NULL,
    regime VARCHAR(30) NOT NULL,
    limite_anual NUMERIC(15,2) NOT NULL,
    limite_mensal_proporcional NUMERIC(15,2) NOT NULL,
    sublimite_anual NUMERIC(15,2),
    sublimite_mensal_proporcional NUMERIC(15,2),
    CONSTRAINT uk_config_ano_regime UNIQUE (ano, regime)
);

-- 6. Lançamentos de Faturamento Mensal
CREATE TABLE faturamento_mensal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
    ano INT NOT NULL,
    mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    valor NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_faturamento_empresa_ano_mes UNIQUE (empresa_id, ano, mes)
);

CREATE INDEX idx_faturamento_empresa_ano ON faturamento_mensal(empresa_id, ano);
CREATE INDEX idx_faturamento_escritorio ON faturamento_mensal(escritorio_id);

-- 7. Registro de Auditoria do Escritório
CREATE TABLE auditoria_escritorio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
    acao VARCHAR(80) NOT NULL,
    detalhes TEXT,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_escritorio ON auditoria_escritorio(escritorio_id);

-- 8. Cache de Consultas BrasilAPI / Receita Federal (24 horas)
CREATE TABLE cnpj_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    payload_json TEXT NOT NULL,
    consultado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_cnpj_cache_cnpj ON cnpj_cache(cnpj);

-- ==============================================================================
-- Row-Level Security (RLS) - Garantia de Isolamento Multi-Tenant
-- ==============================================================================
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE socio ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_escritorio ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_tenant_isolation ON empresa
    FOR ALL
    USING (
        escritorio_id = NULLIF(current_setting('app.current_escritorio_id', true), '')::uuid
        OR current_setting('app.is_admin_produto', true) = 'true'
    );

CREATE POLICY socio_tenant_isolation ON socio
    FOR ALL
    USING (
        escritorio_id = NULLIF(current_setting('app.current_escritorio_id', true), '')::uuid
        OR current_setting('app.is_admin_produto', true) = 'true'
    );

CREATE POLICY faturamento_tenant_isolation ON faturamento_mensal
    FOR ALL
    USING (
        escritorio_id = NULLIF(current_setting('app.current_escritorio_id', true), '')::uuid
        OR current_setting('app.is_admin_produto', true) = 'true'
    );

-- ==============================================================================
-- Seeds Iniciais
-- ==============================================================================

-- Limites Vigentes 2026
INSERT INTO limite_faturamento_config (ano, regime, limite_anual, limite_mensal_proporcional, sublimite_anual, sublimite_mensal_proporcional)
VALUES 
    (2026, 'MEI', 81000.00, 6750.00, NULL, NULL),
    (2026, 'SIMPLES_NACIONAL', 4800000.00, 400000.00, 3600000.00, 300000.00);

-- Usuário Administrador MakerPixel (ADMIN_PRODUTO)
-- Senha inicial padrão: Admin@2026 (bcrypt hash)
INSERT INTO usuario (
    id,
    escritorio_id,
    nome,
    email,
    senha_hash,
    perfil,
    ativo,
    trocar_senha_primeiro_acesso
) VALUES (
    gen_random_uuid(),
    NULL,
    'Mauricio (MakerPixel)',
    'mauriciogoulart.deoliveira37@gmail.com',
    '$2a$12$Z0e1L0a6E1Msqv7ZfGg44.zI2H3bYF.q0FzXp00pM9aPfx3rA1Jje',
    'ADMIN_PRODUTO',
    TRUE,
    FALSE
);
