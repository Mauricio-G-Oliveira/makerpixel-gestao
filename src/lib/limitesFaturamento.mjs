/**
 * Regras e cálculos do Alerta de Limite de Faturamento do MEI e do Simples Nacional (2026).
 *
 * Limites vigentes:
 * - MEI: R$ 81.000,00/ano (R$ 6.750,00/mês no ano de abertura)
 * - Simples Nacional: R$ 4.800.000,00/ano (R$ 400.000,00/mês no ano de abertura)
 * - Sublimite estadual ICMS/ISS: R$ 3.600.000,00/ano (R$ 300.000,00/mês no ano de abertura)
 *
 * Níveis:
 * - OK: < 80% do limite
 * - ATENCAO: >= 80% até 100% ou projeção anual ultrapassa o limite
 * - ACIMA: > 100% até 120% (excesso de até 20%)
 * - EXCESSO_20: > 120% (excesso superior a 20%)
 */

export const LIMITES_2026 = {
  MEI: {
    tetoAnual: 81000,
    tetoMensalAbertura: 6750,
    nome: "MEI",
    consequencias: {
      ACIMA: "Excesso de até 20%: desenquadramento do MEI a partir de 1º de janeiro do ano seguinte, com recolhimento de DAS complementar sobre o valor excedente.",
      EXCESSO_20: "Excesso superior a 20%: desenquadramento automático do MEI com efeitos retroativos a 1º de janeiro do ano-calendário (ou ao início da atividade se aberta no ano)."
    }
  },
  SIMPLES_NACIONAL: {
    tetoAnual: 4800000,
    tetoMensalAbertura: 400000,
    nome: "Simples Nacional",
    consequencias: {
      ACIMA: "Excesso de até 20%: exclusão do Simples Nacional a partir de 1º de janeiro do ano-calendário seguinte.",
      EXCESSO_20: "Excesso superior a 20%: exclusão do regime com efeitos imediatos a partir do mês seguinte ao que ocorreu o excesso."
    }
  },
  SUBLIMITE_ICMS_ISS: {
    tetoAnual: 3600000,
    tetoMensalAbertura: 300000,
    nome: "Sublimite ICMS/ISS",
    consequencias: {
      ACIMA: "Excesso de até 20%: recolhimento de ICMS e ISS fora do DAS a partir de 1º de janeiro do ano seguinte.",
      EXCESSO_20: "Excesso superior a 20%: recolhimento de ICMS e ISS fora do DAS a partir do mês seguinte ao excesso."
    }
  }
};

const NOMES_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

/**
 * Calcula o limite anual aplicável para a empresa considerando eventual proporcionalidade no ano de abertura.
 * @param {string} regime "MEI" ou "Simples Nacional"
 * @param {number} anoExercicio Ex: 2026
 * @param {string} dataAbertura Data de início da atividade (ex: "2026-04-15" ou "2026-04")
 */
export function calcularLimiteProporcional(regime, anoExercicio, dataAbertura) {
  const cfg = regime === "MEI" ? LIMITES_2026.MEI : LIMITES_2026.SIMPLES_NACIONAL;
  if (!dataAbertura) return { tetoAnual: cfg.tetoAnual, mesesAtivos: 12, proporcional: false };

  const anoAbertura = parseInt(dataAbertura.slice(0, 4), 10);
  const mesAbertura = parseInt(dataAbertura.slice(5, 7), 10) || 1;

  if (anoAbertura === anoExercicio) {
    // Proporcional aos meses da abertura até dezembro (inclusive o mês de abertura)
    const mesesAtivos = Math.max(1, 12 - mesAbertura + 1);
    const tetoAnual = mesesAtivos * cfg.tetoMensalAbertura;
    return { tetoAnual, mesesAtivos, proporcional: true, mesAbertura };
  }

  return { tetoAnual: cfg.tetoAnual, mesesAtivos: 12, proporcional: false };
}

