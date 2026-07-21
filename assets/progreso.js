// progreso.js — Guardado/progreso local del alumno (Fase 10)
//
// Dos usos pedidos por la cátedra, ambos a la vez:
//   1) Retomar donde dejó: se restaura el material elegido en cada selector
//      sincronizable (reusando MATERIAL_SYNC_TARGETS de material-sync.js,
//      Fase 7 -- cero lista paralela nueva) y la última pestaña principal
//      activa.
//   2) Registro para entregar/evaluar: un log de eventos (cambio de
//      material, ficha técnica generada, gráfico exportado) con fecha/hora,
//      pensado para que el alumno lo exporte y lo entregue.
//
// Vive en un único localStorage bajo PROGRESO_KEY (un objeto, no una clave
// por dato) más un botón de exportar/importar JSON, para que sobreviva a un
// cambio de máquina -- las dos opciones que pidió Agus, no una u otra.
//
// Todo el módulo es best-effort: si localStorage no está disponible (modo
// incógnito con storage deshabilitado, cuota llena, etc.) la app sigue
// funcionando normal, solo se pierde la persistencia entre sesiones -- mismo
// criterio de robustez que ya usaba tests.js para su propio localStorage de
// dev-mode.

const PROGRESO_KEY = 'matyens_progreso_v1';
let PROG_DATA = null;

function progVacio(){
  return { version: 1, alumno: '', ultimaPestana: null, materiales: {}, eventos: [] };
}

function progCargar(){
  try {
    const raw = localStorage.getItem(PROGRESO_KEY);
    if (!raw) return progVacio();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray(data.eventos)) return progVacio();
    return { ...progVacio(), ...data };
  } catch(e) {
    return progVacio();
  }
}

function progGuardar(){
  try {
    localStorage.setItem(PROGRESO_KEY, JSON.stringify(PROG_DATA));
  } catch(e) {
    console.warn('No se pudo guardar el progreso localmente:', e);
  }
}

// Tope de eventos para que una sesión larga no crezca sin límite -- se queda
// con los últimos 200, de sobra para el registro de una clase.
const PROG_MAX_EVENTOS = 200;

function progRegistrar(tipo, detalle){
  if (!PROG_DATA) return;
  PROG_DATA.eventos.push({ ts: new Date().toISOString(), tipo, ...detalle });
  if (PROG_DATA.eventos.length > PROG_MAX_EVENTOS) PROG_DATA.eventos = PROG_DATA.eventos.slice(-PROG_MAX_EVENTOS);
  progGuardar();
}

function progRegistrarPestana(name){
  if (!PROG_DATA) return;
  PROG_DATA.ultimaPestana = name;
  progGuardar();
}

/* ================================================================ INIT */
function progInit(){
  PROG_DATA = progCargar();

  if (typeof MATERIAL_SYNC_TARGETS !== 'undefined') {
    // Restaurar el último material elegido en cada selector sincronizable.
    MATERIAL_SYNC_TARGETS.forEach(t => {
      const val = PROG_DATA.materiales[t.id];
      const el = document.getElementById(t.id);
      if (!val || !el) return;
      const disponible = Array.from(el.options).some(o => o.value === val);
      if (disponible) { el.value = val; t.apply(val); }
    });
    // Enganchar el registro de cambios de material a esos mismos selectores
    // (además del onchange normal ya definido en el HTML -- addEventListener
    // no pisa el atributo onchange, ambos corren).
    MATERIAL_SYNC_TARGETS.forEach(t => {
      const el = document.getElementById(t.id);
      if (!el) return;
      el.addEventListener('change', () => {
        if (!el.value) return;
        PROG_DATA.materiales[t.id] = el.value;
        progRegistrar('material', { pestana: t.label, material: el.value });
      });
    });
  }

  if (PROG_DATA.ultimaPestana) {
    const btn = document.querySelector(`.tab[onclick*="switchTab('${PROG_DATA.ultimaPestana}'"]`);
    if (btn) switchTab(PROG_DATA.ultimaPestana, btn);
  }
}

/* ================================================================ ESCAPE */
function progEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ================================================================ PANEL */
function abrirProgreso(){
  renderProgresoBody();
  document.getElementById('progresoModal').style.display = 'flex';
}
function cerrarProgreso(){
  document.getElementById('progresoModal').style.display = 'none';
}

function progDescribirEvento(ev){
  const nombreMat = (typeof MATERIAL_LABELS !== 'undefined' && MATERIAL_LABELS[ev.material]) || ev.material;
  if (ev.tipo === 'material') return `${progEsc(ev.pestana)}: ${progEsc(nombreMat)}`;
  if (ev.tipo === 'ficha')    return `Ficha técnica generada: ${progEsc(nombreMat)}`;
  if (ev.tipo === 'export')   return `Gráfico exportado: ${progEsc(ev.archivo)}`;
  return progEsc(ev.tipo);
}

function renderProgresoBody(){
  const eventosHtml = PROG_DATA.eventos.length
    ? PROG_DATA.eventos.slice().reverse().map(ev => {
        const hora = new Date(ev.ts).toLocaleString('es-AR');
        return `<div class="prog-row"><span class="prog-hora">${progEsc(hora)}</span><span class="prog-tipo prog-tipo-${progEsc(ev.tipo)}">${progEsc(ev.tipo)}</span><span class="prog-detalle">${progDescribirEvento(ev)}</span></div>`;
      }).join('')
    : '<div class="note">Todavía no hay actividad registrada en esta sesión.</div>';

  document.getElementById('progresoBody').innerHTML = `
    <div class="field"><label>Nombre (para identificar el registro al exportar)</label>
      <input type="text" id="progAlumnoNombre" value="${progEsc(PROG_DATA.alumno||'')}" placeholder="Opcional" oninput="progActualizarNombre(this.value)">
    </div>
    <div class="note">Este registro queda guardado en este navegador. Si vas a cambiar de máquina, exportalo antes para no perderlo.</div>
    <div class="prog-list">${eventosHtml}</div>
    <div class="no-print" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-secondary" onclick="progExportar()">⬇ Exportar progreso (JSON)</button>
      <button class="btn-secondary" onclick="document.getElementById('progImportInput').click()">⬆ Importar progreso</button>
      <button class="btn-danger" onclick="progBorrar()">🗑 Borrar mi progreso</button>
    </div>
    <input type="file" id="progImportInput" accept="application/json" style="display:none" onchange="progImportar(this)">
  `;
}

function progActualizarNombre(v){
  PROG_DATA.alumno = v;
  progGuardar();
}

function progExportar(){
  const blob = new Blob([JSON.stringify(PROG_DATA, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const nombreArchivo = (PROG_DATA.alumno || 'alumno').trim().replace(/\s+/g,'_').toLowerCase() || 'alumno';
  a.href = url; a.download = `progreso_matyens_${nombreArchivo}.json`; a.click();
  URL.revokeObjectURL(url);
}

function progImportar(input){
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object' || !Array.isArray(data.eventos)) throw new Error('formato no reconocido');
      PROG_DATA = { ...progVacio(), ...data };
      progGuardar();
      renderProgresoBody();
    } catch(e) {
      alert('El archivo no tiene el formato esperado de un progreso exportado por este simulador.');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function progBorrar(){
  if (!confirm('¿Borrar todo el progreso guardado en este navegador? Esta acción no se puede deshacer.')) return;
  PROG_DATA = progVacio();
  progGuardar();
  renderProgresoBody();
}
