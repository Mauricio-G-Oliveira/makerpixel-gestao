import test from "node:test";
import assert from "node:assert/strict";
import {
  criarFiltro,
  filtrarEmpresas,
  contagemPorSetor,
  importarPlanilhaResponsaveis,
  responsaveisSemAcesso
} from "../src/lib/carteira.mjs";

test("Etapa 3 - criarFiltro: admin vê tudo", () => {
  const empresas = [
    { id: "1", nome: "Empresa 1", documento: "11.222.333/0001-81", responsaveis: { fiscal: "outro@escritorio.com.br" } },
    { id: "2", nome: "Empresa 2", documento: "44.555.666/0001-77", responsaveis: {} }
  ];

  const admin = { perfil: "admin", email: "admin@escritorio.com.br" };
  const filtro = criarFiltro(admin);

  assert.equal(filtro(empresas[0]), true);
  assert.equal(filtro(empresas[1]), true);
  assert.equal(filtrarEmpresas(empresas, admin).length, 2);
});

test("Etapa 3 - criarFiltro: carteira automática sem setor marcado vale qualquer departamento", () => {
  const empresas = [
    { id: "1", nome: "Empresa 1", documento: "11.222.333/0001-81", responsaveis: { fiscal: "joao@escritorio.com.br" } },
    { id: "2", nome: "Empresa 2", documento: "44.555.666/0001-77", responsaveis: { contabil: "joao@escritorio.com.br" } },
    { id: "3", nome: "Empresa 3", documento: "77.888.999/0001-55", responsaveis: { pessoal: "maria@escritorio.com.br" } }
  ];

  const usuario = {
    perfil: "usuario",
    email: "joao@escritorio.com.br",
    carteiraAutomatica: true,
    setoresCarteira: [] // sem setor marcado
  };

  const filtro = criarFiltro(usuario);
  assert.equal(filtro(empresas[0]), true);
  assert.equal(filtro(empresas[1]), true);
  assert.equal(filtro(empresas[2]), false);

  const resultado = filtrarEmpresas(empresas, usuario);
  assert.deepEqual(resultado.map((e) => e.id), ["1", "2"]);
});

test("Etapa 3 - criarFiltro: com setores marcados conta só onde é responsável daqueles departamentos", () => {
  const empresas = [
    // João é do Cadastro
    { id: "1", nome: "Empresa 1", documento: "11.222.333/0001-81", responsaveis: { cadastro: "joao@escritorio.com.br", fiscal: "maria@escritorio.com.br" } },
    // João é apenas do Fiscal nesta empresa
    { id: "2", nome: "Empresa 2", documento: "44.555.666/0001-77", responsaveis: { fiscal: "joao@escritorio.com.br", cadastro: "pedro@escritorio.com.br" } },
    // João é do Contábil nesta
    { id: "3", nome: "Empresa 3", documento: "77.888.999/0001-55", responsaveis: { contabil: "joao@escritorio.com.br" } }
  ];

  // Usuário do Cadastro com setor "cadastro" marcado
  const usuarioCadastro = {
    perfil: "usuario",
    email: "joao@escritorio.com.br",
    carteiraAutomatica: true,
    setoresCarteira: ["cadastro"]
  };

  const filtro = criarFiltro(usuarioCadastro);
  // Empresa 1 tem João no cadastro -> true
  assert.equal(filtro(empresas[0]), true);
  // Empresa 2 tem João apenas no fiscal -> false (quem é do Cadastro não ganha onde é só do Fiscal)
  assert.equal(filtro(empresas[1]), false);
  // Empresa 3 tem João no contábil -> false
  assert.equal(filtro(empresas[2]), false);

  const res = filtrarEmpresas(empresas, usuarioCadastro);
  assert.deepEqual(res.map((e) => e.id), ["1"]);
});

test("Etapa 3 - criarFiltro: 'Empresas a mais' (exceções manuais como férias) sempre somam", () => {
  const empresas = [
    { id: "1", nome: "Empresa 1", documento: "11.222.333/0001-81", responsaveis: { fiscal: "joao@escritorio.com.br" } },
    { id: "2", nome: "Empresa 2", documento: "44.555.666/0001-77", responsaveis: { fiscal: "maria@escritorio.com.br" } },
    { id: "3", nome: "Empresa 3", documento: "77.888.999/0001-55", responsaveis: { fiscal: "pedro@escritorio.com.br" } }
  ];

  const usuario = {
    perfil: "usuario",
    email: "joao@escritorio.com.br",
    carteiraAutomatica: true,
    setoresCarteira: ["fiscal"],
    empresasAMais: ["2"] // cobrindo férias na Empresa 2
  };

  const filtro = criarFiltro(usuario);
  assert.equal(filtro(empresas[0]), true); // automática
  assert.equal(filtro(empresas[1]), true); // exceção manual
  assert.equal(filtro(empresas[2]), false);

  const res = filtrarEmpresas(empresas, usuario);
  assert.deepEqual(res.map((e) => e.id), ["1", "2"]);
});