/**
 * Avalia a situação do faturamento da empresa perante os limites legais.
 * @param {Object} params
 * @param {Object} params.empresa Empresa (matriz ou consolidada)
 * @param {number} params.ano Ano do exercício (ex: 2026)
 * @param {Object} params.faturamentos Objeto com meses '01'..'12' mapeados para valores numéricos
 * @param {number} [params.anoAtual] Ano corrente para efeito de projeção
 * @param {number} [params.mesAtual] Mês corrente (1..12) para efeito de projeção
 */
export function avaliarLimites({ empresa, ano, faturamentos = {}, anoAtual = new Date().getFullYear(), mesAtual = new Date().getMonth() + 1 }) {
  const regime = empresa.regime;
  const ehMei = regime === "MEI";
  const ehSimples = regime === "Simples Nacional";

  // Só avalia empresas optantes pelo Simples Nacional ou MEI não baixadas
  if ((!ehMei && !ehSimples) || empresa.baixa) {
    return null;
  }

  const { tetoAnual, mesesAtivos, proporcional, mesAbertura } = calcularLimiteProporcional(regime, ano, empresa.inicioAtividade || empresa.inicio);

  // Total acumulado no ano
  let totalAcumulado = 0;
  let mesesLancados = 0;
  const valoresPorMes = [];

  for (let m = 1; m <= 12; m++) {
    const chave = String(m).padStart(2, "0");
    const v = faturamentos[chave];
    if (v !== undefined && v !== null && !isNaN(v)) {
      totalAcumulado += Number(v);
      mesesLancados++;
      valoresPorMes.push({ mes: m, nomeMes: NOMES_MESES[m - 1], valor: Number(v) });
    }
  }

  const percentualUso = tetoAnual > 0 ? (totalAcumulado / tetoAnual) * 100 : 0;

  // Projeção para o ano corrente (quando ainda há meses a decorrer)
  let projecaoAnual = totalAcumulado;
  let mesEstouro = null;
  let estouraProjecao = false;

  if (ano === anoAtual && mesesLancados > 0 && mesesLancados < 12) {
    const mediaMensal = totalAcumulado / mesesLancados;
    projecaoAnual = totalAcumulado + mediaMensal * (12 - mesesLancados);

    if (projecaoAnual > tetoAnual && totalAcumulado <= tetoAnual) {
      estouraProjecao = true;
      let simulado = totalAcumulado;
      for (let m = mesesLancados + 1; m <= 12; m++) {
        simulado += mediaMensal;
        if (simulado > tetoAnual) {
          mesEstouro = NOMES_MESES[m - 1];
          break;
        }
      }
    }
  }

  // Definição do Nível
  let nivel = "OK";
  let consequencia = null;

  if (percentualUso > 120) {
    nivel = "EXCESSO_20";
    consequencia = ehMei ? LIMITES_2026.MEI.consequencias.EXCESSO_20 : LIMITES_2026.SIMPLES_NACIONAL.consequencias.EXCESSO_20;
  } else if (percentualUso > 100) {
    nivel = "ACIMA";
    consequencia = ehMei ? LIMITES_2026.MEI.consequencias.ACIMA : LIMITES_2026.SIMPLES_NACIONAL.consequencias.ACIMA;
  } else if (percentualUso >= 80 || estouraProjecao) {
    nivel = "ATENCAO";
    if (estouraProjecao && mesEstouro) {
      consequencia = `No ritmo atual de faturamento, a empresa ultrapassará o limite anual em ${mesEstouro}. Prepare o planejamento tributário.`;
    } else {
      consequencia = `Faturamento atingiu ${percentualUso.toFixed(1)}% do teto anual. Monitore as próximas emissões.`;
    }
  }

  // Avaliação do sublimite estadual para empresas do Simples Nacional
  let alertaSublimite = null;
  if (ehSimples) {
    const tetoSublimite = proporcional
      ? mesesAtivos * LIMITES_2026.SUBLIMITE_ICMS_ISS.tetoMensalAbertura
      : LIMITES_2026.SUBLIMITE_ICMS_ISS.tetoAnual;
    const pctSub = (totalAcumulado / tetoSublimite) * 100;
    if (pctSub > 120) {
      alertaSublimite = { nivel: "EXCESSO_20", pct: pctSub, teto: tetoSublimite, consequencia: LIMITES_2026.SUBLIMITE_ICMS_ISS.consequencias.EXCESSO_20 };
    } else if (pctSub > 100) {
      alertaSublimite = { nivel: "ACIMA", pct: pctSub, teto: tetoSublimite, consequencia: LIMITES_2026.SUBLIMITE_ICMS_ISS.consequencias.ACIMA };
    } else if (pctSub >= 80) {
      alertaSublimite = { nivel: "ATENCAO", pct: pctSub, teto: tetoSublimite, consequencia: `Sublimite de ICMS/ISS atingiu ${pctSub.toFixed(1)}%.` };
    }
  }

  return {
    empresaId: empresa.id,
    empresaNome: empresa.nome,
    empresaCnpj: empresa.documento,
    regime,
    ano,
    totalAcumulado,
    tetoAnual,
    percentualUso: Math.round(percentualUso * 10) / 10,
    nivel,
    proporcional,
    mesesAtivos,
    mesesLancados,
    projecaoAnual: Math.round(projecaoAnual * 100) / 100,
    estouraProjecao,
    mesEstouro,
    consequencia,
    alertaSublimite
  };
}

