/*
 * modelosPlanilha.mjs — Modelos configuráveis de planilha por cliente.
 *
 * Permite importar planilhas de clientes em qualquer formato (várias contas,
 * unidades e naturezas) sem código específico por cliente:
 *   1. Mapeamento configurável de abas, linha inicial e colunas.
 *   2. Destrinchar por conta bancária e unidade/centro de custo.
 *   3. Classificação por natureza com sugestões configuráveis (histórico contém X → categoria Y).
 *   4. Identificação do que ficou sem classificação.
 *   5. Exportação em layout genérico configurável (colunas, separador, formato de data/valor).
 *   6. Integração direta com a conciliação bancária (Etapa 4) como "sistema".
 */

export function indiceDaColuna(col) {
  if (typeof col === "number") return Math.max(0, Math.floor(col));
  if (!col) return 0;
  const s = String(col).trim().toUpperCase();
  if (/^\d+$/.test(s)) return Math.max(0, parseInt(s, 10));
  let num = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      num = num * 26 + (code - 64);
    }
  }
  return Math.max(0, num - 1);
}

export function colunaDoIndice(idx) {
  let n = Math.max(0, Math.floor(idx));
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export function parseValor(v) {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (!v) return 0;
  let s = String(v).trim().replace(/\s+/g, "").replace(/R\$/gi, "");
  if (!s) return 0;
  let negativo = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negativo = true;
    s = s.slice(1, -1);
  } else if (s.startsWith("-") || s.endsWith("-")) {
    negativo = true;
    s = s.replace(/-/g, "");
  } else if (s.endsWith("D") || s.endsWith("d")) {
    negativo = true;
    s = s.slice(0, -1);
  } else if (s.endsWith("C") || s.endsWith("c")) {
    s = s.slice(0, -1);
  }
  if (s.includes(",") && s.includes(".")) {
    if (s.indexOf(".") < s.indexOf(",")) {
      // 1.234,56 (pt-BR)
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 (en-US)
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return negativo ? -Math.abs(n) : n;
}

export function parseData(d) {
  if (!d) return "";
  if (d instanceof Date && !isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  const s = String(d).trim();
  // Formato ISO: YYYY-MM-DD
  const mIso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (mIso) {
    return `${mIso[1]}-${String(mIso[2]).padStart(2, "0")}-${String(mIso[3]).padStart(2, "0")}`;
  }
  // Formato BR: DD/MM/YYYY
  const mBr = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (mBr) {
    return `${mBr[3]}-${String(mBr[2]).padStart(2, "0")}-${String(mBr[1]).padStart(2, "0")}`;
  }
  // Formato numérico Excel (dias desde 1899-12-30)
  if (/^\d{5}$/.test(s)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + parseInt(s, 10));
    return epoch.toISOString().slice(0, 10);
  }
  return s;
}

export function criarModelo(dados = {}) {
  return {
    id: dados.id || "mod-" + Date.now().toString(36),
    clienteId: dados.clienteId || "",
    nome: dados.nome || "Modelo Padrão",
    aba: dados.aba || "",
    linhaInicial: Number(dados.linhaInicial) || 2, // 1-indexed (linha 2 significa que linha 1 é cabeçalho)
    colunas: {
      data: dados.colunas?.data ?? "A",
      valor: dados.colunas?.valor ?? "B",
      entrada: dados.colunas?.entrada ?? "",
      saida: dados.colunas?.saida ?? "",
      historico: dados.colunas?.historico ?? "C",
      conta: dados.colunas?.conta ?? "D",
      unidade: dados.colunas?.unidade ?? "E",
      categoria: dados.colunas?.categoria ?? "F",
      pessoa: dados.colunas?.pessoa ?? "G"
    },
    regrasClassificacao: Array.isArray(dados.regrasClassificacao) ? [...dados.regrasClassificacao] : []
  };
}

/**
 * Destrincha matriz de linhas de uma planilha usando o modelo configurado.
 */
export function destrincharPlanilha(linhas = [], modelo = criarModelo()) {
  const mod = criarModelo(modelo);
  const linhaIdxInicial = Math.max(0, mod.linhaInicial - 1);
  const col = {
    data: indiceDaColuna(mod.colunas.data),
    valor: mod.colunas.valor ? indiceDaColuna(mod.colunas.valor) : -1,
    entrada: mod.colunas.entrada ? indiceDaColuna(mod.colunas.entrada) : -1,
    saida: mod.colunas.saida ? indiceDaColuna(mod.colunas.saida) : -1,
    historico: indiceDaColuna(mod.colunas.historico),
    conta: mod.colunas.conta ? indiceDaColuna(mod.colunas.conta) : -1,
    unidade: mod.colunas.unidade ? indiceDaColuna(mod.colunas.unidade) : -1,
    categoria: mod.colunas.categoria ? indiceDaColuna(mod.colunas.categoria) : -1,
    pessoa: mod.colunas.pessoa ? indiceDaColuna(mod.colunas.pessoa) : -1
  };

  const lancamentos = [];
  const porConta = {};
  const porUnidade = {};
  const semClassificacao = [];
  const comSugestao = [];

  let totalEntradas = 0;
  let totalSaidas = 0;

  for (let i = linhaIdxInicial; i < linhas.length; i++) {
    const row = linhas[i];
    if (!row || !Array.isArray(row) || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }

    const dataOriginal = row[col.data];
    const dataIso = parseData(dataOriginal);

    let valorNum = 0;
    if (col.entrada >= 0 || col.saida >= 0) {
      const vEntrada = col.entrada >= 0 ? Math.abs(parseValor(row[col.entrada])) : 0;
      const vSaida = col.saida >= 0 ? Math.abs(parseValor(row[col.saida])) : 0;
      valorNum = vEntrada > 0 ? vEntrada : (vSaida > 0 ? -vSaida : 0);
    } else if (col.valor >= 0) {
      valorNum = parseValor(row[col.valor]);
    }

    if (!dataIso && valorNum === 0) {
      continue; // linha sem data e sem valor é cabeçalho ou rodapé
    }

    const historico = String(row[col.historico] || "").trim();
    const conta = col.conta >= 0 && row[col.conta] ? String(row[col.conta]).trim() : "Conta Padrão";
    const unidade = col.unidade >= 0 && row[col.unidade] ? String(row[col.unidade]).trim() : "Matriz";
    const categoriaExistente = col.categoria >= 0 && row[col.categoria] ? String(row[col.categoria]).trim() : "";
    const pessoa = col.pessoa >= 0 && row[col.pessoa] ? String(row[col.pessoa]).trim() : "";

    let categoria = categoriaExistente;
    let categoriaSugerida = "";
    let regraAplicada = null;

    if (!categoria && mod.regrasClassificacao.length > 0) {
      const histUpper = historico.toUpperCase();
      for (const regra of mod.regrasClassificacao) {
        if (regra.termo && histUpper.includes(regra.termo.trim().toUpperCase())) {
          categoriaSugerida = regra.categoria;
          regraAplicada = regra.termo;
          break;
        }
      }
    }

    const item = {
      id: `m-${i + 1}-${Date.now().toString(36)}`,
      linha: i + 1,
      data: dataIso,
      valor: valorNum,
      historico,
      conta,
      unidade,
      categoria,
      categoriaSugerida,
      regraAplicada,
      pessoa,
      semClassificacao: !categoria && !categoriaSugerida
    };

    lancamentos.push(item);

    if (valorNum > 0) totalEntradas += valorNum;
    else if (valorNum < 0) totalSaidas += Math.abs(valorNum);

    // Agrupamento por conta
    if (!porConta[conta]) porConta[conta] = [];
    porConta[conta].push(item);

    // Agrupamento por unidade
    if (!porUnidade[unidade]) porUnidade[unidade] = [];
    porUnidade[unidade].push(item);

    if (item.semClassificacao) {
      semClassificacao.push(item);
    } else if (categoriaSugerida && !categoria) {
      comSugestao.push(item);
    }
  }

  return {
    modelo: mod,
    lancamentos,
    porConta,
    porUnidade,
    semClassificacao,
    comSugestao,
    resumo: {
      qtdTotal: lancamentos.length,
      qtdContas: Object.keys(porConta).length,
      qtdUnidades: Object.keys(porUnidade).length,
      totalEntradas: Math.round(totalEntradas * 100) / 100,
      totalSaidas: Math.round(totalSaidas * 100) / 100,
      qtdSemClassificacao: semClassificacao.length,
      qtdComSugestao: comSugestao.length
    }
  };
}

/**
 * Aprova sugestões de classificação nos lançamentos destrinchados.
 */
export function aprovarSugestoes(lancamentos = [], idsAprovados = null) {
  return lancamentos.map((l) => {
    if (!l.categoria && l.categoriaSugerida) {
      if (idsAprovados === null || idsAprovados.includes(l.id)) {
        return {
          ...l,
          categoria: l.categoriaSugerida,
          categoriaSugerida: "",
          semClassificacao: false
        };
      }
    }
    return l;
  });
}

/**
 * Adiciona uma regra de classificação ao modelo.
 */
export function adicionarRegraClassificacao(modelo, termo, categoria) {
  const mod = criarModelo(modelo);
  const t = String(termo || "").trim();
  const c = String(categoria || "").trim();
  if (!t || !c) return mod;

  const regras = mod.regrasClassificacao.filter(
    (r) => r.termo.toUpperCase() !== t.toUpperCase()
  );
  regras.push({ termo: t, categoria: c });
  return { ...mod, regrasClassificacao: regras };
}

/**
 * Configuração padrão de layout para exportação.
 */
export function layoutExportacaoPadrao() {
  return {
    separador: ";",
    formatoData: "DD/MM/YYYY", // DD/MM/YYYY | YYYY-MM-DD | YYYYMMDD
    formatoValor: "pt-BR", // pt-BR (1.234,56) | en-US (1234.56)
    incluirCabecalho: true,
    colunas: [
      { campo: "data", rotulo: "Data" },
      { campo: "conta", rotulo: "Conta" },
      { campo: "historico", rotulo: "Histórico" },
      { campo: "categoria", rotulo: "Natureza/Categoria" },
      { campo: "unidade", rotulo: "Unidade" },
      { campo: "pessoa", rotulo: "Cliente/Fornecedor" },
      { campo: "valor", rotulo: "Valor" }
    ]
  };
}

/**
 * Formata um valor numérico para exportação.
 */
export function formatarValorExportacao(val, formato = "pt-BR") {
  const n = typeof val === "number" ? val : parseValor(val);
  if (formato === "en-US") {
    return n.toFixed(2);
  }
  return n.toFixed(2).replace(".", ",");
}

/**
 * Formata uma data para exportação.
 */
export function formatarDataExportacao(dataIso, formato = "DD/MM/YYYY") {
  if (!dataIso) return "";
  const partes = String(dataIso).split("-");
  if (partes.length !== 3) return dataIso;
  const [ano, mes, dia] = partes;
  if (formato === "DD/MM/YYYY") return `${dia}/${mes}/${ano}`;
  if (formato === "YYYYMMDD") return `${ano}${mes}${dia}`;
  return `${ano}-${mes}-${dia}`;
}

/**
 * Exporta lançamentos em layout CSV/TXT configurável.
 */
export function exportarLayout(lancamentos = [], config = {}) {
  const cfg = { ...layoutExportacaoPadrao(), ...config };
  const sep = cfg.separador || ";";
  const linhas = [];

  if (cfg.incluirCabecalho) {
    linhas.push(cfg.colunas.map((c) => `"${c.rotulo}"`).join(sep));
  }

  for (const item of lancamentos) {
    const valoresLinha = cfg.colunas.map((col) => {
      let val = item[col.campo] ?? "";
      if (col.campo === "data") {
        val = formatarDataExportacao(val, cfg.formatoData);
      } else if (col.campo === "valor") {
        val = formatarValorExportacao(val, cfg.formatoValor);
      }
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    });
    linhas.push(valoresLinha.join(sep));
  }

  return linhas.join("\r\n");
}

/**
 * Converte lançamentos destrinchados de uma conta para o formato de lançamentos de sistema da conciliação bancária (Etapa 4).
 */
export function converterParaLancamentosSistema(destrinchado, contaNome) {
  const lista = (destrinchado.porConta && destrinchado.porConta[contaNome]) || destrinchado.lancamentos || [];
  return lista.map((l) => ({
    id: l.id,
    data: l.data,
    desc: l.historico,
    historico: l.historico,
    doc: l.pessoa || "",
    valorNum: Math.abs(l.valor),
    sign: l.valor < 0 ? -1 : 1,
    categoria: l.categoria || l.categoriaSugerida || "",
    unidade: l.unidade,
    pessoa: l.pessoa,
    conta: l.conta
  }));
}

// ---------------------------------------------------------------- Persistência Local dos Modelos
const CHAVE_STORAGE = "makerpixel_modelos_planilha";

export function obterModelos(clienteId = null, storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CHAVE_STORAGE);
    const lista = raw ? JSON.parse(raw) : [];
    if (!clienteId) return lista;
    const cid = String(clienteId).replace(/\D/g, "");
    return lista.filter((m) => !m.clienteId || String(m.clienteId).replace(/\D/g, "") === cid);
  } catch (e) {
    return [];
  }
}

export function obterModelo(id, storage = typeof localStorage !== "undefined" ? localStorage : null) {
  const lista = obterModelos(null, storage);
  return lista.find((m) => m.id === id) || null;
}

export function salvarModelo(modelo, storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!storage) return modelo;
  const mod = criarModelo(modelo);
  const lista = obterModelos(null, storage);
  const idx = lista.findIndex((m) => m.id === mod.id);
  if (idx >= 0) {
    lista[idx] = mod;
  } else {
    lista.push(mod);
  }
  try {
    storage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
  } catch (e) {
    // quota ou sem storage
  }
  return mod;
}

export function excluirModelo(id, storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!storage) return;
  const lista = obterModelos(null, storage).filter((m) => m.id !== id);
  try {
    storage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
  } catch (e) {
    // quota ou sem storage
  }
}
