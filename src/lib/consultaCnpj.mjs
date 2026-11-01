/**
 * Consulta de CNPJ na base pública da Receita Federal via BrasilAPI.
 *
 * Regras:
 * - Valida os dígitos do CNPJ antes de consultar (dígitos verificadores válidos).
 * - Timeout de 12 segundos.
 * - Cache de 24 horas por CNPJ.
 * - Tratamento específico para 404, 429 e sem resposta.
 * - Preenchimento de campos vazios e atualização de situação cadastral e data de abertura.
 */

const CACHE_PREFIX = "receita:cnpj:";
const CACHE_DURACAO_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Valida os dígitos verificadores do CNPJ (algoritmo módulo 11).
 */
export function validarCnpj(cnpj) {
  const limpo = String(cnpj || "").replace(/\D/g, "");
  if (limpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  let tamanho = limpo.length - 2;
  let numeros = limpo.substring(0, tamanho);
  let digitos = limpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

  tamanho = tamanho + 1;
  numeros = limpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1), 10);
}

/**
 * Formata telefone brasileiro.
 */
export function formatarTelefone(tel) {
  if (!tel) return "";
  const d = String(tel).replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

/**
 * Formata o código do CNAE.
 */
export function formatarCnae(codigo, descricao) {
  if (!codigo) return descricao || "";
  const s = String(codigo).padStart(7, "0");
  const cnaeFmt = `${s.slice(0, 4)}-${s.slice(4, 5)}/${s.slice(5, 7)}`;
  return descricao ? `${cnaeFmt} ${descricao}` : cnaeFmt;
}

/**
 * Consulta o CNPJ na BrasilAPI (ou cache de 24h).
 */
export async function consultarCnpjReceita(cnpj, opcoes = {}) {
  const limpo = String(cnpj || "").replace(/\D/g, "");
  if (!validarCnpj(limpo)) {
    throw new Error("CNPJ inválido. Verifique os números digitados.");
  }

  // 1. Verifica cache local
  const agora = Date.now();
  const cacheKey = CACHE_PREFIX + limpo;
  const storage = opcoes.storage || (typeof localStorage !== "undefined" ? localStorage : null);

  if (storage && !opcoes.ignorarCache) {
    try {
      const salvo = storage.getItem(cacheKey);
      if (salvo) {
        const item = JSON.parse(salvo);
        if (agora - item.salvoEm < CACHE_DURACAO_MS) {
          return item.dados;
        }
      }
    } catch (e) {}
  }

  // 2. Consulta externa com timeout de 12 segundos
  const fetchFn = opcoes.fetch || (typeof fetch !== "undefined" ? fetch : null);
  if (!fetchFn) throw new Error("Recurso de rede indisponível neste ambiente.");

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

  try {
    const url = `https://brasilapi.com.br/api/cnpj/v1/${limpo}`;
    const resp = await fetchFn(url, {
      signal: controller ? controller.signal : undefined,
      headers: { Accept: "application/json" }
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (resp.status === 404) {
      throw new Error("CNPJ não encontrado na base da Receita Federal.");
    }
    if (resp.status === 429) {
      throw new Error("Muitas consultas seguidas. Espere um minuto antes de tentar novamente.");
    }
    if (!resp.ok) {
      throw new Error(`Erro na consulta à Receita (código ${resp.status}).`);
    }

    const json = await resp.json();

    // Monta o endereço completo
    const partesEnd = [
      [json.descricao_tipo_de_logradouro, json.logradouro].filter(Boolean).join(" "),
      json.numero,
      json.complemento,
      json.bairro
    ].filter(Boolean);
    const endereco = partesEnd.join(", ");

    // Regime sugerido
    let regimeSugerido = "";
    if (json.opcao_pelo_mei) {
      regimeSugerido = "MEI";
    } else if (json.opcao_pelo_simples) {
      regimeSugerido = "Simples Nacional";
    }

    // Sócios do QSA
    const socios = (json.qsa || []).map((s) => ({
      nome: s.nome_socio || "",
      cpf: s.cnpj_cpf_do_socio || "",
      qualificacao: s.qualificacao_socio || "",
      percentual: ""
    }));

    const resultado = {
      cnpj: limpo,
      nome: json.razao_social || "",
      fantasia: json.nome_fantasia || "",
      situacaoCadastral: json.situacao_cadastral || "ATIVA",
      dataSituacaoCadastral: json.data_situacao_cadastral || "",
      inicioAtividade: json.data_inicio_atividade || "",
      cidade: json.municipio || "",
      uf: json.uf || "",
      cep: json.cep || "",
      endereco,
      telefone: formatarTelefone(json.ddd_telefone_1),
      cnae: formatarCnae(json.cnae_fiscal, json.cnae_fiscal_descricao),
      regimeSugerido,
      socios,
      consultadoEm: new Date().toISOString()
    };

    // Salva no cache
    if (storage) {
      try {
        storage.setItem(cacheKey, JSON.stringify({ salvoEm: agora, dados: resultado }));
      } catch (e) {}
    }

    return resultado;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("A Receita demorou para responder (tempo limite de 12 s excedido).");
    }
    throw err;
  }
}

/**
 * Mescla os dados da Receita em uma empresa já existente ou em edição,
 * preenchendo apenas os campos vazios e atualizando a situação cadastral.
 */
export function preencherCamposVazios(empresaAtual, dadosReceita) {
  const e = Object.assign({}, empresaAtual);

  if (!e.nome && dadosReceita.nome) e.nome = dadosReceita.nome;
  if (!e.fantasia && dadosReceita.fantasia) e.fantasia = dadosReceita.fantasia;
  if (!e.cidade && dadosReceita.cidade) e.cidade = dadosReceita.cidade;
  if (!e.uf && dadosReceita.uf) e.uf = dadosReceita.uf;
  if (!e.cep && dadosReceita.cep) e.cep = dadosReceita.cep;
  if (!e.telefone && dadosReceita.telefone) e.telefone = dadosReceita.telefone;
  if (!e.segmento && dadosReceita.cnae) e.segmento = dadosReceita.cnae;
  if (!e.regime && dadosReceita.regimeSugerido) e.regime = dadosReceita.regimeSugerido;
  if (!e.inicio && dadosReceita.inicioAtividade) {
    // formato mês "AAAA-MM"
    e.inicio = dadosReceita.inicioAtividade.slice(0, 7);
  }

  // Só preenche sócios se a empresa não tiver nenhum cadastrado
  if ((!e.socios || !e.socios.length) && dadosReceita.socios && dadosReceita.socios.length) {
    e.socios = dadosReceita.socios.map((s) => ({
      nome: s.nome,
      cpf: s.cpf,
      percentual: ""
    }));
  }

  // Sempre atualiza situação cadastral e datas da Receita
  e.situacaoCadastral = dadosReceita.situacaoCadastral;
  e.dataSituacaoCadastral = dadosReceita.dataSituacaoCadastral;
  e.dataInicioAtividade = dadosReceita.inicioAtividade;
  e.receitaConsultadaEm = dadosReceita.consultadoEm;

  return e;
}
