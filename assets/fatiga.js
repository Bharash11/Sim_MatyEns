// fatiga.js — Módulo 3, grupo "Fatiga": tensiones cíclicas, curva S-N, iniciación/propagación,
// ley de Paris (velocidad de propagación) y factores de Marin (corrección del límite de fatiga).
// tc/gc (colores de gráfico) y Chart vienen definidos/cargados globalmente antes que este archivo.

let ftCicloChartInst = null;
let ftSnChartInst = null;
let ftParisChartInst = null;
let ftFactoresChartInst = null;

function ftInit(){
  ftInitCicloChart();
  ftUpdateCiclicas();
  ftDrawFatigaSvg();
  ftInitSNChart();
  ftUpdateSN();
  ftInitParisChart();
  ftUpdateVelocidad();
  ftInitFactoresChart();
  ftUpdateFactores();
}

/* ================================================================ FT1. TENSIONES CÍCLICAS */
function ftPresetCiclo(tipo){
  const presets = { reversa:[250,-250], repetida:[300,0], fluctuante:[300,80] };
  const [smax,smin] = presets[tipo];
  document.getElementById('ft_smax').value = smax;
  document.getElementById('ft_smin').value = smin;
  ftUpdateCiclicas();
}

function ftInitCicloChart(){
  const ctx = document.getElementById('ft_cicloChart').getContext('2d');
  ftCicloChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'σ(t)', data:[], borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:.4, fill:false},
      {label:'σ_m (media)', data:[], borderColor:'#72706a', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}},
      scales:{
        x:{type:'linear', title:{display:true,text:'Ciclos',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{title:{display:true,text:'Tensión (MPa)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

function ftUpdateCiclicas(){
  const smax = parseFloat(document.getElementById('ft_smax').value)||0;
  const smin = parseFloat(document.getElementById('ft_smin').value)||0;
  const sm = (smax+smin)/2;
  const sa = (smax-smin)/2;
  const sr = smax-smin;
  const R = smax!==0 ? smin/smax : NaN;

  document.getElementById('ft_mSa').textContent = sa.toFixed(0);
  document.getElementById('ft_mSm').textContent = sm.toFixed(0);
  document.getElementById('ft_mSr').textContent = sr.toFixed(0);
  document.getElementById('ft_mR').textContent = isFinite(R) ? R.toFixed(2) : '—';

  const pts=[], N=80;
  for(let i=0;i<=N;i++){
    const t = 3*i/N;
    pts.push({x:t, y: sm + sa*Math.sin(2*Math.PI*t)});
  }
  if(ftCicloChartInst){
    ftCicloChartInst.data.datasets[0].data = pts;
    ftCicloChartInst.data.datasets[1].data = [{x:0,y:sm},{x:3,y:sm}];
    ftCicloChartInst.update();
  }
}

/* ================================================================ FT3. INICIACIÓN Y PROPAGACIÓN (SVG) */
function ftDrawFatigaSvg(){
  const svg = document.getElementById('rt_fatigaSvg');
  if(!svg) return;
  const cx=280, cy=75, r=60;
  let html='';
  // sección transversal (círculo)
  html+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`;
  // origen en el borde izquierdo
  const ox = cx-r, oy=cy;
  html+=`<circle cx="${ox}" cy="${oy}" r="4" fill="var(--frac)"/>`;
  html+=`<text x="${ox-6}" y="${oy-10}" text-anchor="middle" fill="var(--frac)" font-size="10">Origen</text>`;
  // marcas de playa (arcos concéntricos alrededor del origen)
  [15,28,41,54].forEach(rr=>{
    html+=`<path d="M ${ox+rr*0.15},${oy-rr*0.98} A ${rr},${rr} 0 0 1 ${ox+rr*0.15},${oy+rr*0.98}" fill="none" stroke="var(--elastic)" stroke-width="1" opacity=".55"/>`;
  });
  // zona de fractura final (rugosa) — sector opuesto al origen
  html+=`<path d="M ${cx+r*0.15},${cy-r*0.75} L ${cx+r*0.95},${cy-r*0.35} L ${cx+r*0.75},${cy} L ${cx+r*0.95},${cy+r*0.35} L ${cx+r*0.15},${cy+r*0.75} A ${r},${r} 0 0 1 ${cx+r*0.15},${cy-r*0.75} Z" fill="var(--neck)" opacity=".22" stroke="var(--neck)" stroke-width="1"/>`;
  html+=`<text x="${cx+r*0.5}" y="${cy+r+18}" text-anchor="middle" fill="var(--muted)" font-size="10">Fractura final (rápida, rugosa)</text>`;
  html+=`<text x="${ox+8}" y="${cy+r+18}" text-anchor="middle" fill="var(--muted)" font-size="10">Marcas de playa (propagación lenta)</text>`;
  svg.innerHTML = html;
}

/* ================================================================ FT2. CURVA S-N */
const FT_SN_PRESETS = {
  acero1045:  {label:"Acero 1045",        sfp:1000, b:-0.09,  Se:310, hasLimit:true},
  acero4340:  {label:"Acero 4340 T y R",   sfp:1200, b:-0.095, Se:480, hasLimit:true},
  al2014:     {label:"Aluminio 2014-T6",   sfp:440,  b:-0.100, Se:null, hasLimit:false}
};

function ftBasquinN(sa, sfp, b){
  return 0.5*Math.pow(sa/sfp, 1/b);
}

function ftInitSNChart(){
  const ctx = document.getElementById('ft_snChart').getContext('2d');
  ftSnChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'Curva S-N', data:[], borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:0, fill:false},
      {label:'σ_a elegida', data:[], borderColor:'#c8780a', backgroundColor:'#c8780a', pointRadius:6, showLine:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:c=>` N≈${c.parsed.x.toExponential(2)} ciclos → σ_a=${c.parsed.y.toFixed(0)} MPa`}}},
      scales:{
        x:{type:'logarithmic', title:{display:true,text:'Número de ciclos a rotura, N',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{type:'logarithmic', title:{display:true,text:'Amplitud de tensión σ_a (MPa)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

function ftUpdateSN(){
  const key = document.getElementById('ft_snMat').value;
  const p = FT_SN_PRESETS[key];
  const sa = parseFloat(document.getElementById('ft_sa').value)||1;
  document.getElementById('ft_saVal').textContent = sa+' MPa';

  const curve=[];
  for(let e=3; e<=9; e+=0.15){
    const N = Math.pow(10,e);
    let s = p.sfp*Math.pow(2*N, p.b);
    if(p.hasLimit) s = Math.max(s, p.Se);
    curve.push({x:N, y:s});
  }

  let Nf;
  const infinita = p.hasLimit && sa<=p.Se;
  if(infinita){ Nf = 1e9; }
  else { Nf = ftBasquinN(sa, p.sfp, p.b); }

  document.getElementById('ft_mNf').textContent = infinita ? '> 10⁷ (infinita)' : Nf.toExponential(2);
  const infEl = document.getElementById('ft_mInfinita');
  if(p.hasLimit){
    infEl.textContent = infinita ? `✓ Sí (σ_a ≤ S_e=${p.Se} MPa)` : `✗ No (σ_a > S_e=${p.Se} MPa)`;
    infEl.style.color = infinita ? 'var(--plastic)' : 'var(--frac)';
  } else {
    infEl.textContent = '✗ No — este material no tiene límite de fatiga verdadero';
    infEl.style.color = 'var(--frac)';
  }

  if(ftSnChartInst){
    ftSnChartInst.data.datasets[0].data = curve;
    ftSnChartInst.data.datasets[0].label = p.label;
    ftSnChartInst.data.datasets[1].data = [{x: Math.min(Nf,1e9), y:sa}];
    ftSnChartInst.update();
  }
}

/* ================================================================ FT4. LEY DE PARIS */
// FIX (integración Unidad 3): antes esto era un diccionario propio
// (FT_PARIS_PRESETS) con las mismas claves "acero"/"aluminio"/"titanio" que
// PRESETS en data-presets.js, pero sin ninguna relación entre ambos -- dos
// fuentes de verdad para el mismo material. Ahora lee directo de
// PRESETS[key].frac, que es la misma tabla que usan tracción/compresión.
function ftApplyParisPreset(){
  const key = document.getElementById('ft_parisMat').value;
  const p = PRESETS[key]?.frac;
  if(p){
    document.getElementById('ft_parisC').value = p.parisC;
    document.getElementById('ft_parisM').value = p.parisM;
  }
  ftUpdateVelocidad();
}

function ftInitParisChart(){
  const ctx = document.getElementById('ft_parisChart').getContext('2d');
  ftParisChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'da/dN (Región II — Paris)', data:[], borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:0, fill:false},
      {label:'ΔK actual', data:[], borderColor:'#c8780a', backgroundColor:'#c8780a', pointRadius:6, showLine:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:c=>` ΔK=${c.parsed.x.toFixed(1)} → da/dN=${c.parsed.y.toExponential(2)} mm/ciclo`}}},
      scales:{
        x:{type:'logarithmic', title:{display:true,text:'ΔK (MPa·√m)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{type:'logarithmic', title:{display:true,text:'da/dN (mm/ciclo)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

function ftDadN(dk, C, m){
  return 1000*C*Math.pow(dk, m); // conversión de m/ciclo a mm/ciclo
}

function ftUpdateVelocidad(){
  const C = parseFloat(document.getElementById('ft_parisC').value)||1e-12;
  const m = parseFloat(document.getElementById('ft_parisM').value)||3;
  const dk = parseFloat(document.getElementById('ft_dk').value)||1;
  document.getElementById('ft_dkVal').textContent = dk+' MPa·√m';

  const dadn = ftDadN(dk, C, m);
  document.getElementById('ft_mDadn').textContent = dadn.toExponential(2);

  const curve=[];
  for(let x=2; x<=60; x*=1.08){ curve.push({x, y: ftDadN(x,C,m)}); }
  if(ftParisChartInst){
    ftParisChartInst.data.datasets[0].data = curve;
    ftParisChartInst.data.datasets[1].data = [{x:dk, y:dadn}];
    ftParisChartInst.update();
  }
}

/* ================================================================ FT5. FACTORES DE MARIN */
function ftInitFactoresChart(){
  const ctx = document.getElementById('ft_factoresChart').getContext('2d');
  ftFactoresChartInst = new Chart(ctx,{
    type:'bar',
    data:{labels:['k_a','k_b','k_c','k_d','k_e','S_e / S_e´'],
      datasets:[{label:'Valor', data:[], backgroundColor:['#1a5fa8','#1a5fa8','#1a5fa8','#1a5fa8','#1a5fa8','#c8780a']}]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{display:false}, ticks:{color:tc}},
        y:{min:0, max:1, title:{display:true,text:'Factor (adimensional)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

function ftUpdateFactores(){
  const seBase = parseFloat(document.getElementById('ft_seBase').value)||1;
  const ka = parseFloat(document.getElementById('ft_ka').value)||1;
  const kb = parseFloat(document.getElementById('ft_kb').value)||1;
  const kc = parseFloat(document.getElementById('ft_kc').value)||1;
  const kd = parseFloat(document.getElementById('ft_kd').value)||1;
  const ke = parseFloat(document.getElementById('ft_ke').value)||1;
  document.getElementById('ft_kbVal').textContent = kb.toFixed(2);
  document.getElementById('ft_kdVal').textContent = kd.toFixed(2)+(kd>=0.99?' (T ambiente)':' (alta T)');

  const factorTotal = ka*kb*kc*kd*ke;
  const se = seBase*factorTotal;
  document.getElementById('ft_mSe').textContent = se.toFixed(0);
  document.getElementById('ft_mReduccion').textContent = ((1-factorTotal)*100).toFixed(0);

  if(ftFactoresChartInst){
    ftFactoresChartInst.data.datasets[0].data = [ka,kb,kc,kd,ke, factorTotal];
    ftFactoresChartInst.update();
  }
}
