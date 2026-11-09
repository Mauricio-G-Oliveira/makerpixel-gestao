/**
 * carteira.mjs — Carteira por responsável e departamento.
 * 
 * Regras:
 * - Importação de planilha de responsáveis: CNPJ, departamento, e-mail do responsável.
 * - Guarda, por empresa, o responsável de cada departamento.
 * - Carteira automática: usuário vê empresas em que é responsável.
 *   - Com setores marcados: conta só onde é responsável daqueles departamentos.
 *   - Sem setor marcado: vale qualquer departamento onde é responsável.
 * - Empresas a mais: exceções manuais (cobertura de férias) que sempre somam.
 * - Admin vê tudo (o filtro é só de tela).
 * - Lista de responsáveis da planilha que ainda não têm acesso.
 */

export const DEPARTAMENTOS_CARTEIRA = [
  { id: "cadastro", nome: "Cadastro", rotulo: "Departamento Cadastro" },
  { id: "fiscal", nome: "Fiscal", rotulo: "Departamento Fiscal" },
  { id: "pessoal", nome: "Pessoal", rotulo: "Departamento Pessoal" },
  { id: "contabil", nome: "Contábil", rotulo: "Departamento Contábil" },
  { id: "financeiro", nome: "Financeiro", rotulo: "Financeiro" },
  { id: "societario", nome: "Societário", rotulo: "Societário" }
];

export function normEmail(s) {
  return String(s || "").trim().toLowerCase();
}

export function normDoc(s) {
  return String(s || "").replace(/\D/g, "");
}

