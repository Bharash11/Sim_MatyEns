// export.js — funciones de exportación de gráficos (todas las pestañas)

/* ============================================================ EXPORT */
function exportChart(){
  const url = document.getElementById('mainChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='curva_traccion.png'; a.click();
}
function exportCompareChart(){
  const url = document.getElementById('compareChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='comparacion_materiales.png'; a.click();
}
function exportTempChart(){
  const url = document.getElementById('tempChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='efecto_temperatura.png'; a.click();
}
function exportCompChart(){
  const url = document.getElementById('compChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='curva_compresion.png'; a.click();
}
function exportCompoundChart(){
  const url = document.getElementById('compoundChart').toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='material_compuesto.png'; a.click();
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
}

