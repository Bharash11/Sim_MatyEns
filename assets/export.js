// export.js — funciones de exportación de gráficos (todas las pestañas)

// FIX (Fase 10): cada función de export ya dispara la descarga -- se agrega
// una línea de registro en el progreso local (si el módulo está cargado),
// reusando el mismo punto de disparo en vez de agregar listeners nuevos.

/* ============================================================ EXPORT */
function exportChart(){
  const url = document.getElementById('mainChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='curva_traccion.png'; a.click();
  if (typeof progRegistrar === 'function') progRegistrar('export', { archivo: 'curva_traccion.png' });
}
function exportCompareChart(){
  const url = document.getElementById('compareChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='comparacion_materiales.png'; a.click();
  if (typeof progRegistrar === 'function') progRegistrar('export', { archivo: 'comparacion_materiales.png' });
}
function exportTempChart(){
  const url = document.getElementById('tempChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='efecto_temperatura.png'; a.click();
  if (typeof progRegistrar === 'function') progRegistrar('export', { archivo: 'efecto_temperatura.png' });
}
function exportCompChart(){
  const url = document.getElementById('compChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='curva_compresion.png'; a.click();
  if (typeof progRegistrar === 'function') progRegistrar('export', { archivo: 'curva_compresion.png' });
}
function exportCompoundChart(){
  const url = document.getElementById('compoundChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='material_compuesto.png'; a.click();
  if (typeof progRegistrar === 'function') progRegistrar('export', { archivo: 'material_compuesto.png' });
}

// FIX (integración Unidad 3 — Fase 3): la pestaña "Fractura, fatiga y fluencia"
// tiene 9 gráficos repartidos en 9 subsecciones (rt-sub-panel) -- en vez de
// escribir 9 funciones exportXChart() casi idénticas, una sola función lee el
// canvas que esté dentro de la subsección activa en ese momento (rtSwitch ya
// se encarga de marcar cuál es la .active) y lo exporta con el nombre de
// archivo que le pasa el botón de esa subsección.
function exportRoturaChart(filename){
  const panel = document.querySelector('.rt-sub-panel.active');
  const canvas = panel ? panel.querySelector('canvas') : null;
  if (!canvas) return; // subsección conceptual, sin gráfico que exportar
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  if (typeof progRegistrar === 'function') progRegistrar('export', { archivo: filename });
}

// FIX (Fase 6b): Dureza (Ensayo no destructivo) tenía el mismo gap que Unidad
// 3 antes de la Fase 3 -- su único gráfico (correlación TS vs HB) no tenía
// forma de exportarse.
function exportTsChart(){
  const url = document.getElementById('dz_tsChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='correlacion_ts_hb.png'; a.click();
  if (typeof progRegistrar === 'function') progRegistrar('export', { archivo: 'correlacion_ts_hb.png' });
}

