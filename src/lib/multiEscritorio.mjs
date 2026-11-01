/**
 * Gerenciamento Multi-Escritório (Multi-Tenant) e Acessos de Teste (Trial).
 *
 * Estrutura de três níveis:
 * 1. MakerPixel (ADMIN_PRODUTO)
 * 2. Escritório Contábil (ADMIN_ESCRITORIO, situação: TESTE, ATIVO, SUSPENSO, ENCERRADO)
 * 3. Usuários e Empresas do escritório
 */

const STORAGE_KEY_ESCRITORIOS = "mp:escritorios";
const STORAGE_KEY_ATIVO = "mp:escritorio_ativo";
const STORAGE_KEY_SUPORTE = "mp:suporte_ativo_ate";
const WHATSAPP_MAKERPIXEL = "5548999999999"; // Tubarão/SC

const ESCRITORIOS_PADRAO = [
  {
    id: "esc-modelo",
    cnpj: "12.345.678/0001-90",
    razaoSocial: "Escritório Contábil Modelo",
    nomeFantasia: "Contabilidade Modelo Tubarão",
    contato: "Carlos Eduardo Silveira",
    email: "carlos@contabilidademodelo.com.br",
    telefone: "(48) 3622-1000",
    cidade: "Tubarão",
    uf: "SC",
    situacao: "ATIVO", // ATIVO | TESTE | SUSPENSO | ENCERRADO
    modulos: ["integracao", "conciliacao", "vencimentos", "em-dia", "fiscal", "horas", "lucros"],
    limiteUsuarios: 15,
    limiteEmpresas: 150,
    criadoEm: "2026-01-10T08:00:00Z"
  },
  {
    id: "esc-teste-3d",
    cnpj: "98.765.432/0001-10",
    razaoSocial: "Delta Gestão Contábil Eireli",
    nomeFantasia: "Delta Contabilidade",
    contato: "Fernanda Machado",
    email: "fernanda@deltacontabil.com.br",
    telefone: "(48) 99123-4567",
    cidade: "Tubarão",
    uf: "SC",
    situacao: "TESTE",
    testeExpiraEm: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    modulos: ["integracao", "conciliacao", "vencimentos", "em-dia", "fiscal", "horas", "lucros"],
    limiteUsuarios: 3,
    limiteEmpresas: 20,
    criadoEm: new Date().toISOString()
  }
];

function lerStorage(key, padrao) {
  if (typeof localStorage === "undefined") return padrao;
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : padrao;
  } catch (e) {
    return padrao;
  }
}

function salvarStorage(key, valor) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(valor));
  } catch (e) {}
}

/**
 * Gera senha provisória de fácil ditado no formato Xxxx-0000-xxxx.
 */
export function gerarSenhaProvisoria() {
  const consoantes = "bcdfghjklmnpqrstvwxyz";
  const vogais = "aeiou";
  const parte = (tam) => {
    let s = "";
    for (let i = 0; i < tam; i++) {
      s += i % 2 === 0 ? consoantes[Math.floor(Math.random() * consoantes.length)] : vogais[Math.floor(Math.random() * vogais.length)];
    }
    return s;
  };
  const p1 = parte(4);
  const capital = p1.charAt(0).toUpperCase() + p1.slice(1);
  const num = String(Math.floor(1000 + Math.random() * 9000));
  const p2 = parte(4);
  return `${capital}-${num}-${p2}`;
}

export function listarEscritorios() {
  const l = lerStorage(STORAGE_KEY_ESCRITORIOS, ESCRITORIOS_PADRAO);
  return Array.isArray(l) && l.length > 0 ? l : ESCRITORIOS_PADRAO;
}

export function obterEscritorio(id) {
  const lista = listarEscritorios();
  return lista.find((e) => e && e.id === id) || lista[0] || ESCRITORIOS_PADRAO[0];
}

export function escritorioAtivo() {
  const lista = listarEscritorios();
  const idPadrao = (lista[0] && lista[0].id) ? lista[0].id : "esc-modelo";
  const idAtivo = lerStorage(STORAGE_KEY_ATIVO, idPadrao);
  return lista.find((e) => e && e.id === idAtivo) || lista[0] || ESCRITORIOS_PADRAO[0];
}

export function definirEscritorioAtivo(id) {
  salvarStorage(STORAGE_KEY_ATIVO, id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("makerpixel:escritorio_mudou", { detail: { id } }));
  }
}

/**
 * Cria um novo acesso de teste para escritório de contabilidade.
 */
export function criarAcessoTeste({
  nome,
  cnpj,
  contato,
  email,
  telefone = "",
  cidade = "Tubarão",
  uf = "SC",
  dias = 3,
  modulos = ["integracao", "conciliacao", "vencimentos", "em-dia", "fiscal", "horas", "lucros"],
  carregarDemo = true
}) {
  const lista = listarEscritorios();
  const id = "esc-" + Date.now();

  // Expira às 23:59:59 da data final
  const expira = new Date();
  expira.setDate(expira.getDate() + Math.max(1, Math.min(30, dias)));
  expira.setHours(23, 59, 59, 999);

  const novo = {
    id,
    cnpj: cnpj || "00.000.000/0001-00",
    razaoSocial: nome,
    nomeFantasia: nome,
    contato,
    email,
    telefone,
    cidade,
    uf,
    situacao: "TESTE",
    testeExpiraEm: expira.toISOString(),
    modulos,
    limiteUsuarios: 3,
    limiteEmpresas: 20,
    carregarDemo,
    criadoEm: new Date().toISOString()
  };

  const senhaProvisoria = gerarSenhaProvisoria();
  lista.push(novo);
  salvarStorage(STORAGE_KEY_ESCRITORIOS, lista);
  definirEscritorioAtivo(id);

  return { escritorio: novo, senhaProvisoria };
}