test("Etapa 3 - contagemPorSetor: conta empresas por setor e calcula total de empresas distintas", () => {
  const empresas = [
    {
      id: "1",
      nome: "Empresa 1",
      responsaveis: {
        cadastro: "ana@escritorio.com.br",
        fiscal: "ana@escritorio.com.br",
        contabil: "carlos@escritorio.com.br"
      }
    },
    {
      id: "2",
      nome: "Empresa 2",
      responsaveis: {
        cadastro: "ana@escritorio.com.br",
        pessoal: "ana@escritorio.com.br"
      }
    },
    {
      id: "3",
      nome: "Empresa 3",
      responsaveis: {
        fiscal: "ana@escritorio.com.br"
      }
    },
    {
      id: "4",
      nome: "Empresa 4",
      responsaveis: {
        contabil: "carlos@escritorio.com.br"
      }
    }
  ];

  const c = contagemPorSetor(empresas, "ana@escritorio.com.br");

  // Cadastro: Empresa 1 e Empresa 2 (2)
  assert.equal(c.porSetor.cadastro, 2);
  // Fiscal: Empresa 1 e Empresa 3 (2)
  assert.equal(c.porSetor.fiscal, 2);
  // Pessoal: Empresa 2 (1)
  assert.equal(c.porSetor.pessoal, 1);
  // Contábil: 0
  assert.equal(c.porSetor.contabil, 0);

  // Total de empresas distintas onde Ana é responsável: Empresa 1, 2 e 3 = 3 empresas
  assert.equal(c.total, 3);

  // Se marcar apenas Fiscal: 2 empresas (1 e 3)
  assert.equal(c.contarMarcados(["fiscal"]), 2);
  // Se marcar Cadastro e Fiscal: 3 empresas (1, 2, 3)
  assert.equal(c.contarMarcados(["cadastro", "fiscal"]), 3);
  // Se não marcar nenhum setor: conta em todos (3)
  assert.equal(c.contarMarcados([]), 3);
});

test("Etapa 3 - importarPlanilhaResponsaveis e responsaveisSemAcesso", () => {
  const empresas = [
    { id: "e1", nome: "Empresa Alfa", documento: "11.222.333/0001-81" },
    { id: "e2", nome: "Empresa Beta", documento: "44.555.666/0001-77" }
  ];

  const linhas = [
    { cnpj: "11.222.333/0001-81", departamento: "Contábil", email: "julia@escritorio.com.br", nome: "Júlia Silva" },
    { cnpj: "11.222.333/0001-81", departamento: "Fiscal", email: "ricardo@escritorio.com.br", nome: "Ricardo Santos" },
    { cnpj: "44.555.666/0001-77", departamento: "Pessoal", email: "ricardo@escritorio.com.br", nome: "Ricardo Santos" }
  ];

  const resultado = importarPlanilhaResponsaveis(linhas, empresas);
  assert.equal(resultado.atualizadas, 3);
  assert.equal(resultado.empresasAfetadas, 2);

  assert.equal(empresas[0].responsaveis.contabil.email, "julia@escritorio.com.br");
  assert.equal(empresas[0].responsaveis.fiscal.email, "ricardo@escritorio.com.br");
  assert.equal(empresas[1].responsaveis.pessoal.email, "ricardo@escritorio.com.br");

  // Identifica responsáveis que ainda não têm usuário
  const usuariosExistentes = [
    { email: "julia@escritorio.com.br", nome: "Júlia Silva" }
  ];

  const semAcesso = responsaveisSemAcesso(empresas, usuariosExistentes);
  assert.equal(semAcesso.length, 1);
  assert.equal(semAcesso[0].email, "ricardo@escritorio.com.br");
  assert.equal(semAcesso[0].nome, "Ricardo Santos");
  assert.equal(semAcesso[0].empresasQtd, 2);
});
