// material-sync.js — Sincronización cruzada de material entre pestañas
// (Fase 7 — pedido pendiente desde v2.3, retomado ahora que PRESETS ya está
// unificado, ver data-presets.js).
//
// Antes, cada pestaña con selector de material (Tracción, Compresión,
// Temperatura, Dureza x3, Janka, Esclerómetro, Fatiga-Paris) vivía aislada:
// elegir "Acero A36" en Tracción no cambiaba nada en las demás. Con PRESETS
// ya unificado (Fase 1/6a) alcanza con leer las <option> REALES de cada
// <select> destino (no una lista paralela a mano, que se desincroniza con
// el tiempo apenas alguien agregue/saque un material de un <select>) y
// reusar la función applyX() que YA existe para ese selector -- cero lógica
// de cálculo nueva acá, solo el "disparador" cruzado.
//
// Decisiones de UX (conversación con la cátedra, no automático/silencioso):
//   - Botón manual "Aplicar a todos los ensayos", no sync automática al
//     elegir un material -- el alumno puede querer, por ejemplo, comparar
//     Acero (cargado en Tracción) contra Aluminio (ya cargado en
//     Compresión) sin que un cambio en una pestaña le pise la otra sola.
//   - Comparar (c1/c2) y Material compuesto (k1/k2, matriz/refuerzo) NO
//     entran en este registro: tienen DOS materiales simultáneos y no hay
//     "el material actual" único ahí -- sincronizar pisaría un slot al azar
//     sin que sea obvio cuál. Quedan totalmente independientes, como ya
//     estaban.
//   - Si el material no existe en el subconjunto de una pestaña destino
//     (ej. "Oro" no está en Janka porque es un ensayo de maderas, o "Madera"
//     no está en Rockwell/Brinell/Vickers porque esas tablas son de
//     metales), esa pestaña se deja intacta -- no es un error, es
//     esperable -- y el reporte lo lista como "no aplica" para que quede
//     explícito que el simulador lo tuvo en cuenta y no que se olvidó.

// Registro único de selectores sincronizables. `label` es lo que se muestra
// en el reporte del toast; `apply` reusa la función que YA aplica ese
// preset a esa pestaña (la misma que dispara el onchange normal del
// <select> cuando el alumno lo cambia a mano).
const MATERIAL_SYNC_TARGETS = [
  { id: 'e_preset',    label: 'Tracción',               apply: () => applyPreset('e') },
  { id: 'co_preset',   label: 'Compresión',             apply: () => applyPresetComp0() },
  { id: 't_preset',    label: 'Temperatura',            apply: (v) => applyPreset('t', v) },
  { id: 'dz_rkMat',    label: 'Dureza — Rockwell',      apply: () => dzApplyRockwellMaterial() },
  { id: 'dz_brMat',    label: 'Dureza — Brinell',       apply: () => dzApplyBrinellMaterial() },
  { id: 'dz_vMat',     label: 'Dureza — Vickers/Knoop', apply: () => dzApplyVickersMaterial() },
  { id: 'dz_jkMat',    label: 'Dureza — Janka',         apply: () => dzApplyJankaMaterial() },
  { id: 'dz_scMat',    label: 'Dureza — Esclerómetro',  apply: () => dzApplyScleroMaterial() },
  { id: 'ft_parisMat', label: 'Fatiga — Ley de Paris',  apply: () => ftApplyParisPreset() },
];

// Aplica el material actualmente elegido en `sourceId` a todas las demás
// pestañas del registro que lo tengan disponible como opción real de su
// <select> (no se asume nada: se revisa el DOM en el momento del click, así
// que sigue siendo correcto aunque a futuro se agreguen/saquen materiales
// de algún <select> puntual sin tocar este archivo).
function syncMaterialToAllTests(sourceId) {
  const srcEl = document.getElementById(sourceId);
  if (!srcEl) return;
  const key = srcEl.value;
  if (!key) {
    showSyncMessage('Elegí un material en este selector antes de aplicarlo a las demás pestañas.');
    return;
  }

  const aplicados = [];
  const noDisponibles = [];
  MATERIAL_SYNC_TARGETS.forEach(target => {
    if (target.id === sourceId) return; // no reaplicar sobre el mismo selector que originó el sync
    const el = document.getElementById(target.id);
    if (!el) return; // selector no presente en este DOM (robustez ante cambios futuros)
    const disponible = Array.from(el.options).some(o => o.value === key);
    if (disponible) {
      el.value = key;
      target.apply(key);
      aplicados.push(target.label);
    } else {
      noDisponibles.push(target.label);
    }
  });

  const nombre = (typeof MATERIAL_LABELS !== 'undefined' && MATERIAL_LABELS[key]) || key;
  showSyncReport(nombre, aplicados, noDisponibles);
}

/* ================================================================ TOAST */
// Toast simple, no bloqueante, se autodescarta -- reusa el mismo <div> para
// no acumular nodos si el docente clickea el botón varias veces seguidas.
let syncToastTimer = null;

function getSyncToastEl() {
  let box = document.getElementById('matSyncToast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'matSyncToast';
    box.className = 'mat-sync-toast';
    document.body.appendChild(box);
  }
  return box;
}

function showSyncMessage(text) {
  const box = getSyncToastEl();
  box.innerHTML = `<div class="mat-sync-toast-row">${text}</div>
    <button type="button" class="mat-sync-toast-close" onclick="hideSyncToast()">✕</button>`;
  box.classList.add('show');
  clearTimeout(syncToastTimer);
  syncToastTimer = setTimeout(hideSyncToast, 5000);
}

function showSyncReport(nombre, aplicados, noDisponibles) {
  const box = getSyncToastEl();
  let html = `<div class="mat-sync-toast-title">🔗 ${nombre}</div>`;
  html += aplicados.length
    ? `<div class="mat-sync-toast-row"><span class="ok">✓ Aplicado en:</span> ${aplicados.join(', ')}</div>`
    : `<div class="mat-sync-toast-row"><span class="warn">— No se aplicó en ninguna otra pestaña.</span></div>`;
  if (noDisponibles.length) {
    html += `<div class="mat-sync-toast-row"><span class="warn">— No aplica en:</span> ${noDisponibles.join(', ')}</div>`;
  }
  html += `<button type="button" class="mat-sync-toast-close" onclick="hideSyncToast()">✕</button>`;
  box.innerHTML = html;
  box.classList.add('show');
  clearTimeout(syncToastTimer);
  syncToastTimer = setTimeout(hideSyncToast, 7000);
}

function hideSyncToast() {
  const box = document.getElementById('matSyncToast');
  if (box) box.classList.remove('show');
}