/**
 * Prorroga o período de teste por N dias adicionais.
 */
export function prorrogarTeste(id, dias = 3) {
  const lista = listarEscritorios();
  const esc = lista.find((e) => e.id === id);
  if (!esc) throw new Error("Escritório não encontrado.");

  const base = esc.testeExpiraEm && new Date(esc.testeExpiraEm) > new Date() ? new Date(esc.testeExpiraEm) : new Date();
  base.setDate(base.getDate() + dias);
  base.setHours(23, 59, 59, 999);
  esc.testeExpiraEm = base.toISOString();
  esc.situacao = "TESTE";
  salvarStorage(STORAGE_KEY_ESCRITORIOS, lista);
  return esc;
}

/**
 * Converte escritório de teste em cliente ATIVO permanente.
 */
export function converterEmCliente(id) {
  const lista = listarEscritorios();
  const esc = lista.find((e) => e.id === id);
  if (!esc) throw new Error("Escritório não encontrado.");

  esc.situacao = "ATIVO";
  delete esc.testeExpiraEm;
  esc.limiteUsuarios = 25;
  esc.limiteEmpresas = 300;
  salvarStorage(STORAGE_KEY_ESCRITORIOS, lista);
  return esc;
}

/**
 * Suspende o acesso do escritório.
 */
export function suspenderEscritorio(id) {
  const lista = listarEscritorios();
  const esc = lista.find((e) => e.id === id);
  if (!esc) throw new Error("Escritório não encontrado.");
  esc.situacao = "SUSPENSO";
  salvarStorage(STORAGE_KEY_ESCRITORIOS, lista);
  return esc;
}

/**
 * Reativa escritório suspenso.
 */
export function reativarEscritorio(id) {
  const lista = listarEscritorios();
  const esc = lista.find((e) => e.id === id);
  if (!esc) throw new Error("Escritório não encontrado.");
  esc.situacao = "ATIVO";
  salvarStorage(STORAGE_KEY_ESCRITORIOS, lista);
  return esc;
}

/**
 * Avalia o status do teste gratuito.
 */
export function statusTeste(escritorio) {
  if (!escritorio || typeof escritorio !== "object" || escritorio.situacao !== "TESTE" || !escritorio.testeExpiraEm) {
    return { emTeste: false, expirado: false, diasRestantes: 0, terminaHoje: false };
  }

  const agora = Date.now();
  const expira = new Date(escritorio.testeExpiraEm).getTime();
  const diffMs = expira - agora;
  const expirado = diffMs <= 0;
  const diasRestantes = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const terminaHoje = diasRestantes <= 1 && !expirado;

  return {
    emTeste: true,
    expirado,
    diasRestantes,
    terminaHoje,
    expiraEmData: new Date(escritorio.testeExpiraEm).toLocaleDateString("pt-BR")
  };
}

/**
 * Gera mensagem de convite pronta para WhatsApp ou e-mail.
 */
export function gerarMensagemConvite(escritorio, senha) {
  const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://mauricio-g-oliveira.github.io/makerpixel-gestao/";
  const expiraStr = escritorio.testeExpiraEm ? new Date(escritorio.testeExpiraEm).toLocaleDateString("pt-BR") : "";

  return `Olá ${escritorio.contato || escritorio.razaoSocial}!\n\n` +
    `Seu acesso de teste ao MakerPixel Contábil está liberado:\n` +
    `🔗 Link: ${url}\n` +
    `👤 E-mail: ${escritorio.email}\n` +
    `🔑 Senha provisória: ${senha}\n\n` +
    (expiraStr ? `Seu teste gratuito vai até ${expiraStr}.\n\n` : "") +
    `No primeiro acesso você poderá cadastrar a sua senha definitiva.\n` +
    `Equipe MakerPixel · Tubarão/SC`;
}

/**
 * Suporte com autorização por 24h.
 */
export function liberarSuporte24h() {
  const ate = Date.now() + 24 * 60 * 60 * 1000;
  salvarStorage(STORAGE_KEY_SUPORTE, ate);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("makerpixel:suporte_mudou"));
  }
}

export function isSuporteAtivo() {
  const ate = lerStorage(STORAGE_KEY_SUPORTE, 0);
  return Date.now() < ate;
}

export function revogarSuporte() {
  salvarStorage(STORAGE_KEY_SUPORTE, 0);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("makerpixel:suporte_mudou"));
  }
}

/**
 * Link para contratação via WhatsApp com mensagem pré-definida.
 */
export function linkContratarWhatsApp(escritorio) {
  const texto = encodeURIComponent(`Olá! Gostaria de contratar o MakerPixel Contábil para o escritório ${escritorio ? escritorio.razaoSocial : ""}.`);
  return `https://wa.me/${WHATSAPP_MAKERPIXEL}?text=${texto}`;
}
