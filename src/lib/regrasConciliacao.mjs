/**
 * regrasConciliacao.mjs — Regras de conciliação bancária por cliente.
 * 
 * Funcionalidades:
 * - Tolerância de dias entre o banco e a planilha.
 * - Palavras do histórico que marcam sozinho como conferido (tarifa, rendimento, IOF), com o motivo.
 * - Pagamento em lote: "vários lançamentos da planilha = um débito do banco", juntando pela soma dentro da tolerância.
 * - Mapeamento das colunas da planilha do cliente (data, valor, documento, nome, CNPJ), salvo para o mês seguinte.
 * - Aplicação e salvamento do perfil por empresa.
 */

const semAcentoMin = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function perfilPadrao() {
  return {
    toleranciaDias: 2,
    palavrasChave: [
      { palavra: "tarifa", motivo: "Tarifa bancária" },
      { palavra: "rendimento", motivo: "Rendimento de aplicação" },
      { palavra: "iof", motivo: "IOF bancário" }
    ],
    conciliarEmLote: true,
    mapeamentoColunas: {
      data: "data",
      valor: "valor",
      documento: "documento",
      nome: "nome",
      cnpj: "cnpj"
    }
  };
}

export function diasEntreDatas(d1, d2) {
  if (!d1 || !d2) return 999999;
  const t1 = Date.parse(d1.slice(0, 10) + "T00:00:00Z");
  const t2 = Date.parse(d2.slice(0, 10) + "T00:00:00Z");
  if (isNaN(t1) || isNaN(t2)) return 999999;
  return Math.abs(Math.round((t1 - t2) / 86400000));
}

export function dentroDaTolerancia(d1, d2, toleranciaDias) {
  const tol = parseInt(toleranciaDias, 10);
  return diasEntreDatas(d1, d2) <= (isNaN(tol) ? 0 : tol);
}

/**
 * Palavras do histórico que marcam sozinho como conferido (ex.: tarifa, rendimento, IOF).
 * Retorna { grupos: [...], chavesConferidas: Set }
 */
export function aplicarPalavrasChave(extratoItens, palavrasChave) {
  const lista = Array.isArray(extratoItens) ? extratoItens : [];
  const regras = Array.isArray(palavrasChave) ? palavrasChave : [];
  const grupos = [];
  const chavesConferidas = new Set();

  lista.forEach((item) => {
    const texto = semAcentoMin([item.desc, item.texto, item.historico, item.detalhes].filter(Boolean).join(" "));
    for (const r of regras) {
      const p = semAcentoMin(r.palavra);
      if (p && texto.includes(p)) {
        const chave = item.chave || item.id || `${item.data}_${item.valorNum}_${item.desc}`;
        chavesConferidas.add(chave);
        grupos.push({
          ext: [chave],
          sis: [],
          tipo: "justificado",
          obs: r.motivo || `Conferido automático: ${r.palavra}`,
          auto: true,
          em: new Date().toISOString()
        });
        break;
      }
    }
  });

  return { grupos, chavesConferidas };
}

/**
 * Pagamento em lote: vários lançamentos da planilha = um débito do banco.
 * Junta pela soma exata (em centavos) dentro da tolerância de dias.
 */
