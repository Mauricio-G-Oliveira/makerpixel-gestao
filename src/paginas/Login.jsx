import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthCore } from "../lib/legado.js";
import { useAuth } from "../lib/auth.jsx";
import { lerLocal, gravarLocal } from "../lib/tema.js";

const RECURSOS = [
  "Integração contábil e conciliação bancária",
  "Distribuição de lucros, IRRF e REINF",
  "Departamento Cadastro: empresas, certidões, alvarás e faturamento",
  "Em Dia: o que cada setor fez no mês",
  "Apuração de ICMS, auditor IBS/CBS e ISS de Tubarão",
  "Controle de horas do Departamento Pessoal"
];

function CampoSenha({ id, value, onChange, autoComplete }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={ver ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-20" />
      <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-brand px-2 py-1 rounded-md hover:bg-surface-2">
        {ver ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}

/** escuro: a versão da logo para fundo escuro, nos dois temas. */
function Logo({ className = "", escuro }) {
  if (escuro) return <img src="./icons/central-contabil-logo-escuro.svg" alt="Central Contábil" className={className} />;
  return (
    <>
      <img src="./icons/central-contabil-logo.svg" alt="Central Contábil" className={"dark:hidden " + className} />
      <img src="./icons/central-contabil-logo-escuro.svg" alt="Central Contábil" className={"hidden dark:block " + className} />
    </>
  );
}

export default function Login() {
  const { auth, carregando, erro: erroGeral, definirUsuario } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [tela, setTela] = useState("carregando");   // entrar | configurar | trocar
  const [vazio, setVazio] = useState(false);
  const [email, setEmail] = useState(() => lerLocal("gf.ultimoEmail", ""));
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(() => (local.state && local.state.expirou ? "A sessão terminou. Entre de novo." : ""));
  const senhaDigitada = useRef("");
  const arquivo = useRef(null);

  useEffect(() => {
    if (!auth) return;
    auth.precisaConfigurar().then((v) => {
      setVazio(v);
      setTela(v && !auth.modoTeste ? "configurar" : "entrar");
    });
  }, [auth]);

  const destino = (local.state && local.state.de) || "/";
  const irParaSistema = (u) => { definirUsuario(u); navegar(destino, { replace: true }); };
  const depoisDeEntrar = (u) => { if (u.trocarSenha) { setS1(""); setS2(""); setErro(""); setTela("trocar"); } else irParaSistema(u); };
  const rodar = (fn) => { setErro(""); setOcupado(true); return fn().catch((e) => setErro(e.message)).finally(() => setOcupado(false)); };

  const resolverEmail = (e) => {
    const l = String(e || "").trim().toLowerCase();
    if (l === "mauricio" || l === "maurício" || l === "admin" || l === "administrador") return AuthCore.ADMIN_EMAIL;
    return l;
  };

  const entrar = (ev) => {
    ev.preventDefault();
    const emailDigitado = email.trim();
    const emailResolvido = resolverEmail(emailDigitado);
    if (!emailDigitado || !senha) { setErro("Informe o e-mail ou usuário e a senha."); return; }
    rodar(() => {
      return auth.precisaConfigurar().then((vazio) => {
        if (vazio && emailResolvido === AuthCore.ADMIN_EMAIL) {
          const p = AuthCore.problemaSenha(senha);
          if (p) throw new Error("Primeiro acesso do administrador: " + p);
          return auth.configurarAdmin("Maurício", senha).then(() => auth.entrar(AuthCore.ADMIN_EMAIL, senha));
        }
        return auth.entrar(emailResolvido, senha);
      }).then((u) => {
        senhaDigitada.current = senha;
        gravarLocal("gf.ultimoEmail", emailDigitado);
        depoisDeEntrar(u);
      });
    });
  };

  const resetarAdmin = () => {
    if (window.confirm("Deseja redefinir os acessos de administrador neste computador e cadastrar uma nova senha?")) {
      try { localStorage.removeItem("gf.sessao"); localStorage.removeItem("auth:usuarios"); } catch (e) {}
      import("../lib/legado.js").then(({ Store }) => {
        Store.del("auth:usuarios").then(() => {
          setAviso("Acessos locais limpos. Digite 'Mauricio' e a sua nova senha.");
          setTela("entrar");
          setEmail("Mauricio");
          setSenha("");
        });
      });
    }
  };

  const limparCache = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister()))).then(() => {
        if ("caches" in window) return caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))));
      }).then(() => { window.location.reload(true); }).catch(() => { window.location.reload(true); });
    } else {
      window.location.reload(true);
    }
  };
  const configurar = (ev) => {
    ev.preventDefault();
    if (!nome.trim()) { setErro("Informe o seu nome."); return; }
    const p = AuthCore.problemaSenha(s1);
    if (p) { setErro(p); return; }
    if (s1 !== s2) { setErro("As duas senhas não são iguais."); return; }
    rodar(() => auth.configurarAdmin(nome.trim(), s1).then(() => auth.entrar(AuthCore.ADMIN_EMAIL, s1)).then(depoisDeEntrar));
  };
  const trocar = (ev) => {
    ev.preventDefault();
    const p = AuthCore.problemaSenha(s1);
    if (p) { setErro(p); return; }
    if (s1 !== s2) { setErro("As duas senhas não são iguais."); return; }
    if (!senhaDigitada.current) { auth.sair().then(() => { setTela("entrar"); setErro("Entre de novo com a senha provisória para criar a sua."); }); return; }
    rodar(() => auth.trocarSenha(senhaDigitada.current, s1).then(() => auth.usuarioAtual()).then((u) => { senhaDigitada.current = ""; irParaSistema(u); }));
  };
  const entrarTeste = () => rodar(() => auth.entrarTeste().then(irParaSistema));
  const importar = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    rodar(() => f.text().then((t) => {
      let dados;
      try { dados = JSON.parse(t); } catch (e) { throw new Error("Este arquivo não é um arquivo de acessos do sistema."); }
      return auth.importarAcessos(dados);
    }).then((r) => { setVazio(false); setTela("entrar"); setAviso("Acessos importados (" + (r.novos + r.atualizados) + "). Agora entre com o seu e-mail e senha."); }));
  };

  const modoTeste = auth && auth.modoTeste;
  const servidor = auth && auth.modo === "api";

  return (
    <main className="min-h-full grid lg:grid-cols-[minmax(0,1fr)_minmax(440px,46%)] bg-canvas">
      {/* lado da marca: bloco centralizado na coluna, nos dois sentidos */}
      <section className="menu-lateral text-ink hidden lg:flex items-center justify-center px-10 xl:px-16 py-12 bg-surface" aria-hidden="true">
        <div className="w-full max-w-[420px] space-y-8">
        <Logo escuro className="w-64 max-w-full" />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand">Central Contábil</h2>
          <p className="mt-1 text-[13.5px] text-muted">Gestão, conciliação e compliance fiscal para o seu escritório.</p>
          <ul className="mt-5 space-y-2.5">
            {RECURSOS.map((r) => (
              <li key={r} className="flex gap-3 text-[14.5px] leading-snug text-ink-2">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-brand-fill shrink-0" />{r}
              </li>
            ))}
          </ul>
        </div>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><Logo className="w-56" /></div>
          {(carregando || tela === "carregando") && !erroGeral && <p className="text-muted">Carregando…</p>}
          {erroGeral && <p className="text-debit font-medium" role="alert">{erroGeral}</p>}
          {aviso && <p className="mb-4 rounded-lg bg-ok-soft text-credit px-3 py-2 text-[13px]" role="status">{aviso}</p>}

          {tela === "entrar" && (
            <form onSubmit={entrar} noValidate className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink">Entrar no Sistema</h1>
                <p className="text-muted mt-1 text-[13.5px]">Acesso exclusivo do administrador.</p>
              </div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="entrar-email">Usuário ou E-mail</label>
                <input id="entrar-email" type="text" placeholder="Mauricio ou mauriciogoulart.deoliveira37@gmail.com" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="entrar-senha">Senha</label>
                <CampoSenha id="entrar-senha" value={senha} onChange={setSenha} autoComplete="current-password" /></div>
              {erro && <p className="text-debit text-[13px]" role="alert">{erro}</p>}
              <button type="submit" disabled={ocupado} className="btn-primario w-full h-11 text-[15px] font-semibold">Entrar como Administrador</button>
              <p className="text-[13px] text-muted"><button type="button" className="text-muted hover:text-brand underline text-xs" onClick={resetarAdmin}>Redefinir senha de administrador local</button></p>
              {!servidor && <p className="text-[13px] text-muted">Acessos em backup?{" "}
                <button type="button" className="font-semibold text-brand underline underline-offset-2" onClick={() => arquivo.current.click()}>Importar arquivo de acessos</button></p>}
            </form>
          )}

          {tela === "configurar" && (
            <form onSubmit={configurar} noValidate className="space-y-4">
              <div><h1 className="text-xl font-semibold">Primeiro acesso</h1>
                <p className="text-muted mt-1">{servidor ? "Ainda não há nenhum acesso no servidor." : "Ainda não há nenhum acesso neste computador."} Crie a senha do administrador principal.</p></div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="cfg-email">E-mail do administrador</label>
                <input id="cfg-email" value={AuthCore.ADMIN_EMAIL} readOnly className="text-muted" /></div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="cfg-nome">Seu nome</label>
                <input id="cfg-nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="cfg-senha">Senha</label>
                <CampoSenha id="cfg-senha" value={s1} onChange={setS1} autoComplete="new-password" /></div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="cfg-senha2">Repita a senha</label>
                <CampoSenha id="cfg-senha2" value={s2} onChange={setS2} autoComplete="new-password" /></div>
              {erro && <p className="text-debit text-[13px]" role="alert">{erro}</p>}
              <button type="submit" disabled={ocupado} className="btn-primario w-full h-11">Criar acesso e entrar</button>
              {modoTeste && <button type="button" className="btn-fantasma w-full" onClick={() => { setErro(""); setTela("entrar"); }}>Voltar</button>}
            </form>
          )}

          {tela === "trocar" && (
            <form onSubmit={trocar} noValidate className="space-y-4">
              <div><h1 className="text-xl font-semibold">Crie a sua senha</h1><p className="text-muted mt-1">A senha que você recebeu é provisória. Escolha uma só sua.</p></div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="trocar-senha">Nova senha</label>
                <CampoSenha id="trocar-senha" value={s1} onChange={setS1} autoComplete="new-password" />
                <span className="text-[12px] text-muted">Pelo menos 8 caracteres, com letras e números.</span></div>
              <div className="space-y-1.5"><label className="rotulo" htmlFor="trocar-senha2">Repita a nova senha</label>
                <CampoSenha id="trocar-senha2" value={s2} onChange={setS2} autoComplete="new-password" /></div>
              {erro && <p className="text-debit text-[13px]" role="alert">{erro}</p>}
              <button type="submit" disabled={ocupado} className="btn-primario w-full h-11">Salvar e entrar</button>
            </form>
          )}
          <input ref={arquivo} type="file" accept=".json,application/json" hidden onChange={importar} />
          <div className="mt-8 pt-4 border-t border-line flex items-center justify-between text-xs text-muted">
            <span className="font-medium text-ink-2">Central Contábil</span>
            <button type="button" onClick={limparCache} className="text-brand hover:underline font-medium">Forçar atualização do app</button>
          </div>
        </div>
      </section>
    </main>
  );
}
