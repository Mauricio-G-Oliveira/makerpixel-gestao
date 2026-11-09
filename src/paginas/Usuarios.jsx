import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthCore } from "../lib/legado.js";
import { useAuth } from "../lib/auth.jsx";
import { useAvisos } from "../componentes/Avisos.jsx";
import { useDepCadastro } from "../lib/useDepCadastro.js";
import { DEPARTAMENTOS_CARTEIRA, contagemPorSetor, responsaveisSemAcesso } from "../lib/carteira.mjs";
import { carregarXlsx } from "../lib/leitores.js";
import Janela from "../componentes/Janela.jsx";

/*
 * Usuários (só administradores): criar, editar, áreas de acesso, carteira por responsável e
 * departamento, nova senha provisória, desativar, excluir e, sem servidor, exportar/importar
 * o arquivo de acessos. Regras em src/legado/auth.js e src/lib/carteira.mjs.
 */
const NOME_AREA = {};
AuthCore.AREAS.forEach((a) => { NOME_AREA[a.id] = a.nome; });

function dataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function Selo({ tipo, children, title }) {
  const cor = { ativo: "bg-ok-soft text-credit", inativo: "bg-surface-2 text-muted border border-line", provisoria: "bg-warn-soft text-warn", admin: "bg-brand-soft text-brand" }[tipo];
  return <span title={title} className={"inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + cor}>{children}</span>;
}
function linkDoSistema() { return location.origin + location.pathname.replace(/index\.html$/, ""); }

function mensagemAcesso(u, senha, servidor) {
  return "Olá, " + u.nome.split(" ")[0] + "! Segue o seu acesso ao MakerPixel Techsystem:\n\n" +
    "Link: " + linkDoSistema() + "\n" + "E-mail: " + u.email + "\n" + "Senha provisória: " + senha + "\n\n" +
    "No primeiro acesso o sistema pede para você criar a sua própria senha." +
    (servidor ? "" : "\nNesta fase de testes, na primeira vez neste computador, escolha \"Importar o arquivo de acessos\" e use o arquivo que vou te enviar junto.");
}

function FormUsuario({ editando, inicial, empresas, aoSalvar, aoFechar, aberta }) {
  const [nome, setNome] = useState(""), [email, setEmail] = useState(""), [perfil, setPerfil] = useState("usuario");
  const [areas, setAreas] = useState([]), [ativo, setAtivo] = useState(true), [erro, setErro] = useState(""), [ocupado, setOcupado] = useState(false);
  const [carteiraAutomatica, setCarteiraAutomatica] = useState(true);
  const [setoresCarteira, setSetoresCarteira] = useState([]);
  const [empresasAMais, setEmpresasAMais] = useState([]);
  const [buscaEmpresa, setBuscaEmpresa] = useState("");

  useEffect(() => {
    if (!aberta) return;
    const u = editando;
    setNome(u ? u.nome : (inicial && inicial.nome ? inicial.nome : ""));
    setEmail(u ? u.email : (inicial && inicial.email ? inicial.email : ""));
    setPerfil(u ? u.perfil : "usuario");
    setAreas(u ? (u.perfil === "admin" ? AuthCore.AREAS.map((a) => a.id) : u.areas.slice()) : []);
    setAtivo(u ? u.ativo : true);
    setCarteiraAutomatica(u ? u.carteiraAutomatica !== false : true);
    setSetoresCarteira(u && Array.isArray(u.setoresCarteira) ? u.setoresCarteira.slice() : []);
    setEmpresasAMais(u && Array.isArray(u.empresasAMais) ? u.empresasAMais.slice() : []);
    setBuscaEmpresa("");
    setErro("");
    setOcupado(false);
  }, [aberta, editando, inicial]);

  const contagem = useMemo(() => contagemPorSetor(empresas, email), [empresas, email]);

  const alternarArea = (id) => setAreas((l) => (l.indexOf(id) > -1 ? l.filter((x) => x !== id) : l.concat(id)));
  const alternarSetor = (id) => setSetoresCarteira((l) => (l.indexOf(id) > -1 ? l.filter((x) => x !== id) : l.concat(id)));
  const alternarEmpresaAMais = (id) => setEmpresasAMais((l) => (l.indexOf(id) > -1 ? l.filter((x) => x !== id) : l.concat(id)));

  const salvar = () => {
    setErro(""); setOcupado(true);
    aoSalvar({
      nome,
      email,
      perfil,
      areas: perfil === "admin" ? [] : areas,
      ativo,
      carteiraAutomatica,
      setoresCarteira,
      empresasAMais
    }).catch((e) => setErro(e.message)).finally(() => setOcupado(false));
  };

  const principal = editando && editando.email === AuthCore.ADMIN_EMAIL;

  const empresasFiltradas = useMemo(() => {
    const b = buscaEmpresa.toLowerCase().trim();
    if (!b) return (empresas || []).slice(0, 15);
    return (empresas || []).filter((c) => (c.nome || "").toLowerCase().includes(b) || (c.documento || "").includes(b)).slice(0, 20);
  }, [empresas, buscaEmpresa]);

  return (
    <Janela aberta={aberta} titulo={editando ? "Editar usuário" : "Novo usuário"} aoFechar={aoFechar} largura="max-w-[720px]"
      rodape={<><button type="button" className="btn-fantasma" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn-primario" disabled={ocupado} onClick={salvar}>{editando ? "Salvar" : "Criar usuário"}</button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className="rotulo" htmlFor="usr-nome">Nome</label>
            <input id="usr-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" /></div>
          <div className="space-y-1.5"><label className="rotulo" htmlFor="usr-email">E-mail</label>
            <input id="usr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={principal} placeholder="nome@empresa.com.br" autoComplete="off" /></div>
        </div>

        <div className="space-y-1.5">
          <span className="rotulo">Perfil</span>
          <div className="inline-flex w-full p-1 gap-1 rounded-lg bg-surface-2 border border-line" role="radiogroup" aria-label="Perfil">
            {[["usuario", "Usuário"], ["admin", "Administrador"]].map(([id, nomeP]) => (
              <button key={id} type="button" role="radio" aria-checked={perfil === id} onClick={() => setPerfil(id)}
                className={"flex-1 rounded-md px-3 py-1.5 text-[14px] " + (perfil === id ? "bg-surface text-brand font-semibold shadow-sm" : "text-ink-2")}>{nomeP}</button>
            ))}
          </div>
          <p className="text-[12.5px] text-muted">{perfil === "admin"
            ? "Para gestores e gerentes: acessa tudo e cadastra, altera e desativa usuários (menos o administrador principal)."
            : "Usuário acessa só as áreas marcadas e a carteira abaixo."}</p>
        </div>

        <fieldset disabled={perfil === "admin"} className={"space-y-2 " + (perfil === "admin" ? "opacity-55" : "")}>
          <legend className="rotulo mb-2">Pode acessar</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {AuthCore.AREAS.map((a) => {
              const marcado = perfil === "admin" || areas.indexOf(a.id) > -1;
              return (
                <label key={a.id} className={"flex gap-2.5 items-start rounded-lg border px-2.5 py-2 cursor-pointer " + (marcado ? "border-brand bg-brand-soft" : "border-line")}>
                  <input type="checkbox" className="mt-1" checked={marcado} onChange={() => alternarArea(a.id)} />
                  <span><strong className="block text-[13.5px] font-semibold">{a.nome}</strong>{a.detalhe && <span className="block text-[12px] text-muted">{a.detalhe}</span>}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Carteira por responsável e departamento */}
        <div className={"space-y-3 pt-2 border-t border-line " + (perfil === "admin" ? "opacity-55" : "")}>
          <div className="flex items-center justify-between">
            <span className="rotulo font-semibold">Carteira de clientes</span>
            {email && (
              <span className="text-[12.5px] font-medium text-brand">
                Hoje: {contagem.contarMarcados(setoresCarteira)} empresa(s) nos setores marcados ({contagem.total} em todos)
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-[14px] cursor-pointer">
            <input type="checkbox" checked={carteiraAutomatica} onChange={(e) => setCarteiraAutomatica(e.target.checked)} />
            <span><strong>Carteira automática:</strong> vê as empresas em que é o responsável</span>
          </label>

          {carteiraAutomatica && (
            <div className="pl-6 space-y-2 text-[13px]">
              <span className="block text-muted text-[12.5px]">
                Marque os setores que esta pessoa atende. Sem setor marcado, vale qualquer departamento em que ela for responsável:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEPARTAMENTOS_CARTEIRA.map((d) => {
                  const marcado = setoresCarteira.indexOf(d.id) > -1;
                  const qtd = contagem.porSetor[d.id] || 0;
                  return (
                    <label key={d.id} className={"flex items-center justify-between gap-1.5 p-2 rounded-md border cursor-pointer " + (marcado ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-surface-2")}>
                      <span className="flex items-center gap-1.5">
                        <input type="checkbox" checked={marcado} onChange={() => alternarSetor(d.id)} />
                        <span>{d.nome}</span>
                      </span>
                      <span className="text-[12px] tabular-nums text-muted">({qtd})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empresas a mais */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="rotulo">Empresas a mais (cobertura de férias)</span>
              {empresasAMais.length > 0 && <span className="text-[12px] text-brand font-semibold">{empresasAMais.length} adicionada(s)</span>}
            </div>
            <p className="text-[12px] text-muted">Exceções escolhidas à mão que sempre somam à carteira deste usuário.</p>
            <input
              type="text"
              placeholder="Buscar empresa para adicionar…"
              value={buscaEmpresa}
              onChange={(e) => setBuscaEmpresa(e.target.value)}
              className="text-[13px] h-8"
            />
            <div className="max-h-[140px] overflow-y-auto border border-line rounded-md p-1 divide-y divide-line text-[13px]">
              {empresasFiltradas.length === 0 ? (
                <p className="p-2 text-center text-muted text-[12px]">Nenhuma empresa encontrada</p>
              ) : (
                empresasFiltradas.map((c) => {
                  const idStr = String(c.id);
                  const marcado = empresasAMais.indexOf(idStr) > -1;
                  return (
                    <label key={c.id} className={"flex items-center justify-between p-1.5 cursor-pointer hover:bg-surface-2 " + (marcado ? "bg-brand-soft font-medium" : "")}>
                      <span className="flex items-center gap-2 truncate">
                        <input type="checkbox" checked={marcado} onChange={() => alternarEmpresaAMais(idStr)} />
                        <span className="truncate">{c.nome}</span>
                      </span>
                      <span className="text-[11px] text-muted tabular-nums ml-2 shrink-0">{c.documento}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {editando && <label className="flex items-center gap-2 text-[14px] pt-2 border-t border-line"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Acesso ativo</label>}
        {erro && <p className="text-debit text-[13px]" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

function JanelaAcesso({ dados, aoFechar, servidor }) {
  const { aviso } = useAvisos();
  if (!dados) return null;
  const texto = mensagemAcesso(dados.usuario, dados.senha, servidor);
  const copiar = () => navigator.clipboard.writeText(texto).then(() => aviso("Mensagem copiada."));
  return (
    <Janela aberta titulo={dados.titulo} aoFechar={aoFechar} soPeloBotao largura="max-w-[560px]"
      rodape={<>
        <button type="button" className="btn-fantasma" onClick={aoFechar}>Fechar</button>
        <a className="btn-contorno" target="_blank" rel="noopener noreferrer"
          href={"mailto:" + encodeURIComponent(dados.usuario.email) + "?subject=" + encodeURIComponent("Acesso ao MakerPixel Techsystem") + "&body=" + encodeURIComponent(texto)}>Enviar por e-mail</a>
        <a className="btn-contorno" target="_blank" rel="noopener noreferrer" href={"https://wa.me/?text=" + encodeURIComponent(texto)}>WhatsApp</a>
        <button type="button" className="btn-primario" onClick={copiar}>Copiar mensagem</button>
      </>}>
      <p className="text-[13px] text-muted">A senha provisória aparece só agora. Envie a mensagem para a pessoa; no primeiro acesso ela cria a senha dela.</p>
      <textarea readOnly rows={10} value={texto} className="font-mono text-[13px] leading-relaxed" onFocus={(e) => e.target.select()} />
    </Janela>
  );
}

export default function Usuarios() {
  const { auth, usuario, definirUsuario } = useAuth();
  const [svc, versaoCadastro] = useDepCadastro();
  const { aviso, confirmar } = useAvisos();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ aberta: false, editando: null, inicial: null });
  const [acesso, setAcesso] = useState(null);
  const servidor = auth.modo === "api";
  const eu = (u) => u.id === (usuario.usuarioId || usuario.id);
  const souPrincipal = usuario.email === AuthCore.ADMIN_EMAIL;

  const empresas = useMemo(() => svc.empresas(), [svc, versaoCadastro]);
  const semAcesso = useMemo(() => responsaveisSemAcesso(empresas, lista), [empresas, lista]);

  const carregar = useCallback(() => auth.listarUsuarios().then(setLista).catch((e) => setErro(e.message)), [auth]);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = (dados) => {
    if (form.editando) {
      const ed = form.editando;
      return auth.atualizarUsuario(ed.id, dados).then(() => {
        setForm({ aberta: false, editando: null, inicial: null }); aviso("Usuário atualizado.");
        if (eu(ed)) return auth.usuarioAtual().then((u) => u && definirUsuario(u));
      }).then(carregar);
    }
    return auth.criarUsuario(dados).then((r) => {
      setForm({ aberta: false, editando: null, inicial: null });
      setAcesso({ usuario: r.usuario, senha: r.senhaProvisoria, titulo: "Acesso criado" });
    }).then(carregar);
  };

  const novaSenha = async (u) => {
    if (!(await confirmar({ titulo: "Nova senha provisória?", botao: "Gerar nova senha",
      texto: "A senha atual de " + u.nome + " deixa de funcionar, e a pessoa cria uma nova no próximo acesso." }))) return;
    auth.redefinirSenha(u.id).then((r) => { carregar(); setAcesso({ usuario: r.usuario, senha: r.senhaProvisoria, titulo: "Nova senha provisória" }); })
      .catch((e) => aviso(e.message));
  };
  const alternarAtivo = async (u) => {
    if (u.ativo && !(await confirmar({ titulo: "Desativar " + u.nome + "?", botao: "Desativar", perigo: true,
      texto: "A pessoa não consegue mais entrar até ser ativada de novo. Nada do que ela fez é apagado." }))) return;
    auth.atualizarUsuario(u.id, { ativo: !u.ativo }).then(() => {
      carregar();
      aviso(u.ativo ? "Acesso de " + u.nome.split(" ")[0] + " desativado." : "Acesso ativado.",
        u.ativo ? { desfazer: () => auth.atualizarUsuario(u.id, { ativo: true }).then(carregar) } : {});
    }).catch((e) => aviso(e.message));
  };
  const excluir = async (u) => {
    if (!(await confirmar({ titulo: "Excluir " + u.nome + "?", botao: "Excluir", perigo: true,
      texto: u.email + "\n\nNão dá para desfazer. Se for só por um tempo, prefira Desativar." }))) return;
    auth.excluirUsuario(u.id).then(() => { aviso("Usuário excluído."); carregar(); }).catch((e) => aviso(e.message));
  };

  const exportar = () => auth.exportarAcessos().then((arq) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(arq)], { type: "application/json" }));
    a.download = "acessos-gestao-financeira-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    aviso("Arquivo de acessos baixado. Envie junto com a mensagem de acesso.");
  }).catch((e) => aviso(e.message));

  const importar = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    f.text().then((t) => auth.importarAcessos(JSON.parse(t)))
      .then((r) => { aviso(r.novos + " novo(s) e " + r.atualizados + " atualizado(s)."); carregar(); })
      .catch((e) => aviso(e instanceof SyntaxError ? "Este não é um arquivo de acessos do sistema." : e.message));
  };

  const importarResponsaveis = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const XLSX = await carregarXlsx();
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const aba = wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: false, defval: "" });
      const res = svc.importarPlanilhaResponsaveis(rows);
      aviso(`${res.atualizadas} responsável(is) vinculado(s) em ${res.empresasAfetadas} empresa(s).` + (res.erros.length ? ` (${res.erros.length} ignoradas)` : ""));
    } catch (e) {
      aviso("Não foi possível ler a planilha de responsáveis: " + (e.message || e));
    }
  };

  const acoes = (u) => {
    const bloqueado = (u.principal && !souPrincipal) || u.teste;
    if (bloqueado) return null;
    const b = "rounded-md px-2.5 py-1.5 text-[13px] font-medium hover:bg-surface-2";
    return (
      <div className="flex flex-wrap md:flex-nowrap gap-1 md:justify-end">
        <button type="button" className={b} onClick={() => setForm({ aberta: true, editando: u, inicial: null })}>Editar</button>
        <button type="button" className={b} onClick={() => novaSenha(u)}>Nova senha</button>
        {!eu(u) && <button type="button" className={b} onClick={() => alternarAtivo(u)}>{u.ativo ? "Desativar" : "Ativar"}</button>}
        {!eu(u) && <button type="button" className={b + " text-debit hover:bg-debit-soft"} onClick={() => excluir(u)}>Excluir</button>}
      </div>
    );
  };

  const perfil = (u) => u.teste ? <Selo tipo="provisoria">Conta de teste</Selo> : u.principal ? <Selo tipo="admin">Administrador principal</Selo>
    : u.perfil === "admin" ? <Selo tipo="admin">Administrador</Selo> : <span className="text-[13px]">Usuário</span>;
  const situacao = (u) => !u.ativo ? <Selo tipo="inativo">Desativado</Selo>
    : u.trocarSenha ? <Selo tipo="provisoria" title="Ainda não criou a própria senha">Senha provisória</Selo> : <Selo tipo="ativo">Ativo</Selo>;
  const areas = (u) => u.perfil === "admin" ? <span className="rounded-md bg-surface-2 border border-line px-1.5 py-0.5 text-[12px]">Tudo, inclusive usuários</span>
    : u.areas.length ? u.areas.map((a) => <span key={a} className="rounded-md bg-surface-2 border border-line px-1.5 py-0.5 text-[12px]">{NOME_AREA[a] || a}</span>)
    : <span className="text-[12px] text-muted">Nenhuma área</span>;

  return (
    <div className="max-w-[1180px] flex flex-col gap-4">
      <section className="cartao">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="max-w-[640px]">
            <h2 className="text-[15px] font-semibold">Usuários</h2>
            <p className="text-[13px] text-muted mt-0.5">Quem pode entrar no sistema, carteira de clientes e áreas de acesso. Ao criar um usuário, o sistema gera senha provisória e mensagem para envio.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn-contorno btn-sm cursor-pointer">
              Importar responsáveis
              <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={importarResponsaveis} />
            </label>
            {!servidor && <button type="button" className="btn-fantasma btn-sm" onClick={exportar} title="Arquivo com os acessos">Exportar acessos</button>}
            {!servidor && <label className="btn-fantasma btn-sm cursor-pointer">Importar acessos<input type="file" accept=".json,application/json" hidden onChange={importar} /></label>}
            <button type="button" className="btn-primario btn-sm" onClick={() => setForm({ aberta: true, editando: null, inicial: null })}>Novo usuário</button>
          </div>
        </div>

        {erro && <p className="px-5 pb-4 text-debit">{erro}</p>}
        {!lista && !erro && <p className="px-5 pb-4 text-muted">Carregando…</p>}
        {lista && (
          <>
            <div className="hidden md:block overflow-x-auto border-t border-line">
              <table className="w-full text-[14px]">
                <thead><tr className="text-left text-[12px] uppercase tracking-wide text-muted">
                  {["Usuário", "Perfil", "Acesso a", "Carteira", "Situação", "Último acesso", ""].map((h, i) => <th key={i} className="px-5 py-2.5 font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {lista.map((u) => {
                    const cont = contagemPorSetor(empresas, u.email);
                    const qtdCarteira = u.perfil === "admin" ? empresas.length : cont.contarMarcados(u.setoresCarteira) + (u.empresasAMais ? u.empresasAMais.length : 0);
                    return (
                      <tr key={u.id} className={"border-t border-line align-top " + (u.ativo ? "" : "opacity-60")}>
                        <td className="px-5 py-3 min-w-[200px]"><strong className="font-semibold">{u.nome}</strong>{eu(u) && <span className="text-[12px] text-muted whitespace-nowrap"> (você)</span>}
                          <span className="block text-[12.5px] text-muted">{u.email}</span></td>
                        <td className="px-5 py-3">{perfil(u)}</td>
                        <td className="px-5 py-3"><div className="flex flex-wrap gap-1 max-w-[260px]">{areas(u)}</div></td>
                        <td className="px-5 py-3 text-[13px]">
                          {u.perfil === "admin" ? (
                            <span className="text-muted">Todas as empresas</span>
                          ) : (
                            <span><strong className="font-semibold text-ink">{qtdCarteira}</strong> empresa(s)</span>
                          )}
                        </td>
                        <td className="px-5 py-3">{situacao(u)}</td>
                        <td className="px-5 py-3 text-[13px] text-muted whitespace-nowrap">{dataHora(u.ultimoAcesso)}</td>
                        <td className="px-3 py-2">{acoes(u)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden border-t border-line">
              {lista.map((u) => (
                <li key={u.id} className={"px-4 py-3 border-b border-line last:border-0 flex flex-col gap-2 " + (u.ativo ? "" : "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><strong className="font-semibold">{u.nome}</strong>{eu(u) && <span className="text-[12px] text-muted"> (você)</span>}
                      <span className="block text-[12.5px] text-muted truncate">{u.email}</span></div>
                    {situacao(u)}
                  </div>
                  <div className="flex flex-wrap gap-1 items-center">{perfil(u)}{areas(u)}</div>
                  <span className="text-[12px] text-muted">Último acesso: {dataHora(u.ultimoAcesso)}</span>
                  {acoes(u)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Lista de responsáveis da planilha sem acesso */}
      {semAcesso.length > 0 && (
        <section className="cartao p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-warn">Responsáveis da planilha que ainda não têm acesso ({semAcesso.length})</h3>
              <p className="text-[13px] text-muted">E-mails encontrados nas empresas cadastradas que ainda não possuem login criado no sistema.</p>
            </div>
          </div>
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-[13.5px]">
              <thead className="bg-surface-2 text-left text-[12px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Responsável</th>
                  <th className="px-4 py-2 font-semibold">Departamentos</th>
                  <th className="px-4 py-2 font-semibold text-right">Empresas</th>
                  <th className="px-4 py-2 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {semAcesso.map((r) => (
                  <tr key={r.email} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <strong className="block font-medium">{r.nome}</strong>
                      <span className="text-[12px] text-muted">{r.email}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {r.departamentos.map((d) => (
                          <span key={d} className="rounded px-1.5 py-0.5 text-[11.5px] bg-surface-2 border border-line capitalize">
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      {r.empresasQtd}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="btn-primario btn-sm"
                        onClick={() => setForm({ aberta: true, editando: null, inicial: { nome: r.nome, email: r.email } })}
                      >
                        Criar acesso
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <FormUsuario
        aberta={form.aberta}
        editando={form.editando}
        inicial={form.inicial}
        empresas={empresas}
        aoSalvar={salvar}
        aoFechar={() => setForm({ aberta: false, editando: null, inicial: null })}
      />
      <JanelaAcesso dados={acesso} servidor={servidor} aoFechar={() => setAcesso(null)} />
    </div>
  );
}