export function conciliarPagamentoEmLote(extratoItens, planilhaItens, opcoes = {}) {
  const tolerancia = opcoes.toleranciaDias !== undefined ? opcoes.toleranciaDias : 2;
  const extratos = Array.isArray(extratoItens) ? extratoItens.slice() : [];
  const planilhas = Array.isArray(planilhaItens) ? planilhaItens.slice() : [];

  const grupos = [];
  const extratosUsados = new Set();
  const planilhasUsadas = new Set();

  const toCents = (v) => Math.round(Math.abs(Number(v || 0)) * 100);

  // Considera débitos do extrato
  extratos.forEach((ext, idxE) => {
    if (extratosUsados.has(idxE)) return;
    const ehDebito = ext.sign === "D" || (ext.valorNum && ext.valorNum < 0) || ext.tipo === "debito";
    if (!ehDebito) return;

    const valorAlvoCents = toCents(ext.valorNum);
    if (valorAlvoCents <= 0) return;

    // Candidatos da planilha dentro da tolerância de datas
    const candidatos = [];
    planilhas.forEach((sis, idxS) => {
      if (planilhasUsadas.has(idxS)) return;
      if (dentroDaTolerancia(ext.data, sis.data, tolerancia)) {
        candidatos.push({ idx: idxS, item: sis, cents: toCents(sis.valorNum) });
      }
    });

    if (candidatos.length < 2) return;

    // Procura combinação de 2 até 10 itens cuja soma seja exatamente o débito
    const combinacao = encontrarSomaEmLote(candidatos, valorAlvoCents);
    if (combinacao && combinacao.length >= 2) {
      extratosUsados.add(idxE);
      const sisChaves = [];
      combinacao.forEach((c) => {
        planilhasUsadas.add(c.idx);
        sisChaves.push(c.item.chave || c.item.id || `${c.item.data}_${c.item.valorNum}_${c.item.desc}`);
      });

      const extChave = ext.chave || ext.id || `${ext.data}_${ext.valorNum}_${ext.desc}`;
      grupos.push({
        ext: [extChave],
        sis: sisChaves,
        tipo: "manual",
        obs: `Pagamento em lote (${combinacao.length} itens)`,
        auto: true,
        em: new Date().toISOString()
      });
    }
  });

  return {
    grupos,
    extratosUsados,
    planilhasUsadas
  };
}

/**
 * Algoritmo recursivo para encontrar subconjunto de itens com soma exata.
 */
function encontrarSomaEmLote(candidatos, somaAlvo) {
  // Ordena decrescente por valor para otimizar busca
  const sorted = candidatos.slice().sort((a, b) => b.cents - a.cents);

  function buscar(inicio, alvo, selecionados, maxItens) {
    if (alvo === 0 && selecionados.length >= 2) return selecionados;
    if (alvo < 0 || selecionados.length >= maxItens) return null;

    for (let i = inicio; i < sorted.length; i++) {
      const c = sorted[i];
      if (c.cents > alvo) continue;
      const res = buscar(i + 1, alvo - c.cents, selecionados.concat(c), maxItens);
      if (res) return res;
    }
    return null;
  }

  // Tenta combinações de até 8 itens por lote
  return buscar(0, somaAlvo, [], 8);
}

/**
 * Aplica todas as regras do perfil de conciliação:
 * 1. Palavras-chave automáticas
 * 2. Conciliação em lote (se ativa no perfil)
 */
export function aplicarPerfilConciliacao(extratoItens, planilhaItens, perfil) {
  const cfg = Object.assign({}, perfilPadrao(), perfil || {});
  const grupos = [];

  // 1. Palavras-chave do histórico
  const resPalavras = aplicarPalavrasChave(extratoItens, cfg.palavrasChave);
  grupos.push(...resPalavras.grupos);

  // Filtra o extrato tirando os itens já conferidos por palavras-chave
  const extratoRestante = (extratoItens || []).filter((e) => {
    const chave = e.chave || e.id || `${e.data}_${e.valorNum}_${e.desc}`;
    return !resPalavras.chavesConferidas.has(chave);
  });

  // 2. Conciliação em lote
  let planRestante = (planilhaItens || []).slice();
  if (cfg.conciliarEmLote) {
    const resLote = conciliarPagamentoEmLote(extratoRestante, planRestante, {
      toleranciaDias: cfg.toleranciaDias
    });
    grupos.push(...resLote.grupos);
  }

  return {
    grupos,
    toleranciaDias: cfg.toleranciaDias,
    mapeamentoColunas: cfg.mapeamentoColunas
  };
}

/**
 * Salva e recupera o perfil de conciliação por empresa (CNPJ).
 */
const CHAVE_PERFIS = "conciliacao:perfis-clientes";

export function obterPerfilEmpresa(Store, cnpj) {
  if (!Store || !cnpj) return perfilPadrao();
  const limpo = String(cnpj).replace(/\D/g, "");
  const perfis = Store.get(CHAVE_PERFIS) || {};
  return Object.assign({}, perfilPadrao(), perfis[limpo] || {});
}

export function salvarPerfilEmpresa(Store, cnpj, perfil) {
  if (!Store || !cnpj) return;
  const limpo = String(cnpj).replace(/\D/g, "");
  const perfis = Store.get(CHAVE_PERFIS) || {};
  perfis[limpo] = Object.assign({}, perfilPadrao(), perfil);
  Store.set(CHAVE_PERFIS, perfis);
  return perfis[limpo];
}
