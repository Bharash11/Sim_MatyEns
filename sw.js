// Service worker de Sim_MatyEns (Simulador de Ensayos Mecánicos).
//
// IMPORTANTE PARA AGUS: subí SW_CACHE_VERSION en CADA release donde cambien
// archivos de assets/ o index.html. Si no lo subís, los alumnos que ya
// instalaron la PWA van a seguir viendo la versión vieja cacheada, aunque
// GitHub Pages ya tenga la nueva (el navegador solo revisa este archivo
// sw.js byte a byte; si sw.js no cambia, no se entera de nada más).
//
// FIX v4.10: 18 materiales nuevos (metales, cerámicos técnicos, compuestos,
// polímeros) agregados a PRESETS + selects de Tracción/Compresión/Dureza/
// Comparar/Compuesto. Ver v4.9 para el resto.
//
// FIX v4.11 (revisión QA por partes): SRI en el script de Chart.js del CDN
// (index.html + este archivo) + ayuda contextual faltante en 8 subsecciones
// de Dureza + nota de %EL aclarada en la ficha de Tracción + sy de Magnesio
// AZ31 corregido (97→150 MPa, era el valor de compresión) + tests dz_brinell_
// ref_table / dz_rockwell_ref_table / presets_v4_10 agregados a tests.js.
const SW_CACHE_VERSION = 'v4.11';
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
// FIX (QA — hallazgo Parte 1): antes se pedía en modo 'no-cors', que da una
// respuesta opaca -- el navegador NO puede verificar su contenido, así que
// ni siquiera vale la pena pedirle a fetch() que valide un hash ahí. Ahora se
// pide en modo 'cors' con el mismo hash SRI que ya tiene el <script> de
// index.html: cdnjs sirve con headers CORS habilitados (por eso el <script>
// puede usar crossorigin="anonymous"+integrity), así que esto no le pide
// nada al CDN que no pudiera hacer ya. Si el hash no coincide (CDN comprometido,
// o el día de mañana alguien sube la versión sin actualizar el hash), el fetch
// de esta línea directamente falla y cae al catch -- Chart.js quedaría sin
// precachear, pero nunca se sirve una copia adulterada desde la caché.
const CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
const CDN_SRI = 'sha512-ZwR1/gSZM3ai6vCdI+LVF1zSq/5HznD3ZSTk7kajkaj4D292NLuduDCO1c/NT8Id+jE58KYLKT7hXnbtryGmMg==';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    try {
      const res = await fetch(CDN_URL, { mode: 'cors', integrity: CDN_SRI });
      await cache.put(CDN_URL, res);
    } catch (e) {
      // Sin conexión, o el hash no coincide (CDN comprometido/desactualizado):
      // no se cachea nada acá antes que cachear una copia sin verificar.
      // Si hay conexión más adelante, el runtime fetch de abajo reintenta.
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
    // FIX (QA — hallazgo Parte 1): mismo criterio que el precache de arriba --
    // Chart.js se pide con 'cors' + integrity (verificable) en vez de
    // 'no-cors' (opaco, sin forma de confirmar que el contenido es el
    // esperado). Si el hash no coincide, el fetch falla y se sigue sirviendo
    // la copia ya cacheada (si existe) en vez de una versión sin verificar.
    const network = fetch(req, isCdnChart ? { mode: 'cors', integrity: CDN_SRI } : undefined)
      .then((res) => {
        cache.put(req, res.clone());
        return res;
      })
      .catch(() => undefined);
    return cached || (await network) || Response.error();
  })());
});
