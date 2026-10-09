// Carrega os motores originais 100% testados no ambiente do navegador ou bundle
import './core.js';
import './integracao.js';
import './extratos.js';
import './pdfextrato.js';
import './conciliacao.js';
import './nfe.js';
import './importacao.js';

const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any);

export const Core = g.Core;
export const Integracao = g.Integracao;
export const Extratos = g.Extratos;
export const PdfExtrato = g.PdfExtrato;
export const Conciliacao = g.Conciliacao;
export const Nfe = g.Nfe;
export const Importacao = g.Importacao;
