import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Icone from "../componentes/Icone.jsx";
import Janela from "../componentes/Janela.jsx";
import { Campo, Selo } from "../componentes/contabil/ui.jsx";
import { useAvisos } from "../componentes/Avisos.jsx";
import {
  listarEscritorios,
  escritorioAtivo,
  definirEscritorioAtivo,
  criarAcessoTeste,
  prorrogarTeste,
  converterEmCliente,
  suspenderEscritorio,
  reativarEscritorio,
  statusTeste,
  gerarMensagemConvite,
  linkContratarWhatsApp
} from "../lib/multiEscritorio.mjs";

export default function AdminMakerPixel() {
  const { aviso } = useAvisos();
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  const escritorios = useMemo(() => listarEscritorios(), [versao]);
  const ativo = useMemo(() => escritorioAtivo(), [versao]);
  const [filtro, setFiltro] = useState("TODOS");

  // Modais
  const [modalNovoTeste, setModalNovoTeste] = useState(false);
  const [modalConvite, setModalConvite] = useState(null); // { texto, whatsapp, email }

  // Form novo teste
  const [formTeste, setFormTeste] = useState({
    nome: "",
    cnpj: "",
    contato: "",
    email: "",
    telefone: "",
    dias: 3,
    carregarDemo: true
  });

  const filtrados = useMemo(() => {
    if (filtro === "TODOS") return escritorios;
    return escritorios.filter((e) => e.situacao === filtro);
  }, [escritorios, filtro]);

  const kpis = useMemo(() => {
    const total = escritorios.length;
    const ativos = escritorios.filter((e) => e.situacao === "ATIVO").length;
    const testes = escritorios.filter((e) => e.situacao === "TESTE").length;
    const suspensos = escritorios.filter((e) => e.situacao === "SUSPENSO").length;
    return { total, ativos, testes, suspensos };
  }, [escritorios]);

  const submeterNovoTeste = (e) => {
    e.preventDefault();
    if (!formTeste.nome.trim() || !formTeste.email.trim()) {
      aviso("Preencha o nome do escritório e o e-mail do responsável.", "erro");
      return;
    }
    try {
      const { escritorio, senhaProvisoria } = criarAcessoTeste(formTeste);
      const texto = gerarMensagemConvite(escritorio, senhaProvisoria);
      setModalNovoTeste(false);
      setModalConvite({
        escritorio,
        senha: senhaProvisoria,
        texto,
        linkWhatsApp: `https://wa.me/55${String(escritorio.telefone || "").replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`
      });
      recarregar();
      aviso("Acesso de teste criado com sucesso!");
    } catch (err) {
      aviso(err.message, "erro");
    }
  };

  const copiarTexto = (txt) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => aviso("Convite copiado para a área de transferência!"));
    }
  };

  return (
    <div className="space-y-6 max-w-[1180px]">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand px-2.5 py-0.5 rounded-full bg-brand-soft border border-brand/20">
              Gestão SaaS
            </span>
            <span className="text-xs text-muted">Tubarão/SC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-1">
            Painel MakerPixel · Gestão Multi-Escritório
          </h1>
          <p className="text-[13.5px] text-muted">
            Administração central de clientes, escritórios contratantes, períodos de teste gratuito e governança.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormTeste({ nome: "", cnpj: "", contato: "", email: "", telefone: "", dias: 3, carregarDemo: true });
            setModalNovoTeste(true);
          }}
          className="btn-primario flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <Icone nome="mais" className="w-4 h-4" />
          Criar Acesso de Teste (3 dias)
        </button>
      </div>

      {/* Cartões KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="cartao p-4 bg-surface border-line">
          <span className="text-xs font-semibold text-muted uppercase">Total Escritórios</span>
          <div className="text-2xl font-bold mt-1 text-ink">{kpis.total}</div>
          <span className="text-[11.5px] text-muted">Cadastrados no sistema</span>
        </div>
        <div className="cartao p-4 bg-surface border-line">
          <span className="text-xs font-semibold text-credit uppercase">Clientes Ativos</span>
          <div className="text-2xl font-bold mt-1 text-credit">{kpis.ativos}</div>
          <span className="text-[11.5px] text-muted">Contratos em operação</span>
        </div>
        <div className="cartao p-4 bg-surface border-line">
          <span className="text-xs font-semibold text-brand uppercase">Testes Gratuitos</span>
          <div className="text-2xl font-bold mt-1 text-brand">{kpis.testes}</div>
          <span className="text-[11.5px] text-muted">Acessos em trial ativo</span>
        </div>
        <div className="cartao p-4 bg-surface border-line">
          <span className="text-xs font-semibold text-debit uppercase">Suspensos</span>
          <div className="text-2xl font-bold mt-1 text-debit">{kpis.suspensos}</div>
          <span className="text-[11.5px] text-muted">Acesso restrito</span>
        </div>
      </div>

      {/* Escritório Ativo Atual */}
      <div className="cartao p-4 bg-brand-soft/20 border-brand/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold text-base shrink-0">
            🏢
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold">
              Escritório Selecionado no Navegador
            </div>
            <strong className="text-base text-ink">{ativo.razaoSocial}</strong>
            <span className="text-xs text-muted ml-2">CNPJ: {ativo.cnpj} · {ativo.cidade}/{ativo.uf}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={"text-xs font-bold px-2.5 py-1 rounded-full border " + (
            ativo.situacao === "ATIVO" ? "border-credit/30 bg-ok-soft text-credit" :
            ativo.situacao === "TESTE" ? "border-brand/30 bg-brand-soft text-brand" :
            "border-debit/30 bg-debit-soft text-debit"
          )}>
            Situação: {ativo.situacao}
          </span>
          <Link to="/" className="btn-contorno btn-sm">Abrir Módulos →</Link>
        </div>
      </div>

      {/* Lista de Escritórios */}
      <div className="cartao overflow-hidden border-line bg-surface">
        <div className="px-5 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-surface-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Escritórios Cadastrados</span>
            <span className="text-xs text-muted">({filtrados.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            {["TODOS", "ATIVO", "TESTE", "SUSPENSO"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={"text-xs font-semibold px-2.5 py-1 rounded-md transition-colors " + (
                  filtro === f ? "bg-brand text-black" : "text-muted hover:text-ink hover:bg-surface"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-line">
          {filtrados.map((esc) => {
            const st = statusTeste(esc);
            const ehAtivo = esc.id === ativo.id;

            return (
              <div key={esc.id} className={"p-4 sm:px-5 hover:bg-surface-2/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 " + (ehAtivo ? "bg-surface-2/40" : "")}>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-[15px] font-semibold text-ink">{esc.razaoSocial}</strong>
                    {ehAtivo && <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">EM USO</span>}
                    <span className={"text-[11px] font-semibold px-2 py-0.5 rounded-full border " + (
                      esc.situacao === "ATIVO" ? "border-credit/30 bg-ok-soft text-credit" :
                      esc.situacao === "TESTE" ? "border-brand/30 bg-brand-soft text-brand" :
                      "border-debit/30 bg-debit-soft text-debit"
                    )}>
                      {esc.situacao}
                    </span>
                  </div>

                  <p className="text-[12.5px] text-muted flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>CNPJ: {esc.cnpj}</span>
                    <span>Contato: {esc.contato} ({esc.email})</span>
                    <span>{esc.cidade}/{esc.uf}</span>
                    <span>Limites: {esc.limiteUsuarios} usuários / {esc.limiteEmpresas} empresas</span>
                  </p>

                  {st.emTeste && (
                    <div className="flex items-center gap-2 pt-1 text-[12px]">
                      <span className={"font-semibold " + (st.expirado ? "text-debit" : st.terminaHoje ? "text-warn" : "text-brand")}>
                        {st.expirado ? "⚠️ Teste expirado" : st.terminaHoje ? "⏰ Teste termina hoje!" : `⏳ Faltam ${st.diasRestantes} dias de teste`}
                      </span>
                      <span className="text-muted">(expira em: {st.expiraEmData})</span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto shrink-0">
                  {!ehAtivo && (
                    <button
                      type="button"
                      onClick={() => { definirEscritorioAtivo(esc.id); recarregar(); aviso(`Você agora está operando como: ${esc.razaoSocial}`); }}
                      className="btn-contorno btn-sm text-brand border-brand-fill"
                    >
                      Alternar para este
                    </button>
                  )}

                  {st.emTeste && (
                    <>
                      <button
                        type="button"
                        onClick={() => { prorrogarTeste(esc.id, 3); recarregar(); aviso("Teste prorrogado por mais 3 dias!"); }}
                        className="btn-fantasma btn-sm text-xs"
                        title="Prorrogar período de teste por mais 3 dias"
                      >
                        +3 Dias
                      </button>
                      <button
                        type="button"
                        onClick={() => { converterEmCliente(esc.id); recarregar(); aviso("Escritório convertido em cliente ativo com sucesso!"); }}
                        className="btn-fantasma btn-sm text-xs text-credit"
                        title="Converter em cliente definitivo"
                      >
                        Converter em Cliente
                      </button>
                    </>
                  )}

                  {esc.situacao === "ATIVO" && (
                    <button
                      type="button"
                      onClick={() => { suspenderEscritorio(esc.id); recarregar(); aviso("Escritório suspenso."); }}
                      className="btn-fantasma btn-sm text-xs text-debit"
                    >
                      Suspender
                    </button>
                  )}

                  {esc.situacao === "SUSPENSO" && (
                    <button
                      type="button"
                      onClick={() => { reativarEscritorio(esc.id); recarregar(); aviso("Escritório reativado!"); }}
                      className="btn-fantasma btn-sm text-xs text-credit"
                    >
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Criar Acesso de Teste */}
      {modalNovoTeste && (
        <Janela
          aberta
          titulo="Criar Acesso de Teste para Escritório"
          aoFechar={() => setModalNovoTeste(false)}
          largura="max-w-[580px]"
          rodape={
            <>
              <button type="button" className="btn-fantasma" onClick={() => setModalNovoTeste(false)}>Cancelar</button>
              <button type="submit" form="form-novo-teste" className="btn-primario">Criar e Gerar Convite</button>
            </>
          }
        >
          <form id="form-novo-teste" onSubmit={submeterNovoTeste} className="space-y-3">
            <Campo rotulo="Razão Social / Nome do Escritório" id="t-nome">
              <input
                id="t-nome"
                required
                value={formTeste.nome}
                onChange={(e) => setFormTeste({ ...formTeste, nome: e.target.value })}
                placeholder="Ex: Delta Contabilidade Eireli"
              />
            </Campo>

            <div className="grid sm:grid-cols-2 gap-3">
              <Campo rotulo="CNPJ do Escritório" id="t-cnpj">
                <input
                  id="t-cnpj"
                  value={formTeste.cnpj}
                  onChange={(e) => setFormTeste({ ...formTeste, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
              </Campo>
              <Campo rotulo="Duração do Teste (dias)" id="t-dias">
                <input
                  id="t-dias"
                  type="number"
                  min="1"
                  max="30"
                  value={formTeste.dias}
                  onChange={(e) => setFormTeste({ ...formTeste, dias: parseInt(e.target.value, 10) || 3 })}
                />
              </Campo>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Campo rotulo="Nome do Responsável" id="t-contato">
                <input
                  id="t-contato"
                  required
                  value={formTeste.contato}
                  onChange={(e) => setFormTeste({ ...formTeste, contato: e.target.value })}
                  placeholder="Ex: Fernanda Machado"
                />
              </Campo>
              <Campo rotulo="E-mail do Responsável" id="t-email">
                <input
                  id="t-email"
                  type="email"
                  required
                  value={formTeste.email}
                  onChange={(e) => setFormTeste({ ...formTeste, email: e.target.value })}
                  placeholder="fernanda@deltacontabil.com.br"
                />
              </Campo>
            </div>

            <Campo rotulo="WhatsApp do Escritório" id="t-tel">
              <input
                id="t-tel"
                value={formTeste.telefone}
                onChange={(e) => setFormTeste({ ...formTeste, telefone: e.target.value })}
                placeholder="(48) 99123-4567"
              />
            </Campo>

            <label className="flex items-center gap-2 pt-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={formTeste.carregarDemo}
                onChange={(e) => setFormTeste({ ...formTeste, carregarDemo: e.target.checked })}
                className="rounded text-brand"
              />
              <span>Carregar dados de demonstração (empresas, alvarás, faturamentos fictícios para apresentação)</span>
            </label>
          </form>
        </Janela>
      )}

      {/* Modal Convite Gerado */}
      {modalConvite && (
        <Janela
          aberta
          titulo="Convite de Acesso Pronto"
          aoFechar={() => setModalConvite(null)}
          largura="max-w-[560px]"
          rodape={
            <>
              <button type="button" className="btn-primario" onClick={() => setModalConvite(null)}>Concluir</button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-[13.5px] text-ink-2">
              O acesso de teste foi criado. Envie a mensagem pronta abaixo com as credenciais iniciais:
            </p>

            <div className="bg-surface-2 p-3.5 rounded-lg border border-line text-xs font-mono whitespace-pre-wrap leading-relaxed select-all">
              {modalConvite.texto}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copiarTexto(modalConvite.texto)}
                className="btn-primario btn-sm flex items-center gap-1.5"
              >
                <Icone nome="copiar" className="w-4 h-4" />
                Copiar Mensagem
              </button>
              <a
                href={modalConvite.linkWhatsApp}
                target="_blank"
                rel="noreferrer"
                className="btn-contorno btn-sm text-credit border-credit/40 flex items-center gap-1.5"
              >
                Enviar via WhatsApp
              </a>
              <a
                href={`mailto:${modalConvite.escritorio.email}?subject=Acesso ao MakerPixel Contabil&body=${encodeURIComponent(modalConvite.texto)}`}
                className="btn-contorno btn-sm flex items-center gap-1.5"
              >
                Enviar por E-mail
              </a>
            </div>
          </div>
        </Janela>
      )}
    </div>
  );
}
