# MakerPixel Techsystem — Gestão Financeira & Integração Contábil

Sistema moderno de gestão financeira, conciliação bancária multi-extratos e integração contábil com o **SCI Único**, desenvolvido em **React 19**, **TypeScript** e **Tailwind CSS**, com a identidade visual da **MakerPixel Techsystem**.

---

## 🚀 Como Executar

### 1. Iniciar em Modo de Desenvolvimento (Vite)

```bash
cd makerpixel-techsystem
npm run dev
```

O sistema abrirá automaticamente em `http://localhost:3000`.

### 2. Credenciais de Acesso (Login Demo)

O sistema conta com tela de login profissional e controle de acesso baseado em perfis (Stageflow standard):

- **Administrador**: `admin@makerpixeltech.com` / `admin123` (Acesso irrestrito a todas as áreas e ao painel Admin)
- **Contadora / Fiscal**: `contador@makerpixeltech.com` / `conta123` (Acesso à integração, lançamentos e conciliação)
- **Operador / Financeiro**: `operador@makerpixeltech.com` / `oper123` (Lançamentos e importação de extratos)

---

## 🌟 Funcionalidades e Paridade (100% Compatível com o Legado)

### 1. Painel Master (SCI Único)
- **Resumo por Competência**: Acompanhamento de classificados, pendentes e percentual de conclusão por Unidade e por Banco.
- **Distribuição por Unidade**: Classificação automática conforme regras contábeis da macro VBA v30 (débito, crédito e histórico padrão - HP).
- **Geração de Arquivos Oficiais**:
  - `UNICO_<Unidade>.txt`: Layout oficial do SCI Único (UTF-8 com BOM, CRLF, 16 colunas separadas por vírgula).
  - `PENDENCIAS_UNICO.csv`: Relatório de inconsistências para conferência rápida.
  - Arquivos TXT no Formato Atual (tabulado por unidade e categoria).
- **Backup e Restauração**: Download e restauração instantânea de arquivo `.json` com todos os dados salvos no navegador.

### 2. Contas Bancárias e Lançamentos
- Cadastro de bancos (Sicoob, Sicredi, Caixa, BB, Itaú, Bradesco, Santander, etc.).
- Formulário com validação inteligente, modelos de documento (NF, NFS-E, PIX, BOL), alternador C/D (Crédito/Débito) e autocompletes de natureza de despesa e favorecido.
- **Sugestão Inteligente de Classificação**: Aprende com lançamentos passados via CNPJ e histórico, com botão para confirmar em lote.
- Totalizadores em tempo real (Entradas, Saídas e Saldo Líquido).
- Exportações: "Copiar para o Excel (TSV)" e "Exportar CSV".

### 3. Conciliação Bancária Completa
- **Modo 1 (Conta do Sistema)**: Cruzamento automático entre extrato bancário (PDF, OFX, TXT Sicoob, CSV) e lançamentos da conta, com tolerância configurável de datas.
- **Modo 2 (Extrato × Planilha / Balancete / NF-e XML)**:
  - Conferência por fornecedor a partir do Balancete do SCI Único.
  - Vínculo inteligente de pagamentos sem favorecido memorizado por CNPJ.
  - Suporte a XMLs de NF-e (.xml ou .zip) com extração de parcelas por vencimento.
- **Conciliação Manual**: Seleção múltipla para juntar valores (com justificativa de divergência) ou marcar como conferido avulso.

### 4. Área de Administração (Padrão Stageflow)
- **Gestão de Usuários**: Criação, edição, ativação/desativação e controle de cargos.
- **Configurações da Empresa & SCI**: Razão social, CNPJ, código SCI padrão e regras contábeis configuráveis.
- **Logs de Auditoria em Tempo Real**: Rastreabilidade completa de todas as operações realizadas no sistema.
- **Blueprint para Transição Java**: Documentação de endpoints REST e entidades JPA preparados para a próxima fase.

---

## 🧪 Testes Automatizados

Para rodar os 124 testes automatizados cobrindo todas as regras contábeis e parsers:

```bash
npm test
```
