import "./lib/legado.js";   // primeiro: as regras publicam Core, AuthCore, Store...
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { iniciarPwa } from "./lib/pwa.js";

class LimiteErro extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }
  static getDerivedStateFromError(error) {
    return { erro: error };
  }
  componentDidCatch(error, info) {
    console.error("MakerPixel Erro de Renderização:", error, info);
  }
  recarregarEAtualizar() {
    try {
      localStorage.removeItem("gf.sessao");
      sessionStorage.clear();
    } catch (e) {}
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister()))).finally(() => {
        if ("caches" in window) {
          caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).finally(() => {
            window.location.reload(true);
          });
        } else {
          window.location.reload(true);
        }
      });
    } else {
      window.location.reload(true);
    }
  }
  render() {
    if (this.state.erro) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-ink">
          <div className="cartao max-w-md w-full p-8 text-center space-y-4 border border-line shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-brand-soft text-brand flex items-center justify-center mx-auto text-xl font-bold">
              ✦
            </div>
            <h2 className="text-xl font-bold text-brand">MakerPixel Techsystem</h2>
            <p className="text-sm text-muted">
              Uma nova versão foi instalada ou houve um ajuste nos dados locais.
            </p>
            <div className="p-3 bg-surface-2 rounded-lg text-left text-xs font-mono text-debit break-words overflow-auto max-h-32 border border-line">
              {String(this.state.erro && (this.state.erro.message || this.state.erro))}
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => this.recarregarEAtualizar()}
                className="btn-primario w-full h-11"
              >
                Limpar cache e abrir sistema
              </button>
              <button
                type="button"
                onClick={() => this.setState({ erro: null })}
                className="btn-contorno w-full h-10 text-xs"
              >
                Tentar continuar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

iniciarPwa();   // app instalável e aviso de versão nova (só no site publicado)

const el = document.getElementById("raiz");
if (el) {
  createRoot(el).render(
    <React.StrictMode>
      <LimiteErro>
        <App />
      </LimiteErro>
    </React.StrictMode>
  );
}

