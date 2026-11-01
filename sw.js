/*
 * Service worker do MakerPixel Techsystem (React): deixa o sistema instalável e abrindo sem internet.
 *
 * Este é o MODELO. No build (npm run build), pwa/plugin.mjs preenche VERSAO e ARQUIVOS com a versão
 * e pela lista de arquivos daquele build e grava dist/sw.js.
 *
 * Guarda só os arquivos do sistema; os dados ficam no IndexedDB/localStorage do navegador.
 */
var VERSAO = "1.0.0-1c81bb78";
var ARQUIVOS = [
 "./",
 "assets/ibsLc214-DnzwNCTr.js",
 "assets/index-Ccqjun9E.js",
 "assets/index-yKxdPG9S.css",
 "icons/apple-touch-icon-v2.png",
 "icons/favicon-32-v2.png",
 "icons/icon-192-v2.png",
 "icons/icon-512-v2.png",
 "icons/icon-maskable-512-v2.png",
 "icons/icon.svg",
 "icons/makerpixel-logo-escuro.svg",
 "icons/makerpixel-logo.svg",
 "icons/makerpixel-simbolo.png",
 "icons/makerpixel-simbolo.svg",
 "manifest.webmanifest"
];
var CACHE = "makerpixel-react-" + VERSAO;
var CACHE_EXTERNO = "makerpixel-react-externo";

// bibliotecas de fora (planilhas, PDF, fonte): guardadas na primeira vez que forem usadas
var EXTERNOS = ["https://cdnjs.cloudflare.com/", "https://fonts.googleapis.com/", "https://fonts.gstatic.com/"];

self.addEventListener("install", function (ev) {
  self.skipWaiting();
  ev.waitUntil(caches.open(CACHE).then(function (c) {
    // cache: "reload" ignora o cache HTTP, para não guardar arquivo velho
    return Promise.all(ARQUIVOS.map(function (u) {
      return fetch(new Request(u, { cache: "reload" })).then(function (r) {
        if (!r.ok) throw new Error(u + ": " + r.status);
        return c.put(u, r);
      });
    }));
  }));
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return (n.indexOf("makerpixel-") === 0 || n.indexOf("gf-react-") === 0) && n !== CACHE && n !== CACHE_EXTERNO; })
      .map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("message", function (ev) {
  if (ev.data === "atualizar") self.skipWaiting();
  if (ev.data === "versao" && ev.source) ev.source.postMessage({ versao: VERSAO });
});

self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // páginas (o sistema e cada módulo, que abre num quadro): a versão guardada daquela página; sem ela, a rede.
  if (req.mode === "navigate" && url.origin === location.origin) {
    ev.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(function (r) {
      if (r) return r;
      return fetch(req).catch(function () {
        var raiz = new URL("./", self.registration.scope).pathname;
        if (url.pathname === raiz || url.pathname === raiz + "index.html") return caches.match("./", { cacheName: CACHE });
        throw new Error("sem internet e página não guardada: " + url.pathname);
      });
    }));
    return;
  }

  if (url.origin === location.origin) {
    ev.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(function (r) { return r || fetch(req); }));
    return;
  }

  if (EXTERNOS.some(function (p) { return req.url.indexOf(p) === 0; })) {
    ev.respondWith(caches.open(CACHE_EXTERNO).then(function (c) {
      return c.match(req).then(function (r) {
        return r || fetch(req).then(function (resp) {
          if (resp.ok || resp.type === "opaque") c.put(req, resp.clone());
          return resp;
        });
      });
    }));
  }
});
