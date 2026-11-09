import test from "node:test";
import assert from "node:assert/strict";
import {
  abaDoTipo,
  notaDaBusca,
  ordenarPelaBusca,
  destinoDoPdf,
  quemVeFaturamentos,
  criarDepCadastro,
  CERTIFICADO
} from "../src/lib/depCadastro.mjs";
import { nomeDaFolha } from "../src/lib/horas/planilha.mjs";

test("Etapa 2 - abaDoTipo divide em alvaras, certificados e certidoes", () => {
  assert.equal(abaDoTipo("Alvará de Funcionamento"), "alvaras");
  assert.equal(abaDoTipo("Alvará Sanitário"), "alvaras");
  assert.equal(abaDoTipo("Alvará Bombeiros"), "alvaras");

  assert.equal(abaDoTipo(CERTIFICADO), "certificados");
  assert.equal(abaDoTipo("Certificado Digital"), "certificados");
  assert.equal(abaDoTipo("e-CNPJ"), "certificados");
  assert.equal(abaDoTipo("e-CPF"), "certificados");

  assert.equal(abaDoTipo("CRF FGTS"), "certidoes");
  assert.equal(abaDoTipo("CND Federal"), "certidoes");
  assert.equal(abaDoTipo("CND Estadual"), "certidoes");
  assert.equal(abaDoTipo("CND Trabalhista"), "certidoes");
  assert.equal(abaDoTipo("Qualquer Outra"), "certidoes");
});

test("Etapa 2 - notaDaBusca e ordenarPelaBusca seguem os pesos definidos", () => {
  const empresas = [
    { id: "1", codigo: "10", documento: "11.222.333/0001-81", nome: "Silva e Santos Ltda", fantasia: "Mercado Central", cidade: "Curitiba" },
    { id: "2", codigo: "20", documento: "44.555.666/0001-77", nome: "Empresa Central de Servicos", fantasia: "Central Serv", cidade: "Joinville" },
    { id: "3", codigo: "30", documento: "77.888.999/0001-55", nome: "Padaria Alvorada Ltda", fantasia: "Alvorada", cidade: "Curitiba" },
    { id: "4", codigo: "40", documento: "11.222.999/0001-99", nome: "Comercial Silva Ltda", fantasia: "Silva Super", cidade: "Florianopolis" }
  ];

  // CNPJ exato com ou sem pontuação = 100
  assert.equal(notaDaBusca(empresas[0], "11.222.333/0001-81"), 100);
  assert.equal(notaDaBusca(empresas[0], "11222333000181"), 100);

  // Código = 90
  assert.equal(notaDaBusca(empresas[1], "20"), 90);

  // Parte do CNPJ = 80
  assert.equal(notaDaBusca(empresas[0], "222333"), 80);

  // Começo do nome = 60
  assert.equal(notaDaBusca(empresas[1], "Empresa"), 60);

  // Meio do nome = 40
  assert.equal(notaDaBusca(empresas[0], "Santos"), 40);
  assert.equal(notaDaBusca(empresas[2], "Alvorada"), 40);

  // Fantasia = 35
  const empFantasia = { id: "5", codigo: "50", documento: "00.111.222/0001-33", nome: "Beta Transportes", fantasia: "Expresso Rápido", cidade: "Itajaí" };
  assert.equal(notaDaBusca(empFantasia, "Expresso"), 35);

  // Cidade = 20
  assert.equal(notaDaBusca(empresas[0], "Curitiba"), 20);

  // Ordenação com ordenarPelaBusca
  const ordenadas = ordenarPelaBusca(empresas, "Central");
  // "Empresa Central de Servicos" tem "Central" no nome (40) e fantasia (35) -> nota 40
  // "Silva e Santos Ltda" tem fantasia "Mercado Central" -> nota 35
  assert.equal(ordenadas[0].id, "2");
  assert.equal(ordenadas[1].id, "1");
});

test("Etapa 2 - destinoDoPdf avalia se Cadastra, Renova, Anexa o PDF ou Não grava", () => {
  const docsExistentes = [
    { id: "d1", clienteId: "c1", tipo: "CRF FGTS", vencimento: "2026-06-30" },
    { id: "d2", clienteId: "c1", tipo: "CND Federal", vencimento: "2026-08-15" },
    { id: "d3", clienteId: "c1", tipo: "Alvará Sanitário", vencimento: "" }
  ];

  // 1. Cadastra: novo documento inexistente
  assert.equal(destinoDoPdf({ clienteId: "c1", tipo: "CND Estadual", vencimento: "2026-07-01" }, docsExistentes), "Cadastra");
  assert.equal(destinoDoPdf({ clienteId: "c2", tipo: "CRF FGTS", vencimento: "2026-07-01" }, docsExistentes), "Cadastra");

  // 2. Renova: vence depois do atual
  assert.equal(destinoDoPdf({ clienteId: "c1", tipo: "CRF FGTS", vencimento: "2026-07-31" }, docsExistentes), "Renova");

  // 3. Anexa o PDF: mesmo vencimento ou documento sem data
  assert.equal(destinoDoPdf({ clienteId: "c1", tipo: "CRF FGTS", vencimento: "2026-06-30" }, docsExistentes), "Anexa o PDF");
  assert.equal(destinoDoPdf({ clienteId: "c1", tipo: "Alvará Sanitário", vencimento: "" }, docsExistentes), "Anexa o PDF");

  // 4. Não grava: vence antes do atual
  assert.equal(destinoDoPdf({ clienteId: "c1", tipo: "CND Federal", vencimento: "2026-05-10" }, docsExistentes), "Não grava");
});

