// Service worker de Sim_MatyEns (Simulador de Ensayos Mecánicos).
//
// FIX v4.8: primera versión de la PWA (manifest.json + este service worker).
//
// IMPORTANTE PARA AGUS: subí SW_CACHE_VERSION en CADA release donde cambien
// archivos de assets/ o index.html. Si no lo subís, los alumnos que ya
// instalaron la PWA van a seguir viendo la versión vieja cacheada, aunque
// GitHub Pages ya tenga la nueva (el navegador solo revisa este archivo
// sw.js byte a byte; si sw.js no cambia, no se entera de nada más).
const SW_CACHE_VERSION = 'v4.8';
const CACHE_NAME = `sim-matyens-${SW_CACHE_VERSION}`;

// Archivos propios del simulador (mismo origen que GitHub Pages).
// Si agregás un .js o .css nuevo a assets/, sumalo acá también.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/styles.css',
  './assets/app.js',
  './assets/comparar.js',
  './assets/compresion.js',
  './assets/compuesto.js',
  './assets/configs.js',
  './assets/corrosion.js',
  './assets/data-presets.js',
  './assets/desgaste.js',
  './assets/dureza-brinell.js',
  './assets/dureza-esclerometro.js',
  './assets/dureza-init.js',
  './assets/dureza-janka.js',
  './assets/dureza-mohs.js',
  './assets/dureza-rockwell.js',
  './assets/dureza-shared.js',
  './assets/dureza-vickers.js',
  './assets/export.js',
  './assets/fatiga.js',
  './assets/ficha.js',
  './assets/fluencia.js',
  './assets/fractura.js',
  './assets/help-data.js',
  './assets/material-sync.js',
  './assets/polimeros.js',
  './assets/progreso.js',
  './assets/rotura-shared.js',
  './assets/temperatura.js',
  './assets/tensiones-residuales.js',
  './assets/tests.js',
  './assets/traccion.js',
  './assets/icons/icon-16.png',
  './assets/icons/icon-32.png',
  './assets/icons/icon-48.png',
  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-256.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png'
];

// Chart.js viene de un CDN externo (cdnjs). Se cachea aparte porque es
// cross-origin: si cdnjs no responde, el precache de arriba no debe fallar
// por su culpa.
const CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    try {
      // no-cors: opaco pero cacheable; si cdnjs bloquea el fetch no rompe el install
      await cache.add(new Request(CDN_URL, { mode: 'no-cors' }));
    } catch (e) {
      // Sin conexión durante el install: Chart.js se cachea en el primer
      // fetch exitoso más adelante (ver runtime cache abajo).
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith('sim-matyens-') && n !== CACHE_NAME)
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCdnChart = req.url === CDN_URL;

  if (!isSameOrigin && !isCdnChart) return; // deja pasar cualquier otro pedido externo tal cual

  if (req.mode === 'navigate') {
    // HTML: red primero (para que Agus/los alumnos vean cambios apenas hay
    // internet), y si no hay conexión, cae al index.html cacheado.
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./index.html')) || (await cache.match(req));
      }
    })());
    return;
  }

  // CSS/JS/íconos/manifest y Chart.js del CDN: caché primero (arranca
  // rápido y funciona offline), y de yapa actualiza la caché en segundo
  // plano para la próxima carga.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const network = fetch(req, isCdnChart ? { mode: 'no-cors' } : undefined)
      .then((res) => {
        cache.put(req, res.clone());
        return res;
      })
      .catch(() => undefined);
    return cached || (await network) || Response.error();
  })());
});
