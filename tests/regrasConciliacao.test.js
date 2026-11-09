import test from "node:test";
import assert from "node:assert/strict";
import {
  diasEntreDatas,
  dentroDaTolerancia,
  aplicarPalavrasChave,
  conciliarPagamentoEmLote,
  aplicarPerfilConciliacao,
  obterPerfilEmpresa,
  salvarPerfilEmpresa,
  perfilPadrao
} from "../src/lib/regrasConciliacao.mjs";

test("Etapa 4 - tolerância de dias entre banco e planilha", () => {
  assert.equal(diasEntreDatas("2026-05-10", "2026-05-10"), 0);
  assert.equal(diasEntreDatas("2026-05-10", "2026-05-12"), 2);
  assert.equal(diasEntreDatas("2026-05-12", "2026-05-10"), 2);
  assert.equal(diasEntreDatas("2026-05-10", "2026-05-15"), 5);

  assert.equal(dentroDaTolerancia("2026-05-10", "2026-05-12", 2), true);
  assert.equal(dentroDaTolerancia("2026-05-10", "2026-05-13", 2), false);
  assert.equal(dentroDaTolerancia("2026-05-10", "2026-05-13", 3), true);
});

test("Etapa 4 - palavras do histórico que marcam sozinho como conferido com o motivo", () => {
  const extrato = [
    { chave: "e1", data: "2026-05-05", valorNum: -45.50, desc: "TAR MANUTENCAO CONTA CORRENTE", sign: "D" },
    { chave: "e2", data: "2026-05-10", valorNum: 120.30, desc: "REND PAGO APLIC FINANCEIRA", sign: "C" },
    { chave: "e3", data: "2026-05-15", valorNum: -12.40, desc: "DEBITO IOF", sign: "D" },
    { chave: "e4", data: "2026-05-20", valorNum: -1500.00, desc: "PAGAMENTO FORNECEDOR ABC", sign: "D" }
  ];

  const palavrasChave = [
    { palavra: "tarifa", motivo: "Tarifa bancária mensal" },
    { palavra: "tar", motivo: "Tarifa bancária" },
    { palavra: "rendimento", motivo: "Rendimento de aplicação" },
    { palavra: "rend", motivo: "Rendimento de aplicação" },
    { palavra: "iof", motivo: "IOF cobrado pelo banco" }
  ];

  const res = aplicarPalavrasChave(extrato, palavrasChave);

  assert.equal(res.grupos.length, 3);
  assert.ok(res.chavesConferidas.has("e1"));
  assert.ok(res.chavesConferidas.has("e2"));
  assert.ok(res.chavesConferidas.has("e3"));
  assert.ok(!res.chavesConferidas.has("e4"));

  const g1 = res.grupos.find((g) => g.ext.includes("e1"));
  assert.equal(g1.tipo, "justificado");
  assert.equal(g1.obs, "Tarifa bancária");

  const g2 = res.grupos.find((g) => g.ext.includes("e2"));
  assert.equal(g2.obs, "Rendimento de aplicação");

  const g3 = res.grupos.find((g) => g.ext.includes("e3"));
  assert.equal(g3.obs, "IOF cobrado pelo banco");
});

test("Etapa 4 - pagamento em lote: vários lançamentos da planilha = um débito do banco pela soma na tolerância", () => {
  // Débito no extrato: R$ 1.500,00 no dia 2026-05-12
  const extrato = [
    { chave: "ext-lote-1", data: "2026-05-12", valorNum: -1500.00, desc: "PGTO ELETRONICO LOTE FORNECEDORES", sign: "D" }
  ];

  // Três lançamentos na planilha somando 1500 (500 + 400 + 600) entre os dias 10 e 13
  const planilha = [
    { chave: "sis-1", data: "2026-05-11", valorNum: -500.00, desc: "Fornecedor Alfa", sign: "D" },
    { chave: "sis-2", data: "2026-05-12", valorNum: -400.00, desc: "Fornecedor Beta", sign: "D" },
    { chave: "sis-3", data: "2026-05-13", valorNum: -600.00, desc: "Fornecedor Gama", sign: "D" },
    { chave: "sis-4", data: "2026-05-12", valorNum: -300.00, desc: "Outro avulso", sign: "D" }
  ];

  const resultado = conciliarPagamentoEmLote(extrato, planilha, { toleranciaDias: 2 });

  assert.equal(resultado.grupos.length, 1);
  const grupoLote = resultado.grupos[0];
  assert.deepEqual(grupoLote.ext, ["ext-lote-1"]);
  assert.deepEqual(grupoLote.sis.sort(), ["sis-1", "sis-2", "sis-3"].sort());
  assert.equal(grupoLote.tipo, "manual");
  assert.match(grupoLote.obs, /lote/i);
});

test("Etapa 4 - perfil de conciliação por empresa salvo e aplicado", () => {
  const storeData = {};
  const mockStore = {
    get: (k) => storeData[k],
    set: (k, v) => { storeData[k] = v; }
  };

  const cnpj = "11.222.333/0001-81";

  // Perfil padrão quando ainda não tem salvo
  const padrao = obterPerfilEmpresa(mockStore, cnpj);
  assert.equal(padrao.toleranciaDias, 2);
  assert.equal(padrao.conciliarEmLote, true);

  // Salva perfil personalizado da empresa
  salvarPerfilEmpresa(mockStore, cnpj, {
    toleranciaDias: 5,
    palavrasChave: [
      { palavra: "cesta facil", motivo: "Pacote de tarifas da conta" },
      { palavra: "tarifa", motivo: "Tarifa bancária" }
    ],
    conciliarEmLote: true,
    mapeamentoColunas: {
      data: "Data Movimento",
      valor: "Valor Líquido",
      documento: "Número Doc",
      nome: "Favorecido",
      cnpj: "CPF/CNPJ Favorecido"
    }
  });

  // Reabre perfil
  const salvo = obterPerfilEmpresa(mockStore, cnpj);
  assert.equal(salvo.toleranciaDias, 5);
  assert.equal(salvo.palavrasChave[0].palavra, "cesta facil");
  assert.equal(salvo.mapeamentoColunas.nome, "Favorecido");

  // Aplica o perfil num conjunto de dados
  const extrato = [
    { chave: "e1", data: "2026-06-01", valorNum: -89.90, desc: "DEB CESTA FACIL EMPRESAS", sign: "D" },
    { chave: "e2", data: "2026-06-05", valorNum: -1000.00, desc: "LOTE FORN", sign: "D" }
  ];
  const planilha = [
    { chave: "s1", data: "2026-06-03", valorNum: -400.00, desc: "Fornecedor 1" },
    { chave: "s2", data: "2026-06-07", valorNum: -600.00, desc: "Fornecedor 2" }
  ];

  const resultado = aplicarPerfilConciliacao(extrato, planilha, salvo);
  assert.equal(resultado.toleranciaDias, 5);
  assert.equal(resultado.grupos.length, 2);

  const gTarifa = resultado.grupos.find((g) => g.ext.includes("e1"));
  assert.equal(gTarifa.obs, "Pacote de tarifas da conta");

  const gLote = resultado.grupos.find((g) => g.ext.includes("e2"));
  assert.deepEqual(gLote.sis.sort(), ["s1", "s2"].sort());
});
