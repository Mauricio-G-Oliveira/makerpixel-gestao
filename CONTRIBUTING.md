# Guia de Contribuição e Governança Git

Este documento estabelece o fluxo de trabalho de versionamento, convenções de branches e padrões de commit adotados no **MakerPixel Techsystem**.

---

## 🌳 Modelo de Branches (GitFlow Adaptado)

O projeto adota uma estratégia estruturada de branching para garantir previsibilidade, isolamento de escopo e deploy contínuo estável.

```
┌───────┐      ┌───────┐      ┌─────────┐
│ main  │◄─────│release│◄─────│ develop │
└───────┘      └───────┘      └────┬────┘
    ▲                              │
    │                              ▼
┌───┴────┐                  ┌──────────────┐
│ hotfix │                  │  feature/*   │
└────────┘                  └──────────────┘
```

### 1. Branches Principais (Permanentes)

| Branch | Finalidade | Estabilidade |
|---|---|---|
| `main` | Código de produção estável. Cada commit em `main` corresponde a uma release versionada (tag semântica). | 🟢 Alta (Produção) |
| `develop` | Branch de integração contínua. Centraliza as novas funcionalidades prontas para homologação antes de cada release. | 🟡 Em testes (Staging) |
| `gh-pages` | Branch dedicada ao bundle de produção compilado para hospedagem no GitHub Pages. | 🟢 Deploy Automático |

### 2. Branches de Suporte (Temporárias)

- **`feature/<modulo-ou-recurso>`**: Criada a partir de `develop` para desenvolvimento de novas funcionalidades isoladas.
  - Exemplos:
    - `feature/tax-auditor-ibs-cbs`
    - `feature/icms-tax-assessment`
    - `feature/compliance-expiration-panel`
    - `feature/pwa-mobile-responsiveness`
- **`bugfix/<descricao>`**: Correções de problemas identificados em ambiente de homologação (`develop`).
- **`hotfix/<versao>`**: Correções críticas emergenciais aplicadas diretamente sobre a `main` e retroalimentadas em `develop`.

---

## 📝 Padrão de Mensagens de Commit (Conventional Commits)

Seguimos a convenção [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição no imperativo e concisa>

[corpo opcional explicando motivação e decisões]

[rodapé opcional com referências a issues: Closes #12]
```

### Tipos Permitidos

- `feat`: Nova funcionalidade para o usuário ou módulo.
- `fix`: Correção de bug.
- `docs`: Alterações exclusivamente em documentação.
- `style`: Formatação, ponto e vírgula, sem alteração de lógica.
- `refactor`: Refatoração de código que não adiciona recurso nem corrige bug.
- `perf`: Melhoria de desempenho.
- `test`: Adição ou refatoração de testes automatizados.
- `chore`: Atualização de tarefas de build, pacotes ou infraestrutura.

---

## 🧪 Checklist de Qualidade para Pull Requests (PR)

Antes de abrir um Pull Request para a branch `develop` ou `main`:

- [ ] Todos os 124 testes unitários devem passar sem falhas (`npm test`).
- [ ] O build de produção deve compilar sem alertas impeditivos (`npm run build`).
- [ ] O código deve respeitar a responsividade em desktop e dispositivos móveis.
- [ ] Nenhuma credencial ou dado sensível deve ser comitado.
