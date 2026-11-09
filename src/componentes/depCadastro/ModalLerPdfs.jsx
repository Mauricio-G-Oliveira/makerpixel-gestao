import { useState } from "react";
import Janela from "../Janela.jsx";
import { BotaoArquivo, Selo, dataBR } from "../contabil/ui.jsx";
import { textoDoPdf } from "../../lib/leitores.js";
import { lerCertidao, chaveNome } from "../../lib/depCadastro.mjs";
import { guardarArquivo } from "../../lib/arquivos.js";
import { useDepCadastro } from "../../lib/useDepCadastro.js";
import { useAvisos } from "../Avisos.jsx";

const TIPO_SELO_DESTINO = {
  "Cadastra": "novo",
  "Renova": "ok",
  "Anexa o PDF": "pendente",
  "Não grava": "erro"
};

/**
 * Componente modal para ler múltiplos PDFs de certidões e alvarás.
 * Mostra tipo, CNPJ, empresa, emissão, vencimento, número e a coluna "O que acontece" (destinoDoPdf).
 * Ao salvar, usa gravarPdf(l) e guarda o anexo no IndexedDB.
 */
export default function ModalLerPdfs({ aberta, aoFechar, aoSalvar }) {
  const [svc] = useDepCadastro();
  const { aviso } = useAvisos();
  const [linhas, setLinhas] = useState([]);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const lerArquivos = async (arquivos) => {
    if (!arquivos || !arquivos.length) return;
    setLendo(true);
    const novasLinhas = [];

    for (const arq of arquivos) {
      try {
        const texto = await textoDoPdf(arq);
        const lido = lerCertidao(texto);

        // Acha a empresa pelo documento (CNPJ/CPF) ou nome
        let emp = null;
        if (lido.documento) emp = svc.empresaPorDocumento(lido.documento);
        if (!emp && lido.nome) emp = svc.empresas().find((c) => chaveNome(c.nome) === chaveNome(lido.nome));

        const item = {
          arquivo: arq,
          nomeArquivo: arq.name,
          tamanho: arq.size,
          tipo: lido.tipo || "Certidão",
          modelo: lido.modelo || "",
          cnpj: lido.documento || (emp ? emp.documento : ""),
          empresa: emp ? emp.nome : (lido.nome || "(empresa não identificada)"),
          clienteId: emp ? emp.id : "",
          emissao: lido.emissao || "",
          vencimento: lido.vencimento || "",
          numero: lido.numero || "",
          marcado: true
        };

        item.destino = emp ? svc.destinoDoPdf(item) : "Não grava";
        novasLinhas.push(item);
      } catch (err) {
        novasLinhas.push({
          arquivo: arq,
          nomeArquivo: arq.name,
          tamanho: arq.size,
          tipo: "Desconhecido",
          empresa: "(erro ao ler PDF)",
          clienteId: "",
          emissao: "",
          vencimento: "",
          numero: "",
          destino: "Não grava",
          erro: err.message,
          marcado: false
        });
      }
    }

    setLinhas((atuais) => [...atuais, ...novasLinhas]);
    setLendo(false);
  };

  const alternarMarcado = (idx) => {
    setLinhas((atuais) => atuais.map((item, i) => i === idx ? { ...item, marcado: !item.marcado } : item));
  };

  const salvar = async () => {
    const paraSalvar = linhas.filter((l) => l.marcado && l.destino !== "Não grava" && l.clienteId);
    if (!paraSalvar.length) {
      aviso("Nenhum documento válido marcado para gravação.");
      return;
    }

    setSalvando(true);
    let gravados = 0;
    try {
      for (const item of paraSalvar) {
        const res = await svc.gravarPdf(item);
        if (res && res.doc && item.arquivo) {
          await guardarArquivo(res.doc.id, item.arquivo);
        }
        gravados++;
      }
      aviso(`${gravados} documento(s) gravado(s) com sucesso.`);
      if (aoSalvar) aoSalvar();
      aoFechar();
    } catch (err) {
      aviso("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberta) return null;

  const validos = linhas.filter((l) => l.marcado && l.destino !== "Não grava" && l.clienteId).length;

  return (
    <Janela
      aberta
      titulo="Ler PDFs de certidões e alvarás"
      aoFechar={aoFechar}
      largura="max-w-[850px]"
      rodape={
        <div className="flex items-center justify-between w-full">
          <span className="text-[13px] text-muted">
            {linhas.length > 0 ? `${validos} de ${linhas.length} pronto(s) para gravar` : ""}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-fantasma" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primario"
              onClick={salvar}
              disabled={salvando || lendo || validos === 0}
            >
              {salvando ? "Salvando…" : `Salvar (${validos})`}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border border-dashed border-line rounded-lg bg-surface-2">
          <div>
            <h4 className="font-semibold text-[14px]">Arraste ou escolha os arquivos PDF</h4>
            <p className="text-[12.5px] text-muted">
              O sistema lê tipo, CNPJ, emissão, vencimento e define a ação: Cadastra, Renova, Anexa ou Não grava.
            </p>
          </div>
          <BotaoArquivo className="btn-contorno btn-sm" aceita=".pdf,application/pdf" multiplo aoEscolher={lerArquivos}>
            {lendo ? "Lendo PDFs…" : "Escolher arquivos"}
          </BotaoArquivo>
        </div>

        {linhas.length > 0 && (
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 w-[36px]"></th>
                  <th className="px-3 py-2 font-semibold">Empresa</th>
                  <th className="px-2 py-2 font-semibold">Tipo</th>
                  <th className="px-2 py-2 font-semibold">Emissão</th>
                  <th className="px-2 py-2 font-semibold">Vencimento</th>
                  <th className="px-2 py-2 font-semibold">Número</th>
                  <th className="px-3 py-2 font-semibold">O que acontece</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {linhas.map((l, i) => (
                  <tr key={i} className="hover:bg-surface-2">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={l.marcado}
                        disabled={l.destino === "Não grava" || !l.clienteId}
                        onChange={() => alternarMarcado(i)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {l.empresa}
                      {l.cnpj && <span className="block text-[11px] text-muted">{l.cnpj}</span>}
                      {l.erro && <span className="block text-[11px] text-warn">{l.erro}</span>}
                    </td>
                    <td className="px-2 py-2">{l.tipo}{l.modelo ? ` · ${l.modelo}` : ""}</td>
                    <td className="px-2 py-2 text-muted">{l.emissao ? dataBR(l.emissao) : "—"}</td>
                    <td className="px-2 py-2 text-muted font-medium">{l.vencimento ? dataBR(l.vencimento) : "Sem data"}</td>
                    <td className="px-2 py-2 text-muted">{l.numero || "—"}</td>
                    <td className="px-3 py-2">
                      <Selo tipo={TIPO_SELO_DESTINO[l.destino] || "neutro"}>
                        {l.destino}
                      </Selo>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Janela>
  );
}
