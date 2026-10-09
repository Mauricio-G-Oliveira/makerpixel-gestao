import React, { useState } from 'react';
import { X, Receipt, UploadCloud, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BankAccount } from '../../types/finance';
import { Extratos, PdfExtrato, Core } from '../../engine';

interface ImportarExtratosModalProps {
  isOpen: boolean;
  onClose: () => void;
  contas: BankAccount[];
  onConfirm: (arquivosLidos: any[]) => void;
}

export const ImportarExtratosModal: React.FC<ImportarExtratosModalProps> = ({
  isOpen,
  onClose,
  contas,
  onConfirm,
}) => {
  const [arquivosLidos, setArquivosLidos] = useState<any[]>([]);
  const [processando, setProcessando] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  async function lerItensDoPdf(buffer: ArrayBuffer) {
    const pdfjs = (window as any).pdfjsLib;
    if (!pdfjs) throw new Error('O leitor de PDF não está disponível no navegador.');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const paginas = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const itens = textContent.items.map((i: any) => ({
        s: i.str,
        x: i.transform[4],
        y: i.transform[5],
        w: i.width,
      }));
      paginas.push(itens);
    }
    return paginas;
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessando(true);
    setStatusMsg(`Processando ${files.length} arquivo(s)...`);

    const resultados: any[] = [];

    for (let f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      try {
        if (ext === 'pdf') {
          const buf = await f.arrayBuffer();
          const paginas = await lerItensDoPdf(buf);
          const r = PdfExtrato.lerExtratoPdf(paginas);
          if (r.semTexto) {
            resultados.push({
              arquivo: f.name,
              erro: 'PDF é imagem digitalizada (sem texto lido). Utilize o arquivo OFX do banco.',
            });
          } else {
            const contaId = Extratos.qualConta(r.numeroConta, contas)?.id;
            resultados.push({
              arquivo: f.name,
              formato: `PDF ${r.banco?.nome || 'Bancário'}`,
              banco: r.banco?.nome,
              numeroConta: r.numeroConta,
              itens: r.itens,
              conferencia: r.conferencia,
              contaId,
            });
          }
        } else if (ext === 'ofx') {
          const txt = await f.text();
          const r = Extratos.lerExtratoOfx(txt);
          const contaId = Extratos.qualConta(r.numeroConta, contas)?.id;
          resultados.push({
            arquivo: f.name,
            formato: 'OFX',
            banco: r.banco,
            numeroConta: r.numeroConta,
            itens: r.itens,
            contaId,
          });
        } else if (ext === 'txt') {
          let txt = await f.text();
          if (txt.indexOf('SICOOB') === -1) {
            // tenta windows-1252 se sicoob
            const buf = await f.arrayBuffer();
            const dec = new TextDecoder('windows-1252');
            txt = dec.decode(buf);
          }
          const r = Extratos.lerExtratoSicoob(txt);
          const contaId = Extratos.qualConta(r.numeroConta, contas)?.id;
          resultados.push({
            arquivo: f.name,
            formato: 'TXT Sicoob',
            banco: 'Sicoob',
            numeroConta: r.numeroConta,
            itens: r.itens,
            contaId,
          });
        } else if (ext === 'csv') {
          const txt = await f.text();
          const r = Extratos.lerExtratoCsv(txt);
          resultados.push({
            arquivo: f.name,
            formato: 'CSV',
            banco: 'Bancário',
            numeroConta: '',
            itens: r.itens,
          });
        } else if (['xlsx', 'xlsm', 'xls'].includes(ext)) {
          const buf = await f.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          const r = Core.lerExtratoPlanilha(wb);
          resultados.push({
            arquivo: f.name,
            formato: 'Planilha Excel',
            banco: 'Bancário',
            itens: r.itens,
          });
        } else {
          resultados.push({
            arquivo: f.name,
            erro: 'Formato não suportado. Envie PDF, OFX, TXT Sicoob, CSV ou Excel.',
          });
        }
      } catch (err: any) {
        resultados.push({
          arquivo: f.name,
          erro: err.message || 'Erro ao processar',
        });
      }
    }

    setArquivosLidos(resultados);
    setProcessando(false);
    setStatusMsg('');
  };

  const handleSalvar = () => {
    const validos = arquivosLidos.filter((a) => !a.erro && a.itens?.length);
    if (validos.length === 0) return;
    onConfirm(validos);
    setArquivosLidos([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Importar Extratos Bancários</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">PDF, OFX, TXT Sicoob, CSV e Excel com sugestão de classificação inteligente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-all">
            <input
              type="file"
              id="file-extratos-input"
              accept=".pdf,.ofx,.txt,.csv,.xlsx,.xls"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <label htmlFor="file-extratos-input" className="cursor-pointer flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Selecione um ou vários extratos bancários
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Suporta BB, Itaú, Sicoob, Sicredi, Caixa, Inter, Nubank, C6, Banrisul e outros
              </span>
            </label>
          </div>

          {processando && (
            <div className="flex items-center justify-center py-4 gap-3 text-cyan-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-semibold">{statusMsg}</span>
            </div>
          )}

          {arquivosLidos.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Arquivos Analisados ({arquivosLidos.length})
              </h4>
              <div className="space-y-2">
                {arquivosLidos.map((a, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {a.erro ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                        <span>{a.arquivo}</span>
                        {a.formato && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                            {a.formato}
                          </span>
                        )}
                      </div>
                      {a.erro ? (
                        <div className="text-rose-500 mt-1 pl-6">{a.erro}</div>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400 mt-1 pl-6">
                          {a.itens?.length || 0} lançamentos lidos • Conta:{' '}
                          {a.numeroConta || 'Não identificada'}
                          {a.conferencia && a.conferencia.diasOk && (
                            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Saldos diários 100% conferidos
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={arquivosLidos.filter((a) => !a.erro).length === 0}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 rounded-xl"
          >
            Confirmar e Importar
          </button>
        </div>
      </div>
    </div>
  );
};
