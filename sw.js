const CACHE_NAME = 'controle-envios-v2'; // v2: bump força limpar o cache antigo travado
const APP_SHELL = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Nunca cachear Supabase (dado ao vivo) nem bibliotecas de CDN externas — só o shell local.
  if (url.includes('supabase.co') || !url.includes(self.location.origin)) return;

  // Página principal (HTML): REDE PRIMEIRO — sempre busca a versão mais nova quando
  // online, e só usa o cache como reserva se a internet cair. Isso é o que faltava:
  // antes, a versão em cache era servida pra sempre e as atualizações nunca chegavam.
  const isHTML = event.request.mode === 'navigate' || url.endsWith('/') || url.endsWith('index.html');
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Demais arquivos do shell (ícones etc.): cache primeiro, é seguro pois mudam raramente.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
