const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

describe("multiEscritorio.mjs", async () => {
  const {
    gerarSenhaProvisoria,
    criarAcessoTeste,
    prorrogarTeste,
    converterEmCliente,
    suspenderEscritorio,
    reativarEscritorio,
    statusTeste,
    gerarMensagemConvite
  } = await import("../src/lib/multiEscritorio.mjs");

  test("gerarSenhaProvisoria gera padrão legível Xxxx-0000-xxxx", () => {
    const s = gerarSenhaProvisoria();
    assert.match(s, /^[A-Z][a-z]{3}-\d{4}-[a-z]{4}$/);
  });

  test("criarAcessoTeste cria escritório em TESTE com expiração em N dias", () => {
    const r = criarAcessoTeste({
      nome: "Contabilidade Teste Alfa",
      cnpj: "11.222.333/0001-44",
      contato: "Amanda",
      email: "amanda@teste.com",
      dias: 3
    });

    assert.ok(r.escritorio.id);
    assert.equal(r.escritorio.situacao, "TESTE");
    assert.equal(r.escritorio.limiteUsuarios, 3);
    assert.equal(r.escritorio.limiteEmpresas, 20);
    assert.ok(r.senhaProvisoria);

    const st = statusTeste(r.escritorio);
    assert.equal(st.emTeste, true);
    assert.equal(st.expirado, false);
    assert.ok(st.diasRestantes >= 2 && st.diasRestantes <= 4);
  });

  test("statusTeste identifica expiração e término hoje", () => {
    // Expirado
    const escExpirado = {
      situacao: "TESTE",
      testeExpiraEm: new Date(Date.now() - 3600000).toISOString()
    };
    const st1 = statusTeste(escExpirado);
    assert.equal(st1.expirado, true);
    assert.equal(st1.diasRestantes, 0);

    // Termina hoje (menos de 24 horas restantes)
    const escHoje = {
      situacao: "TESTE",
      testeExpiraEm: new Date(Date.now() + 12 * 3600000).toISOString()
    };
    const st2 = statusTeste(escHoje);
    assert.equal(st2.expirado, false);
    assert.equal(st2.terminaHoje, true);
  });

  test("prorrogarTeste adiciona dias ao período de teste", () => {
    const r = criarAcessoTeste({ nome: "Beta Contabilidade", email: "beta@teste.com", dias: 2 });
    const prorroga = prorrogarTeste(r.escritorio.id, 5);
    const st = statusTeste(prorroga);
    assert.ok(st.diasRestantes >= 6 && st.diasRestantes <= 8);
  });

  test("converterEmCliente torna o escritório ATIVO e remove expiração", () => {
    const r = criarAcessoTeste({ nome: "Gama Contábil", email: "gama@teste.com", dias: 3 });
    const conv = converterEmCliente(r.escritorio.id);
    assert.equal(conv.situacao, "ATIVO");
    assert.equal(conv.testeExpiraEm, undefined);
    assert.equal(statusTeste(conv).emTeste, false);
  });

  test("suspenderEscritorio e reativarEscritorio alternam situação", () => {
    const r = criarAcessoTeste({ nome: "Delta Contabilidade", email: "delta@teste.com", dias: 3 });
    const suspenso = suspenderEscritorio(r.escritorio.id);
    assert.equal(suspenso.situacao, "SUSPENSO");
    const reativado = reativarEscritorio(r.escritorio.id);
    assert.equal(reativado.situacao, "ATIVO");
  });

  test("gerarMensagemConvite monta texto formatado com link, e-mail e senha", () => {
    const esc = {
      razaoSocial: "Sigma Contabilidade",
      contato: "Roberto",
      email: "roberto@sigma.com",
      testeExpiraEm: "2026-11-05T23:59:59Z"
    };
    const msg = gerarMensagemConvite(esc, "Abcd-1234-efgh");
    assert.match(msg, /Olá Roberto!/);
    assert.match(msg, /roberto@sigma\.com/);
    assert.match(msg, /Abcd-1234-efgh/);
    assert.match(msg, /MakerPixel Contábil/);
    assert.match(msg, /Tubarão\/SC/);
  });
});
