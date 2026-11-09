import { useState, useEffect } from "react";
import Janela from "../Janela.jsx";
import { perfilPadrao } from "../../lib/regrasConciliacao.mjs";

export default function ModalPerfilConciliacao({ aberta, cnpj, empresaNome, perfilAtual, aoSalvar, aoFechar }) {
  const [perfil, setPerfil] = useState(perfilPadrao);
  const [novaPalavra, setNovaPalavra] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");

  useEffect(() => {
    if (aberta) {
      setPerfil(Object.assign({}, perfilPadrao(), perfilAtual || {}));
      setNovaPalavra("");
      setNovoMotivo("");
    }
  }, [aberta, perfilAtual]);

  const muda = (campo, valor) => {
    setPerfil((p) => Object.assign({}, p, { [campo]: valor }));
  };

  const mudaCol = (campo, valor) => {
    setPerfil((p) => Object.assign({}, p, {
      mapeamentoColunas: Object.assign({}, p.mapeamentoColunas, { [campo]: valor })
    }));
  };

  const adicionarPalavra = () => {
    const p = novaPalavra.trim().toLowerCase();
    const m = novoMotivo.trim();
    if (!p) return;
    setPerfil((prev) => ({
      ...prev,
      palavrasChave: (prev.palavrasChave || []).concat({ palavra: p, motivo: m || `Conferido automático: ${p}` })
    }));
    setNovaPalavra("");
    setNovoMotivo("");
  };

  const removerPalavra = (idx) => {
    setPerfil((prev) => ({
      ...prev,
      palavrasChave: (prev.palavrasChave || []).filter((_, i) => i !== idx)
    }));
  };

  const salvar = () => {
    aoSalvar(perfil);
    aoFechar();
  };

  return (
    <Janela
      aberta={aberta}
      titulo={`Regras de conciliação: ${empresaNome || "Empresa"}`}
      aoFechar={aoFechar}
      largura="max-w-[640px]"
      rodape={
        <>
          <button type="button" className="btn-fantasma" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn-primario" onClick={salvar}>Salvar regras</button>
        </>
      }
    >
      <div className="space-y-4 text-[13.5px]">
        <p className="text-muted text-[13px]">
          Cada cliente possui particularidades na movimentação bancária. Defina aqui as regras automáticas
          salvas para esta empresa, reaproveitadas todo mês.
        </p>

        {/* Tolerância de dias */}
        <div className="space-y-1.5 p-3 rounded-lg border border-line bg-surface-2">
          <label className="rotulo block font-semibold" htmlFor="cfg-tol">
            Tolerância de dias entre extrato e planilha
          </label>
          <div className="flex items-center gap-2">
            <input
              id="cfg-tol"
              type="number"
              min="0"
              max="30"
              value={perfil.toleranciaDias}
              onChange={(e) => muda("toleranciaDias", parseInt(e.target.value, 10) || 0)}
              className="w-24 h-9"
            />
            <span className="text-muted">dia(s) de diferença aceitos no cruzamento automático</span>
          </div>
        </div>

        {/* Conciliação em lote */}
        <div className="p-3 rounded-lg border border-line bg-surface-2 space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input
              type="checkbox"
              checked={perfil.conciliarEmLote}
              onChange={(e) => muda("conciliarEmLote", e.target.checked)}
            />
            <span>Pagamento em lote (vários lançamentos da planilha = um débito do banco)</span>
          </label>
          <p className="text-[12.5px] text-muted pl-5">
            Junta automaticamente as linhas da planilha cuja soma bate exatamente com o débito do banco dentro da tolerância de dias.
          </p>
        </div>

        {/* Palavras-chave automáticas */}
        <div className="space-y-2 p-3 rounded-lg border border-line bg-surface-2">
          <span className="rotulo block font-semibold">
            Palavras do histórico que marcam sozinho como conferido
          </span>
          <p className="text-[12px] text-muted">
            Lançamentos do extrato com estas palavras são justificados automaticamente com o motivo cadastrado.
          </p>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
            {(perfil.palavrasChave || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-surface border border-line text-[13px]">
                <div>
                  <strong className="text-brand font-medium mr-2">{item.palavra}</strong>
                  <span className="text-muted text-[12px]">→ {item.motivo}</span>
                </div>
                <button
                  type="button"
                  className="text-debit text-[12px] hover:underline"
                  onClick={() => removerPalavra(idx)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-1 items-end">
            <div>
              <label className="rotulo text-[11px] block">Palavra</label>
              <input
                type="text"
                placeholder="ex.: tarifa, rendimento, iof"
                value={novaPalavra}
                onChange={(e) => setNovaPalavra(e.target.value)}
                className="h-8 text-[12.5px]"
              />
            </div>
            <div>
              <label className="rotulo text-[11px] block">Motivo</label>
              <input
                type="text"
                placeholder="ex.: Tarifa bancária da conta"
                value={novoMotivo}
                onChange={(e) => setNovoMotivo(e.target.value)}
                className="h-8 text-[12.5px]"
              />
            </div>
            <button
              type="button"
              className="btn-contorno btn-sm h-8"
              onClick={adicionarPalavra}
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Mapeamento das colunas da planilha */}
        <div className="space-y-2 p-3 rounded-lg border border-line bg-surface-2">
          <span className="rotulo block font-semibold">
            Mapeamento das colunas da planilha do cliente (salvo para o mês seguinte)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px]">
            <div>
              <label className="rotulo text-[11px] block">Coluna Data</label>
              <input
                type="text"
                value={(perfil.mapeamentoColunas && perfil.mapeamentoColunas.data) || ""}
                onChange={(e) => mudaCol("data", e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
            <div>
              <label className="rotulo text-[11px] block">Coluna Valor</label>
              <input
                type="text"
                value={(perfil.mapeamentoColunas && perfil.mapeamentoColunas.valor) || ""}
                onChange={(e) => mudaCol("valor", e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
            <div>
              <label className="rotulo text-[11px] block">Coluna Documento</label>
              <input
                type="text"
                value={(perfil.mapeamentoColunas && perfil.mapeamentoColunas.documento) || ""}
                onChange={(e) => mudaCol("documento", e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
            <div>
              <label className="rotulo text-[11px] block">Coluna Nome</label>
              <input
                type="text"
                value={(perfil.mapeamentoColunas && perfil.mapeamentoColunas.nome) || ""}
                onChange={(e) => mudaCol("nome", e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
            <div>
              <label className="rotulo text-[11px] block">Coluna CNPJ</label>
              <input
                type="text"
                value={(perfil.mapeamentoColunas && perfil.mapeamentoColunas.cnpj) || ""}
                onChange={(e) => mudaCol("cnpj", e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
          </div>
        </div>
      </div>
    </Janela>
  );
}