/**
 * Agrupa faturamentos por empresa raiz (matriz + filiais) e avalia a lista completa.
 */
export function avaliarTodasEmpresas(empresas, faturamentosPorAno, ano, anoAtual, mesAtual) {
  if (!Array.isArray(empresas)) return [];

  // Indexa faturamentos por empresaId
  const fatMap = faturamentosPorAno[String(ano)] || {};

  // Mapeia matrizes e filiais pelo CNPJ raiz (primeiros 8 dígitos)
  const grupos = new Map();

  empresas.forEach((emp) => {
    if (emp.baixa) return;
    const docLimpo = String(emp.documento || "").replace(/\D/g, "");
    const raiz = docLimpo.length === 14 ? docLimpo.slice(0, 8) : emp.id;
    if (!grupos.has(raiz)) {
      grupos.set(raiz, { matriz: null, filiais: [] });
    }
    const g = grupos.get(raiz);
    const ehFilial = docLimpo.length === 14 && docLimpo.slice(8, 12) !== "0001";
    if (ehFilial) {
      g.filiais.push(emp);
    } else {
      g.matriz = emp;
    }
  });

  const resultados = [];

  grupos.forEach((g) => {
    const principal = g.matriz || g.filiais[0];
    if (!principal) return;

    // Consolida os faturamentos da matriz e de todas as filiais
    const fatConsolidado = {};
    const todas = [g.matriz, ...g.filiais].filter(Boolean);

    for (let m = 1; m <= 12; m++) {
      const chave = String(m).padStart(2, "0");
      let somaMes = 0;
      let temValor = false;
      todas.forEach((e) => {
        const v = (fatMap[e.id] || {})[chave];
        if (v !== undefined && v !== null && !isNaN(v)) {
          somaMes += Number(v);
          temValor = true;
        }
      });
      if (temValor) fatConsolidado[chave] = somaMes;
    }

    const avaliacao = avaliarLimites({
      empresa: principal,
      ano,
      faturamentos: fatConsolidado,
      anoAtual,
      mesAtual
    });

    if (avaliacao) {
      avaliacao.qtdFiliais = g.filiais.length;
      resultados.push(avaliacao);
    }
  });

  // Ordena pelos que mais pedem atenção (EXCESSO_20 > ACIMA > ATENCAO > OK) e depois por maior % de uso
  const peso = { EXCESSO_20: 4, ACIMA: 3, ATENCAO: 2, OK: 1 };
  resultados.sort((a, b) => (peso[b.nivel] || 0) - (peso[a.nivel] || 0) || b.percentualUso - a.percentualUso);

  return resultados;
}
