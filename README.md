# MakerPixel Techsystem — Gestão Financeira, Inteligência Fiscal & PWA

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00E5FF?style=for-the-badge&logo=github&logoColor=black)](https://mauricio-g-oliveira.github.io/makerpixel-gestao/)
[![Version](https://img.shields.io/badge/Release-v2.2.0-00A3E0?style=for-the-badge&logo=semver&logoColor=white)](https://github.com/Mauricio-G-Oliveira/makerpixel-gestao/releases)
[![Tests Passing](https://img.shields.io/badge/Tests-226%20Passing%20(100%25)-10B981?style=for-the-badge&logo=node.js&logoColor=white)](https://github.com/Mauricio-G-Oliveira/makerpixel-gestao)
[![PWA Ready](https://img.shields.io/badge/PWA-Desktop%20%26%20Mobile-F59E0B?style=for-the-badge&logo=pwa&logoColor=white)](https://mauricio-g-oliveira.github.io/makerpixel-gestao/)
[![Security](https://img.shields.io/badge/Auth-PBKDF2%20100k%20Hash-7C3AED?style=for-the-badge&logo=auth0&logoColor=white)](https://github.com/Mauricio-G-Oliveira/makerpixel-gestao)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

<br />

**Plataforma corporativa de Gestão Financeira, Conciliação Bancária Multi-Extrato, Inteligência Tributária (ICMS + Reforma Tributária LC 214/2025), Compliance e Integração Oficial com o ERP Contábil SCI Único.**

[Acessar Demonstração Online](https://mauricio-g-oliveira.github.io/makerpixel-gestao/) • [Modelo de Branches](CONTRIBUTING.md) • [Changelog](CHANGELOG.md)

</div>

---

## 💎 Destaques do Projeto & Portfólio

Este projeto foi desenhado para atender requisitos de escritórios contábeis e médias empresas, unindo **rigor matemático contábil**, **arquitetura de frontend de alto desempenho (Zero-Dependency Vanilla JS + Tailwind)** e **máxima privacidade de dados (LGPD)**.

### 🛡️ 1. Privacidade Absoluta (100% Client-Side Processing)
- Extratos bancários confidenciais (PDF, OFX, CSV, TXT Sicoob) e notas fiscais XML/ZIP são decodificados e processados **exclusivamente na memória do navegador do usuário**.
- Nenhum dado financeiro ou fiscal confidencial é transmitido para servidores de terceiros ou nuvem não autorizada.

### ⚡ 2. Progressive Web App (PWA) Instalável Desktop & Mobile
- Instalável como aplicação nativa com um clique no **Windows**, **macOS**, **Linux**, **Android** e **iOS**.
- Interface com suporte offline completo via **Service Worker** e cache granular de ativos estáticos.
- Identidade visual **Obsidian Cyber Dark** (`#060B13` / `#0A1220` / `#00E5FF`) e modo claro com contraste WCAG AAA.
- Drawer responsivo otimizado para dispositivos móveis com fechamento inteligente e navegação rápida.

### ⚖️ 3. Motor Contábil Homologado (SCI Único) & Reforma Tributária (LC 214/2025)
- **100% de paridade** com as regras legadas de conciliação e classificação contábil (macro VBA v30).
- Suporte imediato às novas exigências da Reforma Tributária brasileira: conferência do grupo `<IBSCBS>` da **NT 2025.002**, bases reduzidas (`gRed`) e alíquotas estaduais/municipais.

---

## 🏛️ Arquitetura do Sistema

```mermaid
flowchart TD
    subgraph UI ["Camada de Apresentação (MakerPixel Obsidian Cyber UI)"]
        A[Topbar & PWA Controls]
        B[Sidebar com Drawer Responsivo]
        C[Theme Engine: Obsidian Dark & Light]
        D[Dashboard Início com Resumo do Dia]
        E[Widget Suporte WhatsApp com Contexto]
    end

    subgraph CoreEngine ["Motor de Inteligência Local (Vanilla JS ES6+)"]
        F[Parser Extratos: PDF / OFX / CSV / TXT Sicoob]
        G[Motor de Conciliação Multi-Critério e Tolerância de Datas]
        H[Motor de Distribuição por Unidade e Regras Contábeis]
        I[Parser Fiscal: XMLs NF-e / NFC-e / Meu ISS]
        J[Motor de Criptografia PBKDF2 com Salt e 100k iterações]
    end

    subgraph Modules ["Módulos Especializados Integrados"]
        M1[Apuração Parcial de ICMS]
        M2[Auditor IBS/CBS - LC 214/2025]
        M3[ISS Tubarão - Meu ISS]
        M4[Painel de Vencimentos & Compliance]
        M5[Controle de Horas - DP]
        M6[Em Dia - Fechamento & Passagem de Bastão]
    end

    subgraph Storage ["Persistência & Governança"]
        K[(IndexedDB / LocalStorage Seguro)]
        L[Exportador Oficial: SCI Único TXT / CSV / Excel]
        N[Backup e Restauração Criptografada JSON]
    end

    UI --> CoreEngine
    CoreEngine --> Modules
    Modules --> Storage
```

---

## 📦 Módulos Funcionais

### 1. Painel Master & Integração SCI Único
- **Acompanhamento de Fechamento**: KPIs de lançamentos classificados, pendentes e percentual de conclusão por unidade e conta bancária.
- **Distribuição Automatizada**: Aplicação das regras contábeis para rateio entre filiais e matriz com histórico padronizado.
- **Exportação Homologada**:
  - `UNICO_<Unidade>.txt`: Arquivo oficial posicional do SCI Único (UTF-8 com BOM, CRLF e 16 colunas posicionais).
  - `PENDENCIAS_UNICO.csv`: Relatório detalhado para conferência antes da escrituração contábil.
  - Backup e Restauração completa de lançamentos em formato `.json`.

### 2. Conciliação Bancária Inteligente
- **Modo 1 (Conta do Sistema)**: Cruzamento automático entre extratos bancários e lançamentos registrados com tolerância configurável de dias.
- **Modo 2 (Extrato × Planilha / Balancete / NF-e XML)**: Conferência de pagamentos por fornecedor, balancete do SCI e parcelas extraídas de XMLs de compra.
- **Conciliação Manual Flexível**: Agrupamento de lançamentos múltiplos com justificativa de divergência e conferência avulsa.

### 3. Apuração Parcial de ICMS
- Leitura de XMLs avulsos ou compactados em `.zip` de NF-e e NFC-e.
- Agrupamento automático por **CFOP** com conversão de notas de fornecedores para entradas equivalentes (5102 → 1102, 5405 → 1403).
- Chave seletora "Entra / Ignorado" na apuração por CFOP com regras personalizadas salvas localmente.
- Painel de ajustes fiscais manuais: saldo credor anterior, outros créditos (CIAP, TTD) e outros débitos.
- Exportação de planilha em formato Excel (.xlsx) com abas de Resumo e Detalhamento por CFOP.

### 4. Auditor IBS / CBS (Reforma Tributária LC 214/2025)
- Conferência de itens com validação de CST, base de cálculo, alíquotas nominais e alíquotas efetivas com redutores legais.
- Sinalização de conformidade: **OK**, **Atenção** e **Erro** com explicações fiscais detalhadas.
- Simulador / Calculadora avulsa de IBS (Estadual + Municipal) e CBS (Federal).
- Tabela oficial de CSTs vigentes da Reforma Tributária com busca em tempo real.

### 5. ISS de Tubarão (Meu ISS / Prefeitura Moderna)
- Leitura de XMLs do Movimento Econômico municipal.
- Apuração do ISS Próprio, ISS Retido na Fonte (tomador) e retenções federais (PIS, COFINS, CSLL, IRRF).
- Conferência de divergências em alíquotas e bases de cálculo.
- Exportação e conferência comparativa por competência.

### 6. Painel de Vencimentos & Compliance dos Clientes
- Monitoramento contínuo de vencimentos de conformidade: Certificados Digitais A1, CND Federal, CND Estadual, CND Municipal, CRF FGTS, Alvarás, Procurações e Licenças.
- Classificação por faixas de prazo: **Vencidos**, **Até 7 dias**, **8 a 15 dias**, **16 a 30 dias** e **Em dia**.
- Geração automática de templates de aviso e disparo com um clique para o **WhatsApp** do cliente.

### 7. Controle de Horas do Departamento Pessoal
- Folhas de presença dos funcionários de clientes sem ponto eletrônico.
- Geração de modelo padronizado em Excel para o cliente preencher.
- Importação, cálculo de horas extras, adicional noturno e fechamento mensal.

### 8. Em Dia: Fechamento & Passagem de Bastão
- Checklist diário e mensal por setor (Contábil, Fiscal, Pessoal e Escritório).
- Passagem de bastão em caso de férias ou ausências, transferindo pendências temporárias com rastreabilidade.

### 9. Dashboard Início com Resumo do Dia
- Saudação inteligente com atalhos setoriais.
- 4 mini-cards dinâmicos com contadores de pendências: *Para fazer hoje*, *Fechamento*, *A conferir* e *Vence em 7 dias*.
- Modo de demonstração com carga de dados fictícios para apresentações comerciais.

---

## 🌳 Governança Git & Estrutura de Branches

Para garantir um padrão corporativo de alto nível, este repositório adota uma política de branches baseada em **GitFlow**:

```
makerpixel-gestao/
├── main                                     # Código estável de produção
├── develop                                  # Branch de integração contínua (Staging)
├── feature/tax-auditor-ibs-cbs              # Módulo de Auditoria IBS/CBS (LC 214/2025)
├── feature/icms-tax-assessment              # Módulo de Apuração Parcial de ICMS
├── feature/compliance-expiration-panel      # Painel de Vencimentos (A1, CNDs, Alvarás)
├── feature/pwa-mobile-responsiveness        # Suporte a PWA, tema Obsidian e responsividade mobile
└── gh-pages                                 # Deploy de produção do GitHub Pages
```

---

## 🧪 Qualidade de Código & Testes Automatizados

O sistema conta com **226 testes unitários e de integração automatizados** cobrindo todas as regras de negócio, parsers de arquivos bancários, segurança criptográfica e integridade de cálculos:

```bash
# Executar a suíte completa de testes
npm test
```

```
ℹ tests 226
ℹ suites 56
ℹ pass 226
ℹ fail 0
ℹ duration_ms ~30s
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior (testado e homologado no Node.js v24).
- **NPM** ou qualquer navegador moderno com suporte a HTML5 / ES6.

### Execução Instantânea

```bash
# 1. Clonar o repositório
git clone https://github.com/Mauricio-G-Oliveira/makerpixel-gestao.git

# 2. Acessar a pasta do projeto
cd makerpixel-gestao

# 3. Rodar os testes automatizados
npm test

# 4. Servir localmente (usando qualquer servidor estático ou npx serve)
npx serve .
```

Acesse em seu navegador: **`http://localhost:3000`**

### Modo de Teste
Na tela de login (`login.html`), clique em **"Entrar no modo de teste"** para acessar imediatamente todas as telas e funcionalidades sem necessidade de credenciais prévias. Os dados são salvos localmente no navegador.

---

## 🗺️ Roadmap de Evolução Técnica

- [x] **Fase 1 (Frontend, Módulos & PWA)**: Interface MakerPixel Obsidian Dark & Light, PWA instalável, motores de conciliação bancária, apuração de ICMS, auditor IBS/CBS, ISS Tubarão, controle de horas, painel de vencimentos e Em Dia.
- [ ] **Fase 2 (Backend Java Spring Boot 3)**:
  - API RESTful em Java 21 com Spring Boot 3, Spring Security e JWT.
  - Banco de dados relacional (PostgreSQL).
  - Sincronização multi-usuário em nuvem com isolamento multi-tenant.
- [ ] **Fase 3 (Integração Direta SEFAZ)**:
  - Consulta automática de notas fiscais via certificado digital A1 direto dos webservices da SEFAZ.

---

## 👨‍💻 Autor

Desenvolvido por **Mauricio G. Oliveira**  
🔗 [GitHub: @Mauricio-G-Oliveira](https://github.com/Mauricio-G-Oliveira)

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.
