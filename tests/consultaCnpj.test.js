const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

describe("consultaCnpj.mjs", async () => {
  const {
    validarCnpj,
    formatarTelefone,
    formatarCnae,
    consultarCnpjReceita,
    preencherCamposVazios
  } = await import("../src/lib/consultaCnpj.mjs");

  test("validarCnpj: reconhece CNPJs válidos e rejeita inválidos ou repetidos", () => {
    // CNPJ válido do Banco do Brasil: 00.000.000/0001-91
    assert.equal(validarCnpj("00000000000191"), true);
    assert.equal(validarCnpj("00.000.000/0001-91"), true);

    // CNPJ com tamanho errado ou dígitos repetidos
    assert.equal(validarCnpj("00000000000000"), false);
    assert.equal(validarCnpj("11111111111111"), false);
    assert.equal(validarCnpj("12345678000100"), false);
    assert.equal(validarCnpj(""), false);
    assert.equal(validarCnpj(null), false);
  });

  test("formatarTelefone e formatarCnae", () => {
    assert.equal(formatarTelefone("4836220000"), "(48) 3622-0000");
    assert.equal(formatarTelefone("48999998888"), "(48) 99999-8888");
    assert.equal(formatarTelefone(""), "");

    assert.equal(formatarCnae(6920601, "Atividades de contabilidade"), "6920-6/01 Atividades de contabilidade");
    assert.equal(formatarCnae("4711302", "Comércio varejista"), "4711-3/02 Comércio varejista");
  });

  test("consultarCnpjReceita: faz parse correto da resposta e alimenta o cache de 24h", async () => {
    const memoryStorage = {};
    const fakeStorage = {
      getItem: (k) => memoryStorage[k] || null,
      setItem: (k, v) => { memoryStorage[k] = String(v); }
    };

    let chamadasRede = 0;
    const fakeFetch = async (url) => {
      chamadasRede++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          cnpj: "00000000000191",
          razao_social: "BANCO DO BRASIL SA",
          nome_fantasia: "DIRECAO GERAL",
          situacao_cadastral: "ATIVA",
          data_situacao_cadastral: "2005-11-03",
          data_inicio_atividade: "1966-08-01",
          municipio: "BRASILIA",
          uf: "DF",
          cep: "70040912",
          logradouro: "SAUN QUADRA 5",
          numero: "SN",
          bairro: "ASA NORTE",
          ddd_telefone_1: "61 34931000",
          cnae_fiscal: 6422100,
          cnae_fiscal_descricao: "Bancos múltiplos",
          opcao_pelo_simples: false,
          opcao_pelo_mei: false,
          qsa: [{ nome_socio: "DIRETORIA EXECUTIVA", cnpj_cpf_do_socio: "***000000**" }]
        })
      };
    };

    const r1 = await consultarCnpjReceita("00.000.000/0001-91", { fetch: fakeFetch, storage: fakeStorage });
    assert.equal(r1.nome, "BANCO DO BRASIL SA");
    assert.equal(r1.cidade, "BRASILIA");
    assert.equal(r1.uf, "DF");
    assert.equal(r1.situacaoCadastral, "ATIVA");
    assert.equal(r1.socios.length, 1);
    assert.equal(chamadasRede, 1);

    // Segunda chamada deve usar o cache sem ir à rede
    const r2 = await consultarCnpjReceita("00000000000191", { fetch: fakeFetch, storage: fakeStorage });
    assert.equal(r2.nome, "BANCO DO BRASIL SA");
    assert.equal(chamadasRede, 1); // Continua 1, usou cache!
  });

  test("consultarCnpjReceita: trata 404 e 429 adequadamente", async () => {
    const fetch404 = async () => ({ ok: false, status: 404, json: async () => ({}) });
    await assert.rejects(
      consultarCnpjReceita("00000000000191", { fetch: fetch404, ignorarCache: true }),
      /CNPJ não encontrado na base da Receita/
    );

    const fetch429 = async () => ({ ok: false, status: 429, json: async () => ({}) });
    await assert.rejects(
      consultarCnpjReceita("00000000000191", { fetch: fetch429, ignorarCache: true }),
      /Muitas consultas seguidas/
    );
  });

  test("preencherCamposVazios: preserva campos manuais e atualiza situação e campos vazios", () => {
    const atual = {
      id: "emp-1",
      nome: "Minha Empresa LTDA", // Já tinha nome manual
      fantasia: "",
      cidade: "",
      uf: "",
      regime: "Lucro Presumido", // Já tinha regime
      socios: [{ nome: "Maurício", percentual: "100" }] // Já tinha sócio
    };

    const dadosReceita = {
      nome: "RAZAO SOCIAL DA RECEITA SA",
      fantasia: "NOME FANTASIA RECEITA",
      cidade: "Tubarão",
      uf: "SC",
      cep: "88700000",
      telefone: "(48) 3622-0000",
      cnae: "6920-6/01 Contabilidade",
      regimeSugerido: "Simples Nacional",
      socios: [{ nome: "Sócio da Receita", cpf: "12345678900" }],
      situacaoCadastral: "ATIVA",
      dataSituacaoCadastral: "2010-01-01",
      inicioAtividade: "2010-01-01",
      consultadoEm: "2026-11-01T12:00:00Z"
    };

    const mesclado = preencherCamposVazios(atual, dadosReceita);

    // Campos preenchidos manualmente não devem ser sobrescritos
    assert.equal(mesclado.nome, "Minha Empresa LTDA");
    assert.equal(mesclado.regime, "Lucro Presumido");
    assert.equal(mesclado.socios.length, 1);
    assert.equal(mesclado.socios[0].nome, "Maurício");

    // Campos vazios devem ser preenchidos
    assert.equal(mesclado.fantasia, "NOME FANTASIA RECEITA");
    assert.equal(mesclado.cidade, "Tubarão");
    assert.equal(mesclado.uf, "SC");
    assert.equal(mesclado.cep, "88700000");

    // Situação e data sempre atualizadas
    assert.equal(mesclado.situacaoCadastral, "ATIVA");
    assert.equal(mesclado.dataSituacaoCadastral, "2010-01-01");
  });
});
