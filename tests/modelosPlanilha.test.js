import test from "node:test";
import assert from "node:assert/strict";
import {
  indiceDaColuna,
  colunaDoIndice,
  criarModelo,
  destrincharPlanilha,
  aprovarSugestoes,
  adicionarRegraClassificacao,
  exportarLayout,
  converterParaLancamentosSistema,
  salvarModelo,
  obterModelos,
  obterModelo,
  excluirModelo
} from "../src/lib/modelosPlanilha.mjs";

test("Etapa 5 - conversão de índices e letras de colunas", () => {
  assert.equal(indiceDaColuna("A"), 0);
  assert.equal(indiceDaColuna("B"), 1);
  assert.equal(indiceDaColuna("Z"), 25);
  assert.equal(indiceDaColuna("AA"), 26);
  assert.equal(indiceDaColuna("AB"), 27);
  assert.equal(indiceDaColuna(3), 3);

  assert.equal(colunaDoIndice(0), "A");
  assert.equal(colunaDoIndice(1), "B");
  assert.equal(colunaDoIndice(25), "Z");
  assert.equal(colunaDoIndice(26), "AA");
});

test("Etapa 5 - destrinchar planilha por conta e por unidade", () => {
  // Planilha simulando movimento do cliente com várias contas, unidades e naturezas
  const planilha = [
    ["Data", "Valor", "Histórico", "Conta", "Unidade", "Categoria", "Fornecedor"], // Linha 1 (cabeçalho)
    ["10/08/2026", "-150,00", "ENERGIA ELETRICA REF 07/2026", "Banco A", "Matriz", "", "Cia de Energia"],
    ["11/08/2026", "-45,90", "TARIFA BANCARIA CESTA", "Banco A", "Matriz", "", "Banco A"],
    ["12/08/2026", "1.200,00", "RECEBIMENTO CLIENTE XPTO", "Banco B", "Filial Tubarão", "Vendas", "Cliente XPTO"],
    ["15/08/2026", "-350,00", "ALUGUEL SALA COMERCIAL", "Banco B", "Filial Tubarão", "", "Imobiliária Central"],
    ["16/08/2026", "-80,00", "DESPESA DIVERSA SEM REGRA", "Banco A", "Matriz", "", "Padaria Central"]
  ];

  const modelo = criarModelo({
    nome: "Modelo Teste",
    linhaInicial: 2,
    colunas: {
      data: "A",
      valor: "B",
      historico: "C",
      conta: "D",
      unidade: "E",
      categoria: "F",
      pessoa: "G"
    },
    regrasClassificacao: [
      { termo: "ENERGIA", categoria: "Energia Elétrica" },
      { termo: "TARIFA", categoria: "Tarifas Bancárias" },
      { termo: "ALUGUEL", categoria: "Aluguel" }
    ]
  });

  const res = destrincharPlanilha(planilha, modelo);

  assert.equal(res.lancamentos.length, 5);
  assert.equal(res.resumo.qtdTotal, 5);

  // Divisão por conta
  assert.equal(Object.keys(res.porConta).length, 2);
  assert.equal(res.porConta["Banco A"].length, 3);
  assert.equal(res.porConta["Banco B"].length, 2);

  // Divisão por unidade
  assert.equal(Object.keys(res.porUnidade).length, 2);
  assert.equal(res.porUnidade["Matriz"].length, 3);
  assert.equal(res.porUnidade["Filial Tubarão"].length, 2);

  // Sugestões de classificação
  assert.equal(res.comSugestao.length, 3);
  const itemEnergia = res.lancamentos.find((l) => l.historico.includes("ENERGIA"));
  assert.equal(itemEnergia.categoriaSugerida, "Energia Elétrica");
  assert.equal(itemEnergia.categoria, "");

  // Sem classificação (o que não tem categoria nem sugestão)
  assert.equal(res.semClassificacao.length, 1);
  assert.equal(res.semClassificacao[0].historico, "DESPESA DIVERSA SEM REGRA");

  // Aprovar sugestões
  const aprovados = aprovarSugestoes(res.lancamentos);
  const aprovadoEnergia = aprovados.find((l) => l.historico.includes("ENERGIA"));
  assert.equal(aprovadoEnergia.categoria, "Energia Elétrica");
  assert.equal(aprovadoEnergia.semClassificacao, false);

  // Adicionar nova regra ao modelo
  const modeloComRegra = adicionarRegraClassificacao(modelo, "PADARIA", "Despesas com Alimentação");
  assert.equal(modeloComRegra.regrasClassificacao.length, 4);
});

