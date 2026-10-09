/*
 * storage.ts — Camada de persistência IndexedDB de alto desempenho
 * Compatível com todos os formatos e preparado para sincronização com backend Java.
 */

const DB_NOME = "makerpixel_financeiro";
const OBJ = "kv";

let db: IDBDatabase | null = null;
let cache: Record<string, any> = {};
let pendentes = 0;
let falhou = false;

function abrir(nome: string, versao?: number, upgrade?: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const req = versao ? indexedDB.open(nome, versao) : indexedDB.open(nome);
    if (upgrade) req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

function lerTudo(banco: IDBDatabase, store: string): Promise<Record<string, any>> {
  return new Promise((ok, erro) => {
    const dados: Record<string, any> = {};
    const req = banco.transaction(store, "readonly").objectStore(store).openCursor();
    req.onsuccess = (e: any) => {
      const c = e.target.result;
      if (c) { dados[c.key] = c.value; c.continue(); } else ok(dados);
    };
    req.onerror = () => erro(req.error);
  });
}

function gravar(chave: string, valor: any): Promise<boolean> {
  if (!db) return Promise.resolve(false);
  pendentes++;
  return new Promise((ok) => {
    const tx = db!.transaction(OBJ, "readwrite");
    if (valor === undefined) tx.objectStore(OBJ).delete(chave);
    else tx.objectStore(OBJ).put(valor, chave);
    tx.oncomplete = () => { pendentes--; ok(true); };
    tx.onerror = tx.onabort = () => {
      pendentes--; falhou = true;
      console.error("Falha ao gravar", chave, tx.error);
      ok(false);
    };
  });
}

export const StorageService = {
  async init(): Promise<boolean> {
    if (typeof window === "undefined" || !window.indexedDB) return false;
    try {
      db = await abrir(DB_NOME, 1, (b) => {
        b.createObjectStore(OBJ);
      });
      cache = await lerTudo(db, OBJ);

      // Migração opcional da base legada se existir e esta for vazia
      if (Object.keys(cache).length === 0 && window.indexedDB.databases) {
        try {
          const dbs = await window.indexedDB.databases();
          if (dbs.some(d => d.name === "gestao-financeira")) {
            const oldDb = await abrir("gestao-financeira");
            if (oldDb.objectStoreNames.contains("kv")) {
              const oldData = await lerTudo(oldDb, "kv");
              for (const [k, v] of Object.entries(oldData)) {
                cache[k] = v;
                await gravar(k, v);
              }
            }
          }
        } catch (e) {
          console.warn("Nenhum banco anterior para migrar:", e);
        }
      }

      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
      return true;
    } catch (e) {
      console.error("IndexedDB indisponível:", e);
      db = null;
      return false;
    }
  },

  get<T = any>(k: string): T | undefined {
    return cache[k] as T;
  },

  set(k: string, v: any): Promise<boolean> {
    cache[k] = v;
    return gravar(k, v);
  },

  remove(k: string): Promise<boolean> {
    delete cache[k];
    return gravar(k, undefined);
  },

  keys(): string[] {
    return Object.keys(cache);
  },

  isAvailable(): boolean {
    return !!db;
  },

  hasFailed(): boolean {
    return falhou;
  },

  isWriting(): boolean {
    return pendentes > 0;
  },

  getAllData(): Record<string, any> {
    const dados: Record<string, any> = {};
    for (const k of Object.keys(cache)) {
      dados[k] = cache[k];
    }
    return dados;
  },

  async restoreAllData(dados: Record<string, any>): Promise<void> {
    const keys = Object.keys(cache);
    await Promise.all(keys.map(k => gravar(k, undefined)));
    cache = {};
    for (const k of Object.keys(dados)) {
      cache[k] = dados[k];
      await gravar(k, dados[k]);
    }
  },

  async clearAll(): Promise<void> {
    const keys = Object.keys(cache);
    await Promise.all(keys.map(k => gravar(k, undefined)));
    cache = {};
  }
};
