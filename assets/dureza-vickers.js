// dureza-vickers.js — microdureza Vickers + correlación TS-dureza + conversión entre escalas

const VICKERS_REF = {
  ceramica:   {hv:1700, p:1000, d:0.033},
  acero:      {hv:135,  p:1000, d:0.117},
  aceroinox:  {hv:155,  p:1000, d:0.109},
  fragil:     {hv:210,  p:1000, d:0.094},
  aluminio:   {hv:107,  p:300,  d:0.072},
  cobre:      {hv:50,   p:300,  d:0.106},
  titanio:    {hv:349,  p:1000, d:0.073},
  niquel:     {hv:75,   p:500,  d:0.111},
  molibdeno:  {hv:165,  p:1000, d:0.106},
  magnesio:   {hv:57,   p:300,  d:0.099},
  zinc:       {hv:38,   p:300,  d:0.121},
  tungsteno:  {hv:310,  p:1000, d:0.077},
  laton:      {hv:60,   p:500,  d:0.124},
  plata:      {hv:27,   p:200,  d:0.117},
  oro:        {hv:25,   p:200,  d:0.122},
};
function dzApplyVickersMaterial(){
  const key = document.getElementById('dz_vMat').value;
  const ref = VICKERS_REF[key];
  if(!ref){ dzUpdateMicro(); return; }
  document.getElementById('dz_vP').value = ref.p;
  document.getElementById('dz_vD').value = ref.d;
  dzUpdateMicro();
}
function dzUpdateMicro(){
  // FIX #5: los campos de carga están etiquetados en gf (gramos-fuerza, como
  // corresponde a un ensayo de MICROdureza real), pero las fórmulas estándar
  // HV=1.854·P/d² y HK=14.2·P/l² requieren P en kgf. Antes no se convertía,
  // así que los HV/HK mostrados quedaban 1000 veces más altos de lo real.
  // FIX #26: antes se podían tipear valores negativos (el "min" de HTML no lo
  // impide) y se obtenía un HV/HK negativo sin ningún aviso. Ahora un valor
  // negativo o cero se trata como dato inválido, igual que un campo vacío.
  const P1raw = parseFloat(document.getElementById('dz_vP').value);
  const d1raw = parseFloat(document.getElementById('dz_vD').value);
  const P2raw = parseFloat(document.getElementById('dz_kP').value);
  const lraw = parseFloat(document.getElementById('dz_kL').value);
  const validP1 = isFinite(P1raw) && P1raw>0, validD1 = isFinite(d1raw) && d1raw>0;
  const validP2 = isFinite(P2raw) && P2raw>0, validL = isFinite(lraw) && lraw>0;
  const P1 = (validP1?P1raw:0) / 1000; // gf -> kgf
  const d1 = validD1?d1raw:0.0001;
  const HV = 1.854*P1/(d1*d1);
  document.getElementById('dz_vResult').textContent = (validP1&&validD1&&isFinite(HV)) ? HV.toFixed(1)+' HV' : '—';

  const cmpEl = document.getElementById('dz_vMatCompare');
  const matKey = document.getElementById('dz_vMat').value;
  const ref = VICKERS_REF[matKey];
  if(ref && validP1 && validD1 && isFinite(HV)){
    const diffPct = ((HV-ref.hv)/ref.hv*100);
    const cerca = Math.abs(diffPct) < 15;
    cmpEl.style.display='block';
    cmpEl.innerHTML = `<strong>Referencia bibliográfica para este material: ≈${ref.hv} HV</strong> (valor típico de tabla, carga estándar HV1). `
      + (cerca ? `Tu ensayo dio un valor cercano.`
               : `Tu ensayo dio un valor ${diffPct>0?'más alto':'más bajo'} (${Math.abs(diffPct).toFixed(0)}% de diferencia) -- normal si cambiaste P o d₁ respecto del ensayo guiado.`);
  } else {
    cmpEl.style.display='none';
  }

  const P2 = (validP2?P2raw:0) / 1000; // gf -> kgf
  const l = validL?lraw:0.0001;
  const HK = 14.2*P2/(l*l);
  document.getElementById('dz_kResult').textContent = (validP2&&validL&&isFinite(HK)) ? HK.toFixed(1)+' HK' : '—';

  // FIX #25: a diferencia de Brinell (que valida d/D), acá no había ninguna
  // validación de rango razonable. Se avisa si algún input es inválido
  // (vacío/negativo/cero) o si el resultado queda fuera de un rango físico
  // plausible para materiales reales (aprox. 1 a 3000 HV/HK).
  const warnEl = document.getElementById('dz_microWarn');
  const msgs = [];
  if(!validP1 || !validD1) msgs.push('Vickers: la carga P y la diagonal d₁ deben ser números positivos mayores que cero.');
  else if(HV<1 || HV>3000) msgs.push(`Vickers: HV=${HV.toFixed(0)} está fuera del rango típico de materiales reales (~1 a 3000 HV) -- revisá P y d₁.`);
  if(!validP2 || !validL) msgs.push('Knoop: la carga P y la longitud l deben ser números positivos mayores que cero.');
  else if(HK<1 || HK>3000) msgs.push(`Knoop: HK=${HK.toFixed(0)} está fuera del rango típico de materiales reales (~1 a 3000 HK) -- revisá P y l.`);
  if(msgs.length){
    warnEl.style.display='block';
    warnEl.innerHTML = msgs.join('<br>');
  } else {
    warnEl.style.display='none';
  }
}

