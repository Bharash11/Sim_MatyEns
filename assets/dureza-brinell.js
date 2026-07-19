// dureza-brinell.js — escala Brinell

const BRINELL_REF = {
  acero:     {hb:130, p:3000, d:5.20},
  aceroinox: {hb:150, p:3000, d:4.90},
  fragil:    {hb:200, p:3000, d:4.25},
  aluminio:  {hb:95,  p:500,  d:2.55},
  cobre:     {hb:45,  p:500,  d:3.70},
  titanio:   {hb:334, p:3000, d:3.35},
  niquel:    {hb:70,  p:1000, d:4.15},
  molibdeno: {hb:160, p:3000, d:4.75},
  magnesio:  {hb:50,  p:500,  d:3.50},
  zinc:      {hb:35,  p:500,  d:4.15},
  tungsteno: {hb:250, p:3000, d:3.85},
  laton:     {hb:55,  p:500,  d:3.35},
  plata:     {hb:25,  p:500,  d:4.90},
  oro:       {hb:25,  p:500,  d:4.90},
};
function dzApplyBrinellMaterial(){
  const key = document.getElementById('dz_brMat').value;
  const ref = BRINELL_REF[key];
  if(!ref) { dzUpdateBrinell(); return; }
  document.getElementById('dz_brP').value = ref.p;
  document.getElementById('dz_brD').value = ref.d;
  dzUpdateBrinell();
}
function dzUpdateBrinell(){
  const D = 10;
  const P = parseFloat(document.getElementById('dz_brP').value);
  const d = parseFloat(document.getElementById('dz_brD').value);
  document.getElementById('dz_brDVal').textContent = d.toFixed(2);
  const warnEl = document.getElementById('dz_brWarn');
  const resultEl = document.getElementById('dz_brResult');
  const subEl = document.getElementById('dz_brSub');
  const cmpEl = document.getElementById('dz_brMatCompare');
  const matKey = document.getElementById('dz_brMat').value;
  const ref = BRINELL_REF[matKey];
  if(d >= D){
    resultEl.textContent = '—';
    subEl.textContent = 'd debe ser menor que D (10 mm)';
    warnEl.style.display='block';
    warnEl.textContent = 'Diámetro inválido: debe ser menor que el diámetro del penetrador (10 mm).';
    if(cmpEl) cmpEl.style.display='none';
    dzDrawBrinellSvg(d, false);
    return;
  }
  const HB = (2*P) / (Math.PI*D*(D - Math.sqrt(D*D - d*d)));
  resultEl.textContent = HB.toFixed(1) + ' HB';
  subEl.textContent = `HB = 2×${P} / [π×10×(10−√(100−${(d*d).toFixed(2)}))] = ${HB.toFixed(1)}`;
  if(ref){
    const diffPct = ((HB-ref.hb)/ref.hb*100);
    const cerca = Math.abs(diffPct) < 15;
    cmpEl.style.display='block';
    cmpEl.innerHTML = `<strong>Referencia bibliográfica para este material: ≈${ref.hb} HB</strong> (valor típico de tabla, no una medición exacta). `
      + (cerca
        ? `Tu ensayo dio un valor cercano.`
        : `Tu ensayo dio un valor ${diffPct>0?'más alto':'más bajo'} (${Math.abs(diffPct).toFixed(0)}% de diferencia) -- normal si cambiaste P o d respecto del ensayo guiado.`);
  } else if(cmpEl) {
    cmpEl.style.display='none';
  }
  const ratio = d/D;
  if(ratio < 0.24 || ratio > 0.6){
    warnEl.style.display='block';
    warnEl.textContent = 'La huella medida es muy pequeña o muy grande para una lectura confiable (se recomienda d entre 0,24D y 0,60D aprox.). Ajustá la carga o revisá la medición.';
  } else {
    warnEl.style.display='none';
  }
  dzDrawBrinellSvg(d, true);
}
function dzDrawBrinellSvg(d, ok){
  const svg = document.getElementById('dz_brSvg');
  const scale = 22;
  const r = (d/2)*scale;
  svg.innerHTML = `
    <circle cx="110" cy="110" r="95" fill="var(--surface)" stroke="var(--border)"/>
    <circle cx="110" cy="110" r="${r}" fill="${ok?'var(--accent)':'var(--frac)'}" opacity="0.4" stroke="${ok?'var(--accent)':'var(--frac)'}" stroke-width="1.5"/>
    <line x1="${110-r}" y1="110" x2="${110+r}" y2="110" stroke="var(--neck)" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="110" y="215" text-anchor="middle" fill="var(--muted)" font-size="11">d = ${d.toFixed(2)} mm</text>
  `;
}

/* ---------------- 4. MICRODUREZA ---------------- */
// Igual que en Brinell/Rockwell: valor Vickers de referencia bibliográfica
// (carga estándar HV1 = 1000 gf) y el diagonal de huella que lo reproduce.
// FIX #34: se extendió con los mismos 14 materiales metálicos que ya tiene
// Brinell (antes solo estaba cerámica). Vickers es, de las tres escalas de esta
// app, la única que en la práctica se usa en todo el rango de dureza (blandos
// y duros por igual), así que tiene sentido que cubra los mismos materiales.
// Para los de dureza baja/media (hasta ~200 HB) se usa HV≈HB como aproximación
// razonable (ambas escalas dan valores muy cercanos en ese rango). Para los más
// duros (titanio, tungsteno, molibdeno) se usa un HV publicado en vez de copiar
// el HB directo, porque ahí la aproximación HV≈HB pierde precisión.