test("Etapa 5 - exportação em layout configurável (colunas, separador, formato de data e valor)", () => {
  const lancamentos = [
    {
      data: "2026-08-10",
      valor: -150.5,
      historico: "PAGTO FORNECEDOR ABC",
      conta: "Banco do Brasil",
      unidade: "Matriz",
      categoria: "Fornecedores",
      pessoa: "Empresa ABC Ltda"
    },
    {
      data: "2026-08-11",
      valor: 2500,
      historico: "VENDA DE MERCADORIA",
      conta: "Banco do Brasil",
      unidade: "Filial",
      categoria: "Receita de Vendas",
      pessoa: "Consumidor Final"
    }
  ];

  // Exportação com ponto-e-vírgula e data brasileira
  const csvBr = exportarLayout(lancamentos, {
    separador: ";",
    formatoData: "DD/MM/YYYY",
    formatoValor: "pt-BR"
  });

  assert.ok(csvBr.includes('"Data";"Conta";"Histórico";"Natureza/Categoria";"Unidade";"Cliente/Fornecedor";"Valor"'));
  assert.ok(csvBr.includes('"10/08/2026";"Banco do Brasil";"PAGTO FORNECEDOR ABC";"Fornecedores";"Matriz";"Empresa ABC Ltda";"-150,50"'));
  assert.ok(csvBr.includes('"11/08/2026";"Banco do Brasil";"VENDA DE MERCADORIA";"Receita de Vendas";"Filial";"Consumidor Final";"2500,00"'));

  // Exportação com vírgula, data ISO e valor americano
  const csvEn = exportarLayout(lancamentos, {
    separador: ",",
    formatoData: "YYYY-MM-DD",
    formatoValor: "en-US",
    colunas: [
      { campo: "data", rotulo: "Date" },
      { campo: "historico", rotulo: "Description" },
      { campo: "valor", rotulo: "Amount" }
    ]
  });

  assert.ok(csvEn.includes('"Date","Description","Amount"'));
  assert.ok(csvEn.includes('"2026-08-10","PAGTO FORNECEDOR ABC","-150.50"'));
  assert.ok(csvEn.includes('"2026-08-11","VENDA DE MERCADORIA","2500.00"'));
});

test("Etapa 5 - conversão para conciliação bancária como 'sistema' conta por conta", () => {
  const destrinchado = {
    porConta: {
      "Banco 001": [
        {
          id: "m-1",
          data: "2026-08-10",
          valor: -150.0,
          historico: "PAGTO TARIFA",
          pessoa: "Banco 001",
          conta: "Banco 001",
          unidade: "Matriz",
          categoria: "Tarifas"
        },
        {
          id: "m-2",
          data: "2026-08-12",
          valor: 800.0,
          historico: "RECEBIMENTO DUPLICATA",
          pessoa: "Cliente 123",
          conta: "Banco 001",
          unidade: "Matriz",
          categoria: "Vendas"
        }
      ]
    }
  };

  const lancamentosSistema = converterParaLancamentosSistema(destrinchado, "Banco 001");
  assert.equal(lancamentosSistema.length, 2);
  assert.equal(lancamentosSistema[0].valorNum, 150.0);
  assert.equal(lancamentosSistema[0].sign, -1);
  assert.equal(lancamentosSistema[1].valorNum, 800.0);
  assert.equal(lancamentosSistema[1].sign, 1);
});

test("Etapa 5 - persistência de modelos por cliente", () => {
  const mem = {};
  const mockStorage = {
    getItem: (k) => mem[k] || null,
    setItem: (k, v) => { mem[k] = String(v); }
  };

  const m1 = salvarModelo(
    {
      id: "mod-ex-1",
      clienteId: "11222333000181",
      nome: "Modelo Cliente Alpha",
      colunas: { data: "A", valor: "B", historico: "C" }
    },
    mockStorage
  );

  const lista = obterModelos("11.222.333/0001-81", mockStorage);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].nome, "Modelo Cliente Alpha");

  const mod = obterModelo("mod-ex-1", mockStorage);
  assert.equal(mod.id, "mod-ex-1");

  excluirModelo("mod-ex-1", mockStorage);
  assert.equal(obterModelos("11.222.333/0001-81", mockStorage).length, 0);
});