export function normalizarDepartamento(dep) {
  const d = String(dep || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  if (/cadastr|alvara|venciment/.test(d)) return "cadastro";
  if (/fisc|tribut/.test(d)) return "fiscal";
  if (/pessoal|\bdp\b|\brh\b|horas|folha/.test(d)) return "pessoal";
  if (/contab|balanc|lucro/.test(d)) return "contabil";
  if (/financ/.test(d)) return "financeiro";
  if (/societ|contrat/.test(d)) return "societario";
  return d;
}

/**
 * Lê e obtém dados de um responsável de empresa por departamento.
 * Retorna { email, nome } ou null.
 */
export function obterResponsavel(empresa, dep) {
  if (!empresa || !empresa.responsaveis) return null;
  const dNorm = normalizarDepartamento(dep);
  const resp = empresa.responsaveis[dNorm] || empresa.responsaveis[dep];
  if (!resp) return null;
  if (typeof resp === "string") return { email: normEmail(resp), nome: "" };
  return { email: normEmail(resp.email), nome: String(resp.nome || "") };
}

/**
 * Importa planilha de responsáveis (CNPJ, departamento, e-mail do responsável, nome opcional).
 * Linhas podem ser array de objetos ou matriz (array de arrays).
 * Atualiza `empresa.responsaveis` por departamento para cada empresa encontrada em `empresas`.
 */
export function importarPlanilhaResponsaveis(linhas, empresas) {
  const listaEmpresas = Array.isArray(empresas) ? empresas : [];
  let rows = [];

  if (!Array.isArray(linhas)) return { totalLinhas: 0, atualizadas: 0, ignoradas: 0, erros: [] };

  if (linhas.length > 0 && Array.isArray(linhas[0])) {
    // Matriz de linhas: encontra cabeçalho
    const cab = linhas[0].map((c) => String(c || "").trim().toLowerCase());
    const idxCnpj = cab.findIndex((c) => /cnpj|cpf|documento/.test(c));
    const idxDepto = cab.findIndex((c) => /departamento|depto|setor|area/.test(c));
    const idxEmail = cab.findIndex((c) => /email|e-mail|responsavel|usuario/.test(c));
    const idxNome = cab.findIndex((c) => /nome/.test(c) && !/empresa|razao/.test(c));

    for (let i = 1; i < linhas.length; i++) {
      const r = linhas[i];
      if (!r || !r.length) continue;
      rows.push({
        cnpj: idxCnpj >= 0 ? r[idxCnpj] : r[0],
        departamento: idxDepto >= 0 ? r[idxDepto] : r[1],
        email: idxEmail >= 0 ? r[idxEmail] : r[2],
        nome: idxNome >= 0 ? r[idxNome] : ""
      });
    }
  } else {
    // Array de objetos
    rows = linhas.map((r) => {
      const chaves = Object.keys(r);
      const kCnpj = chaves.find((k) => /cnpj|cpf|documento/i.test(k));
      const kDepto = chaves.find((k) => /departamento|depto|setor|area/i.test(k));
      const kEmail = chaves.find((k) => /email|e-mail|responsavel/i.test(k));
      const kNome = chaves.find((k) => /nome/i.test(k) && !/empresa|razao/i.test(k));

      return {
        cnpj: kCnpj ? r[kCnpj] : r.cnpj || r.documento,
        departamento: kDepto ? r[kDepto] : r.departamento || r.setor,
        email: kEmail ? r[kEmail] : r.email || r.responsavel,
        nome: kNome ? r[kNome] : r.nome || ""
      };
    });
  }

  let atualizadas = 0;
  let ignoradas = 0;
  const erros = [];
  const empresasModificadas = new Set();

  rows.forEach((l, idx) => {
    const doc = normDoc(l.cnpj);
    const email = normEmail(l.email);
    const depto = normalizarDepartamento(l.departamento);

    if (!doc || !email || !depto) {
      ignoradas++;
      return;
    }

    const emp = listaEmpresas.find((c) => normDoc(c.documento) === doc);
    if (!emp) {
      erros.push(`Linha ${idx + 2}: CNPJ ${l.cnpj} não encontrado nas empresas.`);
      ignoradas++;
      return;
    }

    if (!emp.responsaveis) emp.responsaveis = {};
    emp.responsaveis[depto] = { email, nome: String(l.nome || "").trim() };
    empresasModificadas.add(emp.id || emp.documento);
    atualizadas++;
  });

  return {
    totalLinhas: rows.length,
    atualizadas,
    empresasAfetadas: empresasModificadas.size,
    ignoradas,
    erros
  };
}

/**
 * Conta em quantas empresas um e-mail é responsável por setor,
 * e calcula o total geral de empresas distintas.
 */
export function contagemPorSetor(empresas, email) {
  const lista = Array.isArray(empresas) ? empresas : [];
  const eAlvo = normEmail(email);

  const porSetor = {};
  DEPARTAMENTOS_CARTEIRA.forEach((d) => {
    porSetor[d.id] = 0;
  });

  const empresasComUsuario = new Set();

  lista.forEach((emp) => {
    if (!emp.responsaveis) return;
    let responsavelEmAlgum = false;

    Object.keys(emp.responsaveis).forEach((depKey) => {
      const resp = obterResponsavel(emp, depKey);
      if (resp && resp.email === eAlvo) {
        responsavelEmAlgum = true;
        const dNorm = normalizarDepartamento(depKey);
        porSetor[dNorm] = (porSetor[dNorm] || 0) + 1;
      }
    });

    if (responsavelEmAlgum) {
      empresasComUsuario.add(emp.id || emp.documento);
    }
  });

  return {
    porSetor,
    total: empresasComUsuario.size,
    contarMarcados: (setores) => {
      if (!Array.isArray(setores) || setores.length === 0) {
        return empresasComUsuario.size;
      }
      const setoresNorm = setores.map(normalizarDepartamento);
      const distintas = new Set();

      lista.forEach((emp) => {
        if (!emp.responsaveis) return;
        const ehResp = setoresNorm.some((setor) => {
          const resp = obterResponsavel(emp, setor);
          return resp && resp.email === eAlvo;
        });
        if (ehResp) distintas.add(emp.id || emp.documento);
      });

      return distintas.size;
    }
  };
}

/**
 * Cria o predicado de filtro para a carteira de um usuário:
 * - Admin vê tudo (retorna true para todas as empresas).
 * - "Carteira automática": vê as empresas em que é o responsável.
 *   - Com setores marcados: conta só onde é o responsável daqueles departamentos.
 *   - Sem setor marcado: vale qualquer departamento.
 * - "Empresas a mais": exceções manuais (ids ou documentos de empresas), que sempre somam.
 */
export function criarFiltro(usuario) {
  if (!usuario) return () => false;
  if (usuario.perfil === "admin") return () => true;

  const emailUsuario = normEmail(usuario.email);
  const carteiraAuto = usuario.carteiraAutomatica !== false;
  const setores = Array.isArray(usuario.setoresCarteira) ? usuario.setoresCarteira.map(normalizarDepartamento) : [];
  const temSetores = setores.length > 0;
  const aMais = new Set(Array.isArray(usuario.empresasAMais) ? usuario.empresasAMais.map(String) : []);

  return function (empresa) {
    if (!empresa) return false;

    // 1. Exceção manual ("Empresas a mais" / cobertura de férias)
    const empId = String(empresa.id || "");
    const empDoc = normDoc(empresa.documento);
    if ((empId && aMais.has(empId)) || (empDoc && aMais.has(empDoc))) {
      return true;
    }

    // 2. Se não tem carteira automática, para por aqui
    if (!carteiraAuto || !emailUsuario) return false;

    // 3. Carteira automática
    const respObj = empresa.responsaveis;
    if (!respObj) return false;

    if (temSetores) {
      // Setores marcados: deve ser responsável de ao menos um dos setores especificados
      return setores.some((setor) => {
        const resp = obterResponsavel(empresa, setor);
        return resp && resp.email === emailUsuario;
      });
    }

    // Sem setor marcado: vale qualquer departamento onde ele conste como responsável
    return Object.keys(respObj).some((depKey) => {
      const resp = obterResponsavel(empresa, depKey);
      return resp && resp.email === emailUsuario;
    });
  };
}

/**
 * Filtra a lista de empresas pela carteira do usuário.
 */
export function filtrarEmpresas(empresas, usuario) {
  if (!Array.isArray(empresas)) return [];
  const filtro = criarFiltro(usuario);
  return empresas.filter(filtro);
}

/**
 * Identifica os responsáveis presentes na planilha/empresas que ainda não possuem
 * usuário cadastrado no sistema.
 */
export function responsaveisSemAcesso(empresas, usuarios) {
  const listaEmpresas = Array.isArray(empresas) ? empresas : [];
  const emailsUsuarios = new Set((usuarios || []).map((u) => normEmail(u.email)).filter(Boolean));

  const mapa = new Map();

  listaEmpresas.forEach((emp) => {
    if (!emp.responsaveis) return;
    Object.keys(emp.responsaveis).forEach((depKey) => {
      const resp = obterResponsavel(emp, depKey);
      if (!resp || !resp.email) return;
      if (emailsUsuarios.has(resp.email)) return;

      const dNorm = normalizarDepartamento(depKey);
      const atual = mapa.get(resp.email) || {
        email: resp.email,
        nome: resp.nome || "",
        empresasIds: new Set(),
        departamentos: new Set()
      };

      if (!atual.nome && resp.nome) atual.nome = resp.nome;
      atual.empresasIds.add(emp.id || emp.documento);
      atual.departamentos.add(dNorm);
      mapa.set(resp.email, atual);
    });
  });

  return Array.from(mapa.values())
    .map((item) => ({
      email: item.email,
      nome: item.nome || item.email.split("@")[0].replace(/[._-]/g, " "),
      empresasQtd: item.empresasIds.size,
      departamentos: Array.from(item.departamentos)
    }))
    .sort((a, b) => b.empresasQtd - a.empresasQtd || a.email.localeCompare(b.email));
}
