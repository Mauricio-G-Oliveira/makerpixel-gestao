# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [2.1.0] - 2026-10-12

### Adicionado
- **PWA (Progressive Web App)**: Manifesto oficial (`manifest.webmanifest`), Service Worker com estratégia de precache e botão nativo de instalação para Desktop e Mobile.
- **Módulo de Apuração Parcial de ICMS**:
  - Leitura e processamento de XMLs de NF-e e NFC-e 100% no navegador (Client-Side).
  - Agrupamento automático por CFOP com conversão de entradas equivalentes de fornecedores.
  - Alternador de inclusão/exclusão de CFOP na apuração fiscal com persistência local.
  - Ajustes manuais de saldo credor anterior, outros créditos (CIAP, TTD) e débitos.
  - Exportação de relatório consolidado em Excel (.xlsx) com múltiplas abas.
- **Módulo de Auditoria IBS / CBS (Reforma Tributária LC 214/2025)**:
  - Auditoria de notas com detecção da tag `<IBSCBS>`.
  - Validação de CST, base de cálculo e alíquotas nominais/efetivas com redutores legais (`gRed`).
  - Diagnóstico automatizado de conformidade (OK, Atenção, Erro).
  - Calculadora avulsa de tributos e tabela de consulta oficial de CSTs da Reforma.
- **Painel de Vencimentos dos Clientes**:
  - Monitoramento de prazos críticos: Certificado Digital A1, CND Federal, CND Estadual, CND Municipal, CRF FGTS, Alvarás e Procurações.
  - Classificação visual por faixas de criticidade: Vencidos, até 7 dias, 8 a 15 dias, 16 a 30 dias e Em dia.
  - Registro de renovação com histórico preservado e cálculo de validade padrão.
  - Integração para envio de alertas pré-formatados diretamente no WhatsApp do cliente.
- **Responsividade Mobile Avançada**:
  - Menu lateral em gaveta deslizante (Drawer) para smartphones e tablets.
  - Botão hambúrguer com transição fluida na Topbar.
  - Envoltórios de rolagem horizontal fluida em todas as tabelas financeiras e fiscais.

### Modificado
- **Identidade Visual MakerPixel Techsystem**: Redesenho do logotipo com alta fidelidade às fotos oficiais da marca, cores de alto contraste (`#0A2540` e ciano elétrico `#00A3E0`), eliminando qualquer aspecto desbotado.
- **Dark Theme "Obsidian"**: Transição para fundo ultra-dark `#060B13` com cartões em `#0A1220` e realces ciano neon, corrigindo o contraste das fontes no modo escuro.

---

## [2.0.0] - 2026-10-09

### Adicionado
- **Identidade Visual MakerPixel Techsystem**: Adoção do novo branding corporativo com paleta ciano neon e navy profundo.
- **Área Administrativa (Padrão Stageflow)**:
  - Gestão de usuários com controle de acesso baseado em papéis (RBAC - Admin, Contador, Operador).
  - Cadastro de empresas, códigos contábeis SCI e parâmetros operacionais.
  - Trilha de Auditoria (Audit Log) em tempo real registrando logins, conciliações e operações.
  - Blueprint arquitetural com documentação OpenAPI/JPA para transição para backend Java Spring Boot 3.
- **Página de Login e Sessão**: Autenticação com sessão persistida, atalhos para perfis de demonstração e recuperação de acesso.
- **Alternador de Tema**: Suporte completo a Dark Mode e Light Mode com persistência local.

---

## [1.0.0] - 2026-10-08

### Adicionado
- **Paridade Contábil 100% com SCI Único**:
  - Motor de processamento baseado nas regras da macro VBA v30.
  - Distribuição automática de lançamentos por unidade/filial.
  - Geração de arquivos oficiais `UNICO_<Unidade>.txt` (UTF-8 com BOM, CRLF, 16 colunas separadas por vírgula) e `PENDENCIAS_UNICO.csv`.
- **Contas Bancárias e Lançamentos**:
  - Cadastro de contas bancárias (Sicoob, Sicredi, Caixa, BB, Itaú, Bradesco, Santander, etc.).
  - Motor de sugestões inteligentes de classificação por histórico e CNPJ.
  - Exportação para Excel (TSV) e CSV.
- **Conciliação Bancária Multi-Extrato**:
  - Suporte a extratos em PDF (com conferência diária de saldos), OFX e TXT Sicoob.
  - Modo Conta do Sistema e Modo Extrato × Planilha / Balancete / NF-e XML.
- **Suíte de Testes Automatizados**: 124 testes unitários cobrindo parsers de PDF, OFX, TXT e regras contábeis.