test("Etapa 2 - gravarPdf executa ações correspondentes no store", async () => {
  const ls = {};
  const dep = criarDepCadastro({
    ls: {
      getItem: (k) => (k in ls ? ls[k] : null),
      setItem: (k, v) => { ls[k] = String(v); }
    },
    agora: () => new Date(2026, 9, 20, 10)
  });

  const emp = dep.salvarEmpresa({ nome: "Empresa Modelo Ltda", documento: "11.222.333/0001-81" });

  // 1. Cadastra
  const res1 = await dep.gravarPdf({
    clienteId: emp.id,
    tipo: "CRF FGTS",
    vencimento: "2026-06-30",
    numero: "123456"
  });
  assert.equal(res1.destino, "Cadastra");
  assert.equal(res1.doc.tipo, "CRF FGTS");
  assert.equal(res1.doc.vencimento, "2026-06-30");

  // 2. Renova
  const res2 = await dep.gravarPdf({
    clienteId: emp.id,
    tipo: "CRF FGTS",
    vencimento: "2026-07-30",
    numero: "789012"
  });
  assert.equal(res2.destino, "Renova");
  assert.equal(res2.doc.vencimento, "2026-07-30");

  // 3. Não grava quando mais antigo
  const res3 = await dep.gravarPdf({
    clienteId: emp.id,
    tipo: "CRF FGTS",
    vencimento: "2026-05-01"
  });
  assert.equal(res3.destino, "Não grava");
  assert.equal(res3.doc, null);
});

test("Etapa 2 - nomeDaFolha obtém o nome do funcionário na ordem correta", () => {
  // 1. do campo amarelo B3 (linha índice 2, col 1)
  const rows1 = [
    [],
    [],
    ["Funcionário:", "João da Silva", "← escreva o nome", "", "", "", "", "", "", ""]
  ];
  assert.equal(nomeDaFolha(rows1, "Folha 01"), "João da Silva");

  // 2. de C3 a J3 (ignorando a dica)
  const rows2 = [
    [],
    [],
    ["Funcionário:", "← escreva aqui", "Maria Souza", "", "", "", "", "", "", ""]
  ];
  assert.equal(nomeDaFolha(rows2, "01 Funcionário"), "Maria Souza");

  // 3. do rótulo A3 ("Funcionário: Nome")
  const rows3 = [
    [],
    [],
    ["Funcionário: Carlos Pereira", "", "", "", "", "", "", "", "", ""]
  ];
  assert.equal(nomeDaFolha(rows3, "02 Funcionário"), "Carlos Pereira");

  // 4. do nome da aba (quando não é padrão)
  const rows4 = [
    [],
    [],
    ["", "", "", "", "", "", "", "", "", ""]
  ];
  assert.equal(nomeDaFolha(rows4, "Ana Paula"), "Ana Paula");
  assert.equal(nomeDaFolha(rows4, "03 Roberto Santos"), "Roberto Santos");

  // Padrão não deve ser considerado nome de funcionário
  assert.equal(nomeDaFolha(rows4, "01 Funcionário"), "");
  assert.equal(nomeDaFolha(rows4, "Funcionário (2)"), "");
  assert.equal(nomeDaFolha(rows4, "Folha"), "");
});

test("Etapa 2 - quemVeFaturamentos restringe acesso ao Contábil e Admin", () => {
  assert.equal(quemVeFaturamentos(null), false);
  assert.equal(quemVeFaturamentos({ perfil: "usuario", areas: ["mod-vencimentos"] }), false);
  assert.equal(quemVeFaturamentos({ perfil: "usuario", areas: ["mod-vencimentos", "mod-horas"] }), false);

  assert.equal(quemVeFaturamentos({ perfil: "admin", areas: [] }), true);
  assert.equal(quemVeFaturamentos({ perfil: "usuario", areas: ["contabil-lucros"] }), true);
  assert.equal(quemVeFaturamentos({ perfil: "usuario", areas: ["contabil"] }), true);
  assert.equal(quemVeFaturamentos({ perfil: "usuario", areas: ["integracao"] }), true);
});
