import { useEffect, useState, useMemo } from "react";
import Janela from "../Janela.jsx";
import { BotaoArquivo } from "./ui.jsx";
import { lerPlanilha } from "../../lib/leitores.js";
import {
  criarModelo,
  destrincharPlanilha,
  aprovarSugestoes,
  adicionarRegraClassificacao,
  exportarLayout,
  layoutExportacaoPadrao,
  converterParaLancamentosSistema,
  salvarModelo,
  obterModelos,
  colunaDoIndice
} from "../../lib/modelosPlanilha.mjs";
import { criarServicoConciliacao } from "../../lib/conciliacaoServidor.mjs";
import { useAvisos } from "../Avisos.jsx";

export default function ModalImportadorModelos({ aberta, aoFechar, empresa = null }) {
  const { aviso } = useAvisos();
  const [arquivo, setArquivo] = useState("");
  const [abas, setAbas] = useState([]);
  const [abaSelecionada, setAbaSelecionada] = useState(0);
  const [status, setStatus] = useState("");

  const cnpjEmpresa = empresa?.cnpj || empresa?.id || "";
  const [modelosSalvos, setModelosSalvos] = useState([]);
  const [modeloAtual, setModeloAtual] = useState(criarModelo({ clienteId: cnpjEmpresa, nome: "Modelo do Cliente" }));
  const [resultado, setResultado] = useState(null);
  const [abaResultado, setAbaResultado] = useState("contas"); // contas | unidades | sugestoes | pendentes | exportar

  // Layout de exportação
  const [layoutExport, setLayoutExport] = useState(layoutExportacaoPadrao());

  // Nova regra
  const [novoTermo, setNovoTermo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");

  useEffect(() => {
    if (aberta) {
      const ms = obterModelos(cnpjEmpresa);
      setModelosSalvos(ms);
      if (ms.length > 0) {
        setModeloAtual(ms[0]);
      } else {
        setModeloAtual(criarModelo({ clienteId: cnpjEmpresa, nome: empresa?.nome ? `Modelo - ${empresa.nome}` : "Modelo Padrão" }));
      }
      setResultado(null);
      setArquivo("");
      setAbas([]);
      setStatus("");
    }
  }, [aberta, cnpjEmpresa, empresa]);

  if (!aberta) return null;

  const linhasDaAba = abas[abaSelecionada]?.rows || [];
  const prevLinhas = linhasDaAba.slice(0, 8);

  const ler = async (file) => {
    setArquivo(file.name);
    setResultado(null);
    setStatus("Lendo o arquivo…");
    try {
      const parsedAbas = await lerPlanilha(file);
      if (!parsedAbas || parsedAbas.length === 0) {
        setStatus("Nenhuma aba com dados encontrada na planilha.");
        return;
      }
      setAbas(parsedAbas);
      setAbaSelecionada(0);
      setStatus("");
    } catch (e) {
      setStatus("Erro ao ler planilha: " + (e.message || "formato desconhecido"));
    }
  };

  const handleDestrinchar = () => {
    if (!linhasDaAba.length) {
      setStatus("Abra ou escolha uma planilha primeiro.");
      return;
    }
    const res = destrincharPlanilha(linhasDaAba, modeloAtual);
    setResultado(res);
    // Salva o modelo automaticamente
    salvarModelo(modeloAtual);
    const ms = obterModelos(cnpjEmpresa);
    setModelosSalvos(ms);
  };

  const handleAprovarSugestoes = (ids = null) => {
    if (!resultado) return;
    const novosLancamentos = aprovarSugestoes(resultado.lancamentos, ids);
    // Re-agrupa mantendo aprovação
    const res = destrincharPlanilha([], modeloAtual);
    res.lancamentos = novosLancamentos;
    res.porConta = {};
    res.porUnidade = {};
    res.semClassificacao = [];
    res.comSugestao = [];
    novosLancamentos.forEach((l) => {
      if (!res.porConta[l.conta]) res.porConta[l.conta] = [];
      res.porConta[l.conta].push(l);
      if (!res.porUnidade[l.unidade]) res.porUnidade[l.unidade] = [];
      res.porUnidade[l.unidade].push(l);
      if (l.semClassificacao) res.semClassificacao.push(l);
      else if (l.categoriaSugerida && !l.categoria) res.comSugestao.push(l);
    });
    res.resumo.qtdSemClassificacao = res.semClassificacao.length;
    res.resumo.qtdComSugestao = res.comSugestao.length;
    setResultado({ ...resultado, ...res });
    aviso("Sugestões aprovadas com sucesso!");
  };

  const handleCriarRegra = () => {
    if (!novoTermo.trim() || !novaCategoria.trim()) return;
    const atualizado = adicionarRegraClassificacao(modeloAtual, novoTermo, novaCategoria);
    setModeloAtual(atualizado);
    salvarModelo(atualizado);
    setNovoTermo("");
    setNovaCategoria("");
    // Re-destrincha com a nova regra
    const res = destrincharPlanilha(linhasDaAba, atualizado);
    setResultado(res);
    aviso(`Regra criada: histórico contendo "${novoTermo}" sugerirá "${novaCategoria}".`);
  };

  const handleExportar = () => {
    if (!resultado || !resultado.lancamentos.length) return;
    const csv = exportarLayout(resultado.lancamentos, layoutExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimento_destrinchado_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    aviso("Download do arquivo de exportação iniciado.");
  };

  const handleEnviarConciliacao = async (contaNome) => {
    if (!resultado) return;
    const lancsSistema = converterParaLancamentosSistema(resultado, contaNome);
    const comp = new Date().toISOString().slice(0, 7);
    const servico = criarServicoConciliacao();
    try {
      await servico.salvar({
        cnpj: cnpjEmpresa || "11222333000181",
        banco: contaNome,
        conta: contaNome,
        competencia: comp,
        planilhaJson: JSON.stringify(lancsSistema),
        resumoJson: JSON.stringify({ total: lancsSistema.length, conta: contaNome })
      });
      aviso(`${lancsSistema.length} lançamentos da conta "${contaNome}" salvos para a conciliação bancária.`);
    } catch (e) {
      aviso("Erro ao salvar conciliação: " + e.message);
    }
  };

  return (
    <Janela
      aberta
      titulo="Importador de Planilha com Modelos por Cliente"
      aoFechar={aoFechar}
      largura="max-w-[960px]"
      rodape={
        <>
          <button type="button" className="btn-fantasma" onClick={aoFechar}>
            Fechar
          </button>
          <button
            type="button"
            className="btn-primario"
            disabled={!linhasDaAba.length}
            onClick={handleDestrinchar}
          >
            Destrinchar Planilha
          </button>
        </>
      }
    >
      <div className="space-y-4 text-[13.5px]">
        <p className="text-ink-2">
          Importe a planilha de movimento completa do cliente (várias contas, unidades e naturezas).
          Configure uma vez o modelo e reaproveite em todos os meses.
        </p>

        {/* Escolha do arquivo e modelo */}
        <div className="grid sm:grid-cols-2 gap-3 p-3 bg-surface-2 rounded-xl border border-line">
          <div>
            <span className="block text-[12px] font-semibold text-muted uppercase mb-1">Planilha do cliente</span>
            <div className="flex items-center gap-2">
              <BotaoArquivo className="btn-contorno btn-sm" aceita=".xlsx,.xlsm,.xls,.csv,.txt" aoEscolher={ler}>
                Escolher planilha
              </BotaoArquivo>
              <span className="text-[12px] text-muted truncate max-w-[200px]">
                {arquivo || "Nenhum arquivo"}
              </span>
            </div>
          </div>

          <div>
            <span className="block text-[12px] font-semibold text-muted uppercase mb-1">Modelo salvo</span>
            <select
              className="w-full text-[13px] rounded-lg border-line bg-surface py-1.5 px-2"
              value={modeloAtual.id}
              onChange={(e) => {
                const sel = modelosSalvos.find((m) => m.id === e.target.value);
                if (sel) setModeloAtual(sel);
              }}
            >
              {modelosSalvos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
              <option value="novo">+ Criar novo modelo</option>
            </select>
          </div>
        </div>

        {status && <p className="text-[13px] text-ink-2">{status}</p>}

        {/* Abas encontradas */}
        {abas.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[12px] text-muted">Aba:</span>
            {abas.map((a, i) => (
              <button
                key={i}
                type="button"
                className={`px-3 py-1 text-[12.5px] rounded-lg border ${
                  abaSelecionada === i ? "border-brand bg-brand-fill text-brand font-medium" : "border-line bg-surface"
                }`}
                onClick={() => setAbaSelecionada(i)}
              >
                {a.nome}
              </button>
            ))}
          </div>
        )}

        {/* Prévia das Primeiras Linhas */}
        {prevLinhas.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px] text-muted">
              <span>Prévia das primeiras linhas da planilha</span>
              <span>Linha inicial: {modeloAtual.linhaInicial}</span>
            </div>
            <div className="overflow-x-auto max-h-48 border border-line rounded-lg text-[12px]">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="p-1.5 text-center text-muted border-r border-line w-8">#</th>
                    {prevLinhas[0]?.map((_, ci) => (
                      <th key={ci} className="p-1.5 text-left border-r border-line font-mono font-semibold">
                        Col {colunaDoIndice(ci)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {prevLinhas.map((row, ri) => (
                    <tr key={ri} className={ri + 1 < modeloAtual.linhaInicial ? "opacity-40 bg-surface-2" : ""}>
                      <td className="p-1.5 text-center font-mono text-muted border-r border-line">{ri + 1}</td>
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-1.5 border-r border-line max-w-[150px] truncate">
                          {String(cell ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Configuração de Mapeamento de Colunas */}
        <details className="rounded-xl border border-line p-3" open={!resultado}>
          <summary className="font-semibold text-[13.5px] cursor-pointer">
            Mapeamento de Colunas do Modelo ({modeloAtual.nome})
          </summary>
          <div className="grid sm:grid-cols-4 gap-3 pt-3">
            <div>
              <label className="rotulo">Nome do Modelo</label>
              <input
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md"
                value={modeloAtual.nome}
                onChange={(e) => setModeloAtual({ ...modeloAtual, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="rotulo">Começa na Linha</label>
              <input
                type="number"
                min="1"
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md"
                value={modeloAtual.linhaInicial}
                onChange={(e) => setModeloAtual({ ...modeloAtual, linhaInicial: e.target.value })}
              />
            </div>
            <div>
              <label className="rotulo">Coluna Data</label>
              <input
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md uppercase"
                value={modeloAtual.colunas.data}
                onChange={(e) =>
                  setModeloAtual({
                    ...modeloAtual,
                    colunas: { ...modeloAtual.colunas, data: e.target.value.toUpperCase() }
                  })
                }
              />
            </div>
            <div>
              <label className="rotulo">Coluna Valor (única)</label>
              <input
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md uppercase"
                value={modeloAtual.colunas.valor}
                onChange={(e) =>
                  setModeloAtual({
                    ...modeloAtual,
                    colunas: { ...modeloAtual.colunas, valor: e.target.value.toUpperCase() }
                  })
                }
              />
            </div>
            <div>
              <label className="rotulo">Coluna Histórico</label>
              <input
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md uppercase"
                value={modeloAtual.colunas.historico}
                onChange={(e) =>
                  setModeloAtual({
                    ...modeloAtual,
                    colunas: { ...modeloAtual.colunas, historico: e.target.value.toUpperCase() }
                  })
                }
              />
            </div>
            <div>
              <label className="rotulo">Coluna Conta Bancária</label>
              <input
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md uppercase"
                value={modeloAtual.colunas.conta}
                onChange={(e) =>
                  setModeloAtual({
                    ...modeloAtual,
                    colunas: { ...modeloAtual.colunas, conta: e.target.value.toUpperCase() }
                  })
                }
              />
            </div>
            <div>
              <label className="rotulo">Coluna Unidade/Centro Custo</label>
              <input
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md uppercase"
                value={modeloAtual.colunas.unidade}
                onChange={(e) =>
                  setModeloAtual({
                    ...modeloAtual,
                    colunas: { ...modeloAtual.colunas, unidade: e.target.value.toUpperCase() }
                  })
                }
              />
            </div>
            <div>
              <label className="rotulo">Coluna Categoria/Natureza</label>
              <input
                className="w-full text-[13px] py-1 px-2 border border-line rounded-md uppercase"
                value={modeloAtual.colunas.categoria}
                onChange={(e) =>
                  setModeloAtual({
                    ...modeloAtual,
                    colunas: { ...modeloAtual.colunas, categoria: e.target.value.toUpperCase() }
                  })
                }
              />
            </div>
          </div>
        </details>

        {/* Resultados após Destrinchar */}
        {resultado && (
          <div className="space-y-4 pt-2">
            {/* Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line">
                <span className="block text-[11px] uppercase text-muted">Lançamentos</span>
                <strong className="text-[16px] text-ink">{resultado.resumo.qtdTotal}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line">
                <span className="block text-[11px] uppercase text-muted">Contas Bancárias</span>
                <strong className="text-[16px] text-ink">{resultado.resumo.qtdContas}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line">
                <span className="block text-[11px] uppercase text-muted">Com Sugestão</span>
                <strong className="text-[16px] text-brand">{resultado.resumo.qtdComSugestao}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line">
                <span className="block text-[11px] uppercase text-muted">Sem Classificação</span>
                <strong className="text-[16px] text-debit">{resultado.resumo.qtdSemClassificacao}</strong>
              </div>
            </div>

            {/* Abas de visualização */}
            <div className="flex border-b border-line gap-4 text-[13px]">
              {[
                ["contas", `Por Conta (${resultado.resumo.qtdContas})`],
                ["unidades", `Por Unidade (${resultado.resumo.qtdUnidades})`],
                ["sugestoes", `Sugestões (${resultado.resumo.qtdComSugestao})`],
                ["pendentes", `Sem Classificação (${resultado.resumo.qtdSemClassificacao})`],
                ["exportar", "Exportar Layout"]
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`pb-2 font-medium ${
                    abaResultado === k ? "border-b-2 border-brand text-brand" : "text-muted hover:text-ink"
                  }`}
                  onClick={() => setAbaResultado(k)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Aba Por Conta */}
            {abaResultado === "contas" && (
              <div className="space-y-3">
                {Object.entries(resultado.porConta).map(([contaNome, itens]) => (
                  <div key={contaNome} className="rounded-xl border border-line p-3 bg-surface">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <strong className="text-[14px] text-ink">{contaNome}</strong>
                        <span className="text-[12px] text-muted ml-2">({itens.length} lançamentos)</span>
                      </div>
                      <button
                        type="button"
                        className="btn-contorno btn-sm"
                        onClick={() => handleEnviarConciliacao(contaNome)}
                      >
                        Enviar para Conciliação
                      </button>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-line text-[12px]">
                      {itens.slice(0, 10).map((item) => (
                        <div key={item.id} className="py-1 flex justify-between gap-2">
                          <span className="w-20 text-muted">{item.data}</span>
                          <span className="flex-1 truncate">{item.historico}</span>
                          <span className="text-muted w-28 truncate">{item.categoria || item.categoriaSugerida || "—"}</span>
                          <span className={`w-24 text-right font-mono ${item.valor < 0 ? "text-debit" : "text-credit"}`}>
                            R$ {Math.abs(item.valor).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {itens.length > 10 && (
                        <p className="text-center text-[11px] text-muted py-1">
                          + {itens.length - 10} outros lançamentos nesta conta
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aba Por Unidade */}
            {abaResultado === "unidades" && (
              <div className="space-y-3">
                {Object.entries(resultado.porUnidade).map(([unidadeNome, itens]) => (
                  <div key={unidadeNome} className="rounded-xl border border-line p-3 bg-surface">
                    <strong className="text-[14px] text-ink">{unidadeNome}</strong>
                    <span className="text-[12px] text-muted ml-2">({itens.length} lançamentos)</span>
                    <div className="max-h-36 overflow-y-auto divide-y divide-line text-[12px] mt-2">
                      {itens.slice(0, 8).map((item) => (
                        <div key={item.id} className="py-1 flex justify-between gap-2">
                          <span className="w-20 text-muted">{item.data}</span>
                          <span className="flex-1 truncate">{item.historico}</span>
                          <span className="text-muted">{item.conta}</span>
                          <span className={`w-24 text-right font-mono ${item.valor < 0 ? "text-debit" : "text-credit"}`}>
                            R$ {Math.abs(item.valor).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aba Sugestões */}
            {abaResultado === "sugestoes" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[12.5px] text-muted">
                    Lançamentos classificados automaticamente por regras de histórico.
                  </p>
                  {resultado.comSugestao.length > 0 && (
                    <button
                      type="button"
                      className="btn-primario btn-sm"
                      onClick={() => handleAprovarSugestoes(null)}
                    >
                      Aprovar Todas ({resultado.comSugestao.length})
                    </button>
                  )}
                </div>
                {resultado.comSugestao.length === 0 ? (
                  <p className="text-center py-6 text-muted">Nenhuma sugestão pendente.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-line border border-line rounded-xl">
                    {resultado.comSugestao.map((l) => (
                      <div key={l.id} className="p-2.5 flex items-center justify-between text-[12.5px] bg-surface">
                        <div className="flex-1 min-w-0 pr-3">
                          <span className="font-medium text-ink truncate block">{l.historico}</span>
                          <span className="text-muted text-[11.5px]">
                            Sugestão: <strong className="text-brand">{l.categoriaSugerida}</strong> (regra contém &quot;{l.regraAplicada}&quot;)
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-contorno btn-sm"
                          onClick={() => handleAprovarSugestoes([l.id])}
                        >
                          Aprovar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aba Sem Classificação */}
            {abaResultado === "pendentes" && (
              <div className="space-y-3">
                <div className="p-3 bg-surface-2 rounded-xl border border-line space-y-2">
                  <strong className="text-[13px] block">Criar Regra Rápida de Classificação</strong>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      placeholder="Termo no histórico (ex: TARIFA)"
                      className="text-[12.5px] p-1.5 border border-line rounded-lg"
                      value={novoTermo}
                      onChange={(e) => setNovoTermo(e.target.value)}
                    />
                    <input
                      placeholder="Categoria / Natureza"
                      className="text-[12.5px] p-1.5 border border-line rounded-lg"
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                    />
                    <button type="button" className="btn-primario btn-sm" onClick={handleCriarRegra}>
                      Adicionar Regra
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-line border border-line rounded-xl">
                  {resultado.semClassificacao.length === 0 ? (
                    <p className="text-center py-6 text-muted">Todos os lançamentos estão classificados!</p>
                  ) : (
                    resultado.semClassificacao.map((l) => (
                      <div key={l.id} className="p-2 flex justify-between items-center text-[12px] bg-surface">
                        <span className="w-20 text-muted">{l.data}</span>
                        <span className="flex-1 truncate px-2">{l.historico}</span>
                        <span className="font-mono text-right w-24">R$ {Math.abs(l.valor).toFixed(2)}</span>
                        <button
                          type="button"
                          className="btn-fantasma btn-sm text-[11px] ml-2"
                          onClick={() => {
                            setNovoTermo(l.historico.split(" ")[0]);
                          }}
                        >
                          Usar termo
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Aba Exportar Layout */}
            {abaResultado === "exportar" && (
              <div className="space-y-3 p-3 bg-surface rounded-xl border border-line">
                <strong className="text-[13.5px] block">Configuração do Layout de Exportação</strong>
                <div className="grid sm:grid-cols-3 gap-3 text-[12.5px]">
                  <div>
                    <label className="rotulo">Separador</label>
                    <select
                      className="w-full border border-line rounded-lg p-1.5"
                      value={layoutExport.separador}
                      onChange={(e) => setLayoutExport({ ...layoutExport, separador: e.target.value })}
                    >
                      <option value=";">Ponto-e-vírgula (;)</option>
                      <option value=",">Vírgula (,)</option>
                      <option value="&#9;">Tabulação (TXT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="rotulo">Formato de Data</label>
                    <select
                      className="w-full border border-line rounded-lg p-1.5"
                      value={layoutExport.formatoData}
                      onChange={(e) => setLayoutExport({ ...layoutExport, formatoData: e.target.value })}
                    >
                      <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                      <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                      <option value="YYYYMMDD">AAAAMMDD</option>
                    </select>
                  </div>
                  <div>
                    <label className="rotulo">Formato do Valor</label>
                    <select
                      className="w-full border border-line rounded-lg p-1.5"
                      value={layoutExport.formatoValor}
                      onChange={(e) => setLayoutExport({ ...layoutExport, formatoValor: e.target.value })}
                    >
                      <option value="pt-BR">1.234,56 (brasileiro)</option>
                      <option value="en-US">1234.56 (ponto decimal)</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2">
                  <button type="button" className="btn-primario" onClick={handleExportar}>
                    Baixar Arquivo CSV Exportado
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Janela>
  );
}
