const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

describe("limitesFaturamento.mjs", async () => {
  const {
    calcularLimiteProporcional,
    avaliarLimites,
    avaliarTodasEmpresas,
    LIMITES_2026
  } = await import("../src/lib/limitesFaturamento.mjs");

  test("teto anual e valores padrão para MEI e Simples Nacional", () => {
    assert.equal(LIMITES_2026.MEI.tetoAnual, 81000);
    assert.equal(LIMITES_2026.MEI.tetoMensalAbertura, 6750);
    assert.equal(LIMITES_2026.SIMPLES_NACIONAL.tetoAnual, 4800000);
    assert.equal(LIMITES_2026.SIMPLES_NACIONAL.tetoMensalAbertura, 400000);
  });

  test("ano de abertura: cálculo proporcional contando do mês de abertura até dezembro", () => {
    // Abertura em abril/2026: 9 meses ativos (abril a dezembro)
    const meiAbril = calcularLimiteProporcional("MEI", 2026, "2026-04-10");
    assert.equal(meiAbril.proporcional, true);
    assert.equal(meiAbril.mesesAtivos, 9);
    assert.equal(meiAbril.tetoAnual, 9 * 6750); // 60.750

    // Simples Nacional aberto em outubro/2026: 3 meses ativos (out, nov, dez)
    const simplesOut = calcularLimiteProporcional("Simples Nacional", 2026, "2026-10-01");
    assert.equal(simplesOut.proporcional, true);
    assert.equal(simplesOut.mesesAtivos, 3);
    assert.equal(simplesOut.tetoAnual, 3 * 400000); // 1.200.000

    // Empresa aberta em anos anteriores tem 12 meses normais
    const meiAntigo = calcularLimiteProporcional("MEI", 2026, "2024-05-15");
    assert.equal(meiAntigo.proporcional, false);
    assert.equal(meiAntigo.mesesAtivos, 12);
    assert.equal(meiAntigo.tetoAnual, 81000);
  });

  test("níveis de alerta para MEI: OK (<80%), ATENCAO (>=80%), ACIMA (100-120%), EXCESSO_20 (>120%)", () => {
    const emp = { id: "e1", nome: "Oficina MEI", documento: "12345678000199", regime: "MEI" };

    // 50.000 de 81.000 (61.7%) -> OK
    const rOk = avaliarLimites({ empresa: emp, ano: 2025, faturamentos: { "01": 50000 }, anoAtual: 2026 });
    assert.equal(rOk.nivel, "OK");
    assert.equal(rOk.percentualUso, 61.7);

    // 68.000 de 81.000 (84%) -> ATENCAO
    const rAtencao = avaliarLimites({ empresa: emp, ano: 2025, faturamentos: { "01": 68000 }, anoAtual: 2026 });
    assert.equal(rAtencao.nivel, "ATENCAO");
    assert.match(rAtencao.consequencia, /84\.0%/);

    // 90.000 de 81.000 (111.1%) -> ACIMA (até 20%)
    const rAcima = avaliarLimites({ empresa: emp, ano: 2025, faturamentos: { "01": 90000 }, anoAtual: 2026 });
    assert.equal(rAcima.nivel, "ACIMA");
    assert.match(rAcima.consequencia, /desenquadramento do MEI a partir de 1º de janeiro/);

    // 105.000 de 81.000 (129.6%) -> EXCESSO_20 (>20%)
    const rExcesso = avaliarLimites({ empresa: emp, ano: 2025, faturamentos: { "01": 105000 }, anoAtual: 2026 });
    assert.equal(rExcesso.nivel, "EXCESSO_20");
    assert.match(rExcesso.consequencia, /efeitos retroativos/);
  });

  test("projeção anual no ano corrente identifica mês estimado de estouro", () => {
    const emp = { id: "e2", nome: "Mercado MEI", documento: "99887766000155", regime: "MEI" };
    // Em 2026, 6 meses lançados com média de R$ 8.000/mês (total R$ 48.000 até junho)
    // Projeção: 48.000 + (8.000 * 6) = 96.000 (ultrapassa 81.000)
    // No mês 11 (novembro), 48.000 + (8.000 * 5) = 88.000 (estoura em novembro)
    const fats = { "01": 8000, "02": 8000, "03": 8000, "04": 8000, "05": 8000, "06": 8000 };
    const r = avaliarLimites({ empresa: emp, ano: 2026, faturamentos: fats, anoAtual: 2026, mesAtual: 7 });

    assert.equal(r.estouraProjecao, true);
    assert.equal(r.nivel, "ATENCAO");
    assert.equal(r.mesEstouro, "novembro");
    assert.match(r.consequencia, /ultrapassará o limite anual em novembro/);
  });

  test("soma de faturamento de matriz e filiais pelo CNPJ raiz", () => {
    const matriz = { id: "m1", nome: "Rede Matriz", documento: "11222333000144", regime: "Simples Nacional" };
    const filial1 = { id: "f1", nome: "Rede Filial Centro", documento: "11222333000225", regime: "Simples Nacional" };
    const filial2 = { id: "f2", nome: "Rede Filial Bairro", documento: "11222333000306", regime: "Simples Nacional" };

    const faturamentos = {
      "2026": {
        m1: { "01": 1000000, "02": 1000000 },
        f1: { "01": 600000, "02": 600000 },
        f2: { "01": 500000, "02": 500000 }
      }
    };

    // Matriz (2M) + Filial 1 (1.2M) + Filial 2 (1.0M) = 4.2M (87.5% de 4.8M)
    const todas = avaliarTodasEmpresas([matriz, filial1, filial2], faturamentos, 2026, 2026, 3);
    assert.equal(todas.length, 1);
    const r = todas[0];
    assert.equal(r.empresaNome, "Rede Matriz");
    assert.equal(r.totalAcumulado, 4200000);
    assert.equal(r.percentualUso, 87.5);
    assert.equal(r.nivel, "ATENCAO");
    assert.equal(r.qtdFiliais, 2);
  });

  test("empresas do Lucro Presumido, Real ou baixadas são desconsideradas", () => {
    const presumido = { id: "p1", nome: "Consultoria LP", documento: "33444555000166", regime: "Lucro Presumido" };
    const real = { id: "r1", nome: "Indústria LR", documento: "44555666000177", regime: "Lucro Real" };
    const baixada = { id: "b1", nome: "Encerrada MEI", documento: "55666777000188", regime: "MEI", baixa: "2025-10-10" };

    assert.equal(avaliarLimites({ empresa: presumido, ano: 2026, faturamentos: { "01": 500000 } }), null);
    assert.equal(avaliarLimites({ empresa: real, ano: 2026, faturamentos: { "01": 800000 } }), null);
    assert.equal(avaliarLimites({ empresa: baixada, ano: 2026, faturamentos: { "01": 50000 } }), null);
  });
});