/* ---------------- 5. CONVERSION ---------------- */
function dzUpdateConvRange(){
  const sl = document.getElementById('dz_convSlider');
  if(document.getElementById('dz_convScale').value==='hrc'){ sl.min=20; sl.max=65; sl.value=30; }
  else { sl.min=225; sl.max=740; sl.value=286; }
  dzDrawConv();
}
function dzDrawConv(){
  const isHRC = document.getElementById('dz_convScale').value==='hrc';
  const val = parseFloat(document.getElementById('dz_convSlider').value);
  document.getElementById('dz_convVal').textContent = val + (isHRC?' HRC':' HB');
  let hrc, hb, ts;
  if(isHRC){ hrc=val; hb=dzInterp('hrc',val,'hb'); ts=dzInterp('hrc',val,'ts_mpa'); }
  else { hb=val; hrc=dzInterp('hb',val,'hrc'); ts=dzInterp('hb',val,'ts_mpa'); }

  const svg = document.getElementById('dz_convSvg');
  const scales = [
    {label:'HRC', min:20, max:65, val:hrc, x:150, color:'var(--accent)'},
    {label:'HB (Brinell)', min:225, max:740, val:hb, x:350, color:'var(--neck)'},
    {label:'TS (MPa) — solo aceros', min:770, max:2600, val:ts, x:550, color:'var(--plastic)'}
  ];
  let html='';
  scales.forEach(s=>{
    const top=30, bottom=190;
    const norm = (s.val-s.min)/(s.max-s.min);
    const y = bottom - norm*(bottom-top);
    html += `<line x1="${s.x}" y1="${top}" x2="${s.x}" y2="${bottom}" stroke="var(--border)" stroke-width="6"/>`;
    html += `<circle cx="${s.x}" cy="${y}" r="7" fill="${s.color}"/>`;
    html += `<text x="${s.x}" y="${bottom+20}" text-anchor="middle" fill="var(--muted)" font-size="12">${s.label}</text>`;
    html += `<text x="${s.x}" y="${y-14}" text-anchor="middle" fill="${s.color}" font-size="13" font-weight="600">${Math.round(s.val)}</text>`;
  });
  html += `<line x1="150" y1="${190 - ((hrc-20)/(65-20))*160}" x2="350" y2="${190 - ((hb-225)/(740-225))*160}" stroke="var(--muted)" stroke-dasharray="3 3"/>`;
  html += `<line x1="350" y1="${190 - ((hb-225)/(740-225))*160}" x2="550" y2="${190 - ((ts-770)/(2600-770))*160}" stroke="var(--muted)" stroke-dasharray="3 3"/>`;
  svg.innerHTML = html;
}

/* ---------------- 6. CORRELACION TS ---------------- */
function dzInitTsChart(){
  const ctx = document.getElementById('dz_tsChart').getContext('2d');
  dzTsChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'Aceros (línea empírica)',data:[{x:0,y:0},{x:500,y:500*3.45}],borderColor:'#1a8c5e',borderWidth:2,pointRadius:0,fill:false},
      {label:'HB actual',data:[],borderColor:'#c8780a',backgroundColor:'#c8780a',pointRadius:6,showLine:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:250},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.parsed.y.toFixed(0)} MPa a HB=${c.parsed.x.toFixed(0)}`}}},
      scales:{
        x:{type:'linear',min:0,max:500,title:{display:true,text:'Dureza Brinell (HB)',color:tc,font:{size:11}},grid:{color:gc},ticks:{color:tc}},
        y:{min:0,max:1800,title:{display:true,text:'TS (MPa)',color:tc,font:{size:11}},grid:{color:gc},ticks:{color:tc}}
      }}
  });
}
function dzUpdateTS(){
  const hb = parseFloat(document.getElementById('dz_tsSlider').value);
  document.getElementById('dz_tsVal').textContent = hb;
  const psi = 500*hb;
  const mpa = 3.45*hb;
  document.getElementById('dz_tsPsi').textContent = Math.round(psi).toLocaleString('es-AR');
  document.getElementById('dz_tsMpa').textContent = mpa.toFixed(1);
  if(dzTsChartInst){
    dzTsChartInst.data.datasets[1].data = [{x:hb,y:mpa}];
    dzTsChartInst.update();
  }
}

/* ---------------- 7. JANKA ---------------- */
// A diferencia de Brinell/Rockwell/Vickers, la dureza Janka NO sale de una
// fórmula: se DEFINE como la fuerza que hunde una bola de acero de 11,28 mm
// de diámetro hasta la mitad de su diámetro (5,64 mm) en la madera. Los
// valores de referencia son de tablas bibliográficas (aprox., en lbf,
// convertidos acá a kgf). El modelo de profundidad-vs-fuerza usado para la
// simulación es una curva ilustrativa (depth ∝ F^(2/3), similar a un contacto
// de Hertz) calibrada para que cada madera llegue exactamente a 5,64 mm en su
// propia fuerza de referencia -- no es una medición real, solo permite
// explorar "qué pasaría si aplico más o menos fuerza".
