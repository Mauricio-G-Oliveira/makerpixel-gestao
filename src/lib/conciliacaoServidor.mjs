/**
 * conciliacaoServidor.mjs — Persistência de conciliação bancária e perfis de cliente.
 * 
 * Funciona de forma transparente:
 * - Com backend API (quando CONFIG.apiUrl existe)
 * - No navegador (Store / IndexedDB / LocalStorage) quando offline ou em modo de testes.
 * 
 * Controle de concorrência:
 * - Ao salvar, compara a versão. Se houver divergência, dispara erro 409 com mensagem:
 *   "Fulano salvou esta conciliação às HH:MM; abra de novo".
 */

import { Store } from "./legado.js";
import { perfilPadrao } from "./regrasConciliacao.mjs";

const CHAVE_CONCILIACOES = "conciliacoes:servidor";
const CHAVE_PERFIS = "conciliacao:perfis-clientes";

function getStoreMap(chave) {
  return Store.get(chave) || {};
}

function setStoreMap(chave, mapa) {
  Store.set(chave, mapa);
}

function horaFormatada(isoDate) {
  if (!isoDate) return "--:--";
  const d = new Date(isoDate);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function criarServicoConciliacao({ apiUrl, token, usuarioAtual } = {}) {
  const modoApi = !!apiUrl;

  async function chamarApi(metodo, caminho, corpo) {
    const headers = { "Accept": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (corpo !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${apiUrl.replace(/\/+$/, "")}${caminho}`, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined
    });

    const texto = await res.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch (e) { json = null; }

    if (!res.ok) {
      const err = new Error((json && json.message) || (json && json.mensagem) || `Erro ${res.status}`);
      err.status = res.status;
      err.codigo = (json && json.erro) || `http-${res.status}`;
      throw err;
    }

    return json;
  }

  return {
    async listarPorMes(competencia) {
      if (modoApi) {
        return chamarApi("GET", `/api/conciliacoes?competencia=${encodeURIComponent(competencia)}`);
      }
      const map = getStoreMap(CHAVE_CONCILIACOES);
      return Object.values(map)
        .filter((c) => c.competencia === competencia)
        .map((c) => ({
          id: c.id,
          cnpj: c.cnpj,
          banco: c.banco,
          agencia: c.agencia,
          conta: c.conta,
          competencia: c.competencia,
          resumoJson: c.resumoJson,
          ultimoUsuarioNome: c.ultimoUsuarioNome,
          versao: c.versao,
          atualizadoEm: c.atualizadoEm
        }))
        .sort((a, b) => String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)));
    },

    async listarPorEmpresaEMes(cnpj, competencia) {
      const limpo = String(cnpj || "").replace(/\D/g, "");
      if (modoApi) {
        return chamarApi("GET", `/api/conciliacoes?cnpj=${encodeURIComponent(limpo)}&competencia=${encodeURIComponent(competencia)}`);
      }
      const map = getStoreMap(CHAVE_CONCILIACOES);
      return Object.values(map)
        .filter((c) => c.cnpj === limpo && c.competencia === competencia)
        .map((c) => ({
          id: c.id,
          cnpj: c.cnpj,
          banco: c.banco,
          agencia: c.agencia,
          conta: c.conta,
          competencia: c.competencia,
          resumoJson: c.resumoJson,
          ultimoUsuarioNome: c.ultimoUsuarioNome,
          versao: c.versao,
          atualizadoEm: c.atualizadoEm
        }));
    },

    async obterPorId(id) {
      if (modoApi) {
        return chamarApi("GET", `/api/conciliacoes/${id}`);
      }
      const map = getStoreMap(CHAVE_CONCILIACOES);
      const c = map[id];
      if (!c) throw new Error("Conciliação não encontrada.");
      return c;
    },

    async salvar(dados) {
      if (modoApi) {
        return chamarApi("POST", "/api/conciliacoes", dados);
      }

      const map = getStoreMap(CHAVE_CONCILIACOES);
      const limpo = String(dados.cnpj || "").replace(/\D/g, "");
      const chaveItem = `${limpo}_${dados.banco}_${dados.agencia || ""}_${dados.conta}_${dados.competencia}`;

      const existente = Object.values(map).find(
        (c) => `${c.cnpj}_${c.banco}_${c.agencia || ""}_${c.conta}_${c.competencia}` === chaveItem
      );

      const agora = new Date().toISOString();
      const usuarioNome = (usuarioAtual && usuarioAtual.nome) ? usuarioAtual.nome : "Usuário";

      if (existente) {
        if (dados.versao !== undefined && dados.versao !== null && Number(dados.versao) !== Number(existente.versao)) {
          const hora = horaFormatada(existente.atualizadoEm);
          const err = new Error(`${existente.ultimoUsuarioNome} salvou esta conciliação às ${hora}; abra de novo`);
          err.status = 409;
          err.codigo = "conflito-versao";
          throw err;
        }

        existente.versao = (Number(existente.versao) || 1) + 1;
        existente.extratoJson = dados.extratoJson || "[]";
        existente.planilhaJson = dados.planilhaJson || "[]";
        existente.conferidosJson = dados.conferidosJson || "[]";
        existente.juncoesManuaisJson = dados.juncoesManuaisJson || "[]";
        existente.observacoes = dados.observacoes || "";
        existente.resumoJson = dados.resumoJson || "{}";
        existente.ultimoUsuarioNome = usuarioNome;
        existente.atualizadoEm = agora;

        map[existente.id] = existente;
        setStoreMap(CHAVE_CONCILIACOES, map);
        return existente;
      }

      const id = "conc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const novo = {
        id,
        cnpj: limpo,
        banco: dados.banco,
        agencia: dados.agencia || "",
        conta: dados.conta,
        competencia: dados.competencia,
        extratoJson: dados.extratoJson || "[]",
        planilhaJson: dados.planilhaJson || "[]",
        conferidosJson: dados.conferidosJson || "[]",
        juncoesManuaisJson: dados.juncoesManuaisJson || "[]",
        observacoes: dados.observacoes || "",
        resumoJson: dados.resumoJson || "{}",
        ultimoUsuarioNome: usuarioNome,
        versao: 1,
        criadoEm: agora,
        atualizadoEm: agora
      };

      map[id] = novo;
      setStoreMap(CHAVE_CONCILIACOES, map);
      return novo;
    },

    async apagar(id) {
      if (modoApi) {
        return chamarApi("DELETE", `/api/conciliacoes/${id}`);
      }
      const map = getStoreMap(CHAVE_CONCILIACOES);
      delete map[id];
      setStoreMap(CHAVE_CONCILIACOES, map);
    },

    async obterPerfil(cnpj) {
      const limpo = String(cnpj || "").replace(/\D/g, "");
      if (modoApi) {
        return chamarApi("GET", `/api/conciliacoes/perfil/${limpo}`);
      }
      const perfis = getStoreMap(CHAVE_PERFIS);
      return Object.assign({}, perfilPadrao(), perfis[limpo] || {});
    },

    async salvarPerfil(cnpj, perfil) {
      const limpo = String(cnpj || "").replace(/\D/g, "");
      if (modoApi) {
        return chamarApi("POST", "/api/conciliacoes/perfil", { cnpj: limpo, ...perfil });
      }
      const perfis = getStoreMap(CHAVE_PERFIS);
      perfis[limpo] = Object.assign({}, perfilPadrao(), perfil);
      setStoreMap(CHAVE_PERFIS, perfis);
      return perfis[limpo];
    }
  };
}
